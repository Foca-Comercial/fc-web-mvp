// ==================================================
// Vista Cierre: buscar, ordenar, paginar y resumir (lógica pura)
// ==================================================
// GET /shifts_closures/summary trae todo el día (cards y una fila por vendedor), sin paginar.
// Los Pedidos PENDING y CANCELLED no se facturan: solo cuentan en las cards.

import { ClosureCards, ClosureProduct, ClosureSellerRow } from '@core/Models/CoreModule/closure.model';
import { toNumber } from './money.utils';
import { BoardSort } from './order-board.utils';
import { normalizeText } from './text.utils';

// ----- Vendedores -----
// Siigo recibe el código como número ("01" → 1); en pantalla se muestra con 2 dígitos como en el sistema
export function formatSellerCode(code: number): string {
	return String(code).padStart(2, '0');
}

export function filterSellers(rows: readonly ClosureSellerRow[], search: string): ClosureSellerRow[] {
	const needle = normalizeText(search);
	if (!needle) return [...rows];
	return rows.filter(
		(row) =>
			formatSellerCode(row.seller_code).includes(needle) ||
			String(row.seller_code).includes(needle) ||
			normalizeText(row.seller_name).includes(needle)
	);
}

// ----- Orden -----
export type ClosureSortKey = 'seller' | 'quantity' | 'sales';
export type ClosureSort = BoardSort<ClosureSortKey>;

// Sin `sort` se respeta el orden de la API. Empates por id del vendedor para que sea estable.
export function sortSellers(rows: readonly ClosureSellerRow[], sort: ClosureSort | null): ClosureSellerRow[] {
	if (!sort) return [...rows];
	const sign = sort.direction === 'asc' ? 1 : -1;
	const value = (row: ClosureSellerRow): number =>
		sort.key === 'seller' ? row.seller_code : sort.key === 'quantity' ? row.total_quantity : toNumber(row.total_sales);
	return [...rows].sort((a, b) => (value(a) - value(b)) * sign || a.id_user_vehicle - b.id_user_vehicle);
}

// ----- Estado de la exportación -----
export type ExportState = 'empty' | 'pending' | 'exported' | 'outdated';

// empty: sin pedidos facturables · pending: aún no se exporta · exported: al día · outdated: hubo cambios después
export function exportState(sellers: readonly ClosureSellerRow[], exported: boolean): ExportState {
	if (sellers.length === 0) return 'empty';
	if (exported) return 'exported';
	return sellers.some((row) => row.exported_at !== null) ? 'outdated' : 'pending';
}

// Última exportación del día (ISO más reciente), o null si nunca se exportó
export function lastExportedAt(sellers: readonly ClosureSellerRow[]): string | null {
	let last: string | null = null;
	for (const row of sellers) {
		if (row.exported_at && (!last || new Date(row.exported_at) > new Date(last))) last = row.exported_at;
	}
	return last;
}

// ----- Cards -----
// Completados = lo que se factura: despachados + entregados
export function completedOrders(cards: ClosureCards): number {
	return cards.dispatched + cards.delivered;
}

// ----- Textos -----
// "042, 023, 089" (códigos de producto) para la columna de pedidos
export function productCodes(products: readonly ClosureProduct[]): string {
	return products.map((product) => product.product_code).join(', ');
}

// Detalle para el tooltip: "042 · Bolsa 6L × 3"
export function productDetail(products: readonly ClosureProduct[]): string {
	return products.map((product) => `${product.product_code} · ${product.product_name} × ${product.quantity}`).join('\n');
}

// ¿La fecha ("AAAA-MM-DD") es posterior a hoy? La API no deja cerrar días futuros
export function isFutureDate(date: string, today: string): boolean {
	return date > today;
}
