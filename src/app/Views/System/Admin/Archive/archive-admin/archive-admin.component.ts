// ==================================================
// Vista: Administración · Archivo mensual
// ==================================================
// La base de datos conserva los últimos meses (retención). Cada mes se copia a una
// pestaña de Google Sheets (un spreadsheet por año) y, cuando sale de la retención, se
// purga: se vuelve a copiar, se verifica y se borran sus pedidos (y los clientes
// temporales que quedan sin pedidos). La API decide qué se puede hacer (GET /archive/months)
// y lo vuelve a validar al ejecutar.
//
// - Spreadsheets por año: registrar o cambiar (ID o URL).
// - Meses: copiar / volver a copiar a Sheets, y purgar (pide escribir el mes: es
//   irreversible en la base de datos).

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';

import { DataTableComponent } from '@components/Shared/data-table/data-table.component';
import { EmptyStateComponent } from '@components/Shared/empty-state/empty-state.component';
import { IconButtonComponent } from '@components/Shared/icon-button/icon-button.component';
import { IconComponent } from '@components/Shared/icon/icon.component';
import { SkeletonComponent } from '@components/Shared/skeleton/skeleton.component';
import { TableSkeletonComponent } from '@components/Shared/skeleton/table-skeleton.component';
import { StatusBadgeComponent } from '@components/Shared/status-badge/status-badge.component';
import { ArchiveMonthRow, ArchiveOverview, ArchiveSpreadsheet } from '@core/Models/CoreModule/closure.model';
import { BogotaDatePipe } from '@core/Pipes/bogota-date.pipe';
import { CopCurrencyPipe } from '@core/Pipes/cop-currency.pipe';
import { AlertService } from '@core/Service/Alerts/alert.service';
import { ApiAlertService } from '@core/Service/Alerts/api-alert.service';
import { ArchiveService } from '@core/Service/CoreModule/archive.service';
import {
	ArchiveRowState,
	MAX_SPREADSHEET_YEAR,
	MIN_SPREADSHEET_YEAR,
	archiveRowState,
	capitalize,
	isValidYear,
	monthName,
	purgeBlockReason,
	purgeSummaryLines,
	spreadsheetIdFrom,
} from '@core/Utils/admin-archive.utils';
import { todayBogota } from '@core/Utils/date.utils';
import { escapeHtml } from '@core/Utils/html.utils';

@Component({
	selector: 'app-archive-admin',
	imports: [
		BogotaDatePipe,
		CopCurrencyPipe,
		DataTableComponent,
		EmptyStateComponent,
		IconButtonComponent,
		IconComponent,
		SkeletonComponent,
		StatusBadgeComponent,
		TableSkeletonComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './archive-admin.component.html',
})
export class ArchiveAdminComponent {
	private readonly archive = inject(ArchiveService);
	private readonly apiAlert = inject(ApiAlertService);
	private readonly alert = inject(AlertService);

	// ----- Datos -----
	protected readonly overview = signal<ArchiveOverview | null>(null);
	protected readonly spreadsheets = signal<ArchiveSpreadsheet[]>([]);
	protected readonly loading = signal(true);
	protected readonly refreshing = signal(false);
	protected readonly failed = signal(false);

	protected readonly months = computed(() => this.overview()?.months ?? []);
	protected readonly retentionText = computed(() => {
		const data = this.overview();
		if (!data) return '';
		const months = data.retention_months;
		return `La base de datos conserva ${months === 1 ? 'el mes vigente' : `los últimos ${months} meses`} (desde ${monthName(data.first_retained_month)}). Los meses anteriores se pueden purgar después de copiarlos a Google Sheets.`;
	});

	// ----- Formulario del spreadsheet -----
	protected readonly minYear = MIN_SPREADSHEET_YEAR;
	protected readonly maxYear = MAX_SPREADSHEET_YEAR;
	protected readonly sheetYear = signal(Number(todayBogota().slice(0, 4)));
	protected readonly sheetValue = signal('');
	protected readonly sheetSubmitted = signal(false);
	protected readonly sheetSaving = signal(false);
	protected readonly sheetError = computed(() => {
		if (!isValidYear(this.sheetYear())) return `El año debe estar entre ${MIN_SPREADSHEET_YEAR} y ${MAX_SPREADSHEET_YEAR}.`;
		if (!spreadsheetIdFrom(this.sheetValue())) return 'Pega el ID o la URL del spreadsheet de Google Sheets.';
		return null;
	});
	// Año que ya tiene spreadsheet: el formulario lo cambia
	protected readonly sheetReplaces = computed(() => this.spreadsheets().some((s) => s.year === this.sheetYear()));

	// ----- Acciones en curso (una a la vez) -----
	protected readonly busyMonth = signal<string | null>(null);

	protected readonly monthLabel = (period: string): string => capitalize(monthName(period));
	protected readonly rowState = archiveRowState;
	protected readonly dateTimeOptions: Intl.DateTimeFormatOptions = {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	};

	constructor() {
		void this.load('initial');
	}

	protected purgeReason(row: ArchiveMonthRow): string | null {
		return purgeBlockReason(row, this.overview()?.first_retained_month ?? row.month);
	}

	protected isCurrent(row: ArchiveMonthRow): boolean {
		return row.month === this.overview()?.current_month;
	}

	protected stateTone(state: ArchiveRowState): 'done' | 'soon' | 'pending' | 'neutral' {
		return state === 'exported' ? 'done' : state === 'outdated' ? 'soon' : state === 'pending' ? 'pending' : 'neutral';
	}

	// ----- Carga -----
	protected refresh(): void {
		void this.load('manual');
	}

	private async load(mode: 'initial' | 'manual'): Promise<void> {
		if (mode === 'initial') this.loading.set(true);
		else this.refreshing.set(true);
		try {
			const { overview, spreadsheets } = await firstValueFrom(
				forkJoin({ overview: this.archive.getOverview(), spreadsheets: this.archive.getSpreadsheets() })
			);
			this.overview.set(overview);
			this.spreadsheets.set(spreadsheets);
			this.failed.set(false);
		} catch (error) {
			if (this.overview() === null) this.failed.set(true);
			await this.apiAlert.handleError(error, 'No se pudo cargar el archivo mensual');
		} finally {
			this.loading.set(false);
			this.refreshing.set(false);
		}
	}

	// ----- Spreadsheet por año -----
	protected setSheetYear(value: string): void {
		this.sheetYear.set(Number(value));
	}

	protected editSheet(sheet: ArchiveSpreadsheet): void {
		this.sheetYear.set(sheet.year);
		this.sheetValue.set(sheet.url);
		this.sheetSubmitted.set(false);
	}

	protected async saveSheet(): Promise<void> {
		this.sheetSubmitted.set(true);
		if (this.sheetSaving() || this.sheetError() !== null) return;
		const year = this.sheetYear();
		this.sheetSaving.set(true);
		try {
			const result = await this.apiAlert.run(this.archive.setSpreadsheet(year, this.sheetValue().trim()), {
				loadingTitle: 'Guardando el spreadsheet...',
				successToast: `Spreadsheet de ${year} guardado`,
				errorTitle: 'No se pudo guardar el spreadsheet',
			});
			if (!result.ok) return;
			this.sheetValue.set('');
			this.sheetSubmitted.set(false);
			await this.load('manual');
		} finally {
			this.sheetSaving.set(false);
		}
	}

	// ----- Copiar a Google Sheets -----
	protected async exportMonth(row: ArchiveMonthRow): Promise<void> {
		if (!row.can_export || this.busyMonth()) return;
		const label = escapeHtml(monthName(row.month));
		const again = row.status !== null;
		this.busyMonth.set(row.month);
		try {
			const result = await this.apiAlert.confirmAndRun(
				{
					title: again ? `¿Volver a copiar ${monthName(row.month)}?` : `¿Copiar ${monthName(row.month)} a Google Sheets?`,
					html:
						`Se escribe la pestaña <strong>${escapeHtml(row.month)}</strong> con una fila por producto de los <strong>${row.orders_count}</strong> pedidos de ${label}` +
						`${again ? ' (reemplaza la copia anterior)' : ''}. Los pedidos <strong>no</strong> se borran.`,
					icon: 'question',
					confirmText: again ? 'Sí, volver a copiar' : 'Sí, copiar',
				},
				() => this.archive.exportMonth(row.month),
				{ loadingTitle: 'Copiando a Google Sheets...', successToast: 'Mes copiado a Google Sheets', errorTitle: 'No se pudo copiar el mes' }
			);
			if (result.ok) await this.load('manual');
		} finally {
			this.busyMonth.set(null);
		}
	}

	// ----- Purgar -----
	protected async purgeMonth(row: ArchiveMonthRow): Promise<void> {
		if (!row.can_purge || this.busyMonth()) return;
		const name = monthName(row.month);
		this.busyMonth.set(row.month);
		try {
			// Irreversible en la BD: se confirma escribiendo el mes
			const typed = await this.alert.prompt(`¿Purgar ${name}?`, {
				text:
					`Se vuelve a copiar a Google Sheets, se verifica y se BORRAN de la base de datos sus ${row.orders_count} pedidos ` +
					'y los clientes temporales que queden sin pedidos. No se puede deshacer (la copia queda en Sheets). ' +
					`Escribe ${row.month} para confirmar.`,
				placeholder: row.month,
				validator: (value) => (value.trim() === row.month ? null : `Escribe exactamente ${row.month}.`),
			});
			if (typed === null) return;

			const result = await this.apiAlert.run(this.archive.purgeMonth(row.month), {
				loadingTitle: 'Copiando y purgando...',
				loadingText: 'No cierres esta ventana.',
				errorTitle: 'No se pudo purgar el mes',
			});
			if (!result.ok) return;
			await this.alert.custom({
				icon: 'success',
				title: `${capitalize(name)} purgado`,
				html: purgeSummaryLines(result.data)
					.map((line) => `<p style="margin:0.25rem 0">${escapeHtml(line)}</p>`)
					.join(''),
			});
			await this.load('manual');
		} finally {
			this.busyMonth.set(null);
		}
	}
}
