// ==================================================
// Panel de administración · Archivo mensual (lógica pura)
// ==================================================
// La API decide qué se puede copiar o purgar (can_export / can_purge, y las vuelve a
// validar al ejecutar); aquí se arman los textos: nombres de mes, estado del archivado,
// por qué no se puede purgar y el resumen de una purga.

import { ArchiveMonthRow, PurgeResult } from '@core/Models/CoreModule/closure.model';
import { ArchiveStatus } from '@core/Models/Shared/api-types.model';

// "2026-08" → "agosto de 2026"
export function monthName(period: string): string {
	const [year, month] = period.split('-').map(Number);
	if (!year || !month) return period;
	return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

// "agosto de 2026" → "Agosto de 2026"
export function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

// "2026-08-03" → "03/08"
export function shortDay(isoDate: string): string {
	const [, month, day] = isoDate.split('-');
	return `${day}/${month}`;
}

export function yearOf(period: string): number {
	return Number(period.slice(0, 4));
}

// ----- Estado -----
export type ArchiveRowState = 'purged' | 'exported' | 'outdated' | 'pending' | 'empty';

// purged: ya no está en la BD · exported: copiado y al día · outdated: copiado, pero los
// pedidos cambiaron después · pending: nunca copiado · empty: sin pedidos
export function archiveRowState(row: ArchiveMonthRow): ArchiveRowState {
	if (row.status === ArchiveStatus.PURGED) return 'purged';
	if (row.orders_count === 0) return 'empty';
	if (row.status === ArchiveStatus.EXPORTED) {
		return row.exported_orders === row.orders_count ? 'exported' : 'outdated';
	}
	return 'pending';
}

// Por qué no se puede purgar (null = se puede, o no aplica porque ya se purgó)
export function purgeBlockReason(row: ArchiveMonthRow, firstRetained: string): string | null {
	if (row.can_purge || row.status === ArchiveStatus.PURGED || row.orders_count === 0) return null;
	if (row.retained) return `Se conserva en la base de datos hasta que pase ${monthName(firstRetained)}.`;
	if (!row.spreadsheet_url) return `Registra el spreadsheet de ${yearOf(row.month)} para poder copiarlo antes de purgar.`;
	if (row.unclosed_days.length > 0) {
		const days = row.unclosed_days.slice(0, 8).map(shortDay).join(', ');
		const more = row.unclosed_days.length > 8 ? ` y ${row.unclosed_days.length - 8} más` : '';
		return `Hay días sin cierre exportado: ${days}${more}. Expórtalos en Cierres y Reportes.`;
	}
	return 'No se puede purgar todavía.';
}

// ----- Spreadsheet -----
// ID de Google (20–100 letras, números, - y _) o la URL completa del spreadsheet
const SPREADSHEET_URL = /\/spreadsheets\/d\/([A-Za-z0-9_-]+)/;
const SPREADSHEET_ID = /^[A-Za-z0-9_-]{20,100}$/;

export function spreadsheetIdFrom(value: string): string | null {
	const text = value.trim();
	const match = SPREADSHEET_URL.exec(text);
	const id = match ? match[1] : text;
	return SPREADSHEET_ID.test(id) ? id : null;
}

export const MIN_SPREADSHEET_YEAR = 2020;
export const MAX_SPREADSHEET_YEAR = 2100;

export function isValidYear(year: number): boolean {
	return Number.isInteger(year) && year >= MIN_SPREADSHEET_YEAR && year <= MAX_SPREADSHEET_YEAR;
}

// ----- Purga -----
// Resumen para la alerta de éxito
export function purgeSummaryLines(result: PurgeResult): string[] {
	const lines = [
		`${result.deleted_orders} ${result.deleted_orders === 1 ? 'pedido' : 'pedidos'} (${result.deleted_order_lines} renglones) borrados de la base de datos.`,
	];
	if (result.deleted_temporary_clients > 0) {
		lines.push(
			`${result.deleted_temporary_clients} ${result.deleted_temporary_clients === 1 ? 'cliente temporal' : 'clientes temporales'} sin pedidos borrados.`
		);
	}
	lines.push('La copia queda en Google Sheets.');
	return lines;
}
