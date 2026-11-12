// ==================================================
// Modelos: cierre del día y archivado mensual
// ==================================================
// Espejo de shift_closure_schema y archive_schema (app/schemas/coreModule).

import { ArchiveStatus, IsoDate, IsoDateTime, Money } from '../Shared/api-types.model';

// ----- ShiftClosure (registro de lo exportado a Siigo) -----
export interface ShiftClosure {
	id_shift_closure: number;
	closure_date: IsoDate;
	id_user_vehicle: number;
	total_orders: number;
	total_sales: Money;
	exported_siigo: boolean;
	exported_at: IsoDateTime | null;
}

// ----- Vista Cierre: GET /shifts_closures/summary -----
export interface ClosureProduct {
	product_code: string;
	product_name: string;
	quantity: number;
}

// Ventas por tipo de factura y método de pago (las columnas del cuadre de caja)
export interface ClosureCategoryTotals {
	pos_cash: Money; // POS en efectivo: la factura global
	electronic_cash: Money;
	pos_transfer: Money;
	electronic_transfer: Money;
	pos_credit: Money; // el crédito es informativo (sin cartera)
	electronic_credit: Money;
}

export interface ClosureSellerRow {
	id_user_vehicle: number;
	seller_code: number; // sin ceros a la izquierda (Siigo)
	seller_name: string;
	// Factura global: solo POS + efectivo (vacía si el vendedor solo tuvo otras facturas)
	products: ClosureProduct[];
	total_quantity: number; // unidades de la factura global
	consolidated_total: Money; // total de la factura global
	// Todas las ventas del vendedor
	orders_count: number; // pedidos facturables, todas las categorías
	other_orders_count: number; // pedidos que no van a la factura global (hoja «Otras facturas»)
	unassigned_orders: number; // pedidos sin conductor sumados al vendedor por defecto
	totals: ClosureCategoryTotals;
	total_sales: Money; // todas las categorías
	cash_to_collect: Money; // efectivo a recibir: POS efectivo + electrónica efectivo
	exported_at: IsoDateTime | null;
	export_outdated: boolean; // cambió después de exportar
}

export interface ClosureCards {
	total_orders: number;
	pending: number;
	dispatched: number;
	delivered: number;
	cancelled: number;
	cancelled_after_dispatch: number; // cancelados después de despacharse (devoluciones)
	sellers_count: number;
	totals: ClosureCategoryTotals;
	total_income: Money; // despachados + entregados, todas las categorías
	cash_to_collect: Money; // efectivo a recibir: POS efectivo + electrónica efectivo
}

export interface ShiftClosureSummary {
	closure_date: IsoDate;
	exported: boolean;
	cards: ClosureCards;
	sellers: ClosureSellerRow[];
}

// ----- Archivado mensual (/archive, solo ADMINISTRADOR) -----
export interface ArchiveSpreadsheetSet {
	spreadsheet: string; // ID o URL completa de Google Sheets
}

export interface ArchiveSpreadsheet {
	year: number;
	spreadsheet_id: string;
	url: string;
	updated_at: IsoDateTime;
}

export interface MonthlyArchive {
	month: string; // "AAAA-MM"
	status: ArchiveStatus;
	spreadsheet_id: string;
	sheet_title: string;
	orders_count: number;
	rows_count: number;
	total_sales: Money;
	exported_at: IsoDateTime;
	id_user_exported: number | null;
	purged_at: IsoDateTime | null;
	id_user_purged: number | null;
}

export interface PurgeResult {
	archive: MonthlyArchive;
	deleted_orders: number;
	deleted_order_lines: number;
	deleted_temporary_clients: number;
	deleted_order_counters: number;
	deleted_expired_sessions: number;
}

// ----- Vista Archivo mensual: GET /archive/months -----
export interface ArchiveMonthRow {
	month: string; // "AAAA-MM"
	orders_count: number; // pedidos del mes que siguen en la BD
	total_sales: Money; // sin cancelados
	status: ArchiveStatus | null; // null = nunca se ha copiado a Sheets
	exported_at: IsoDateTime | null;
	purged_at: IsoDateTime | null;
	exported_orders: number | null; // pedidos en la última copia (o los purgados)
	spreadsheet_url: string | null; // spreadsheet del año; null = no registrado
	retained: boolean; // dentro de la retención: se copia, pero no se purga
	unclosed_days: IsoDate[]; // días facturables sin cierre exportado: impiden purgar
	can_export: boolean;
	can_purge: boolean;
}

export interface ArchiveOverview {
	current_month: string; // "AAAA-MM"
	first_retained_month: string; // los meses anteriores se pueden purgar
	retention_months: number;
	months: ArchiveMonthRow[]; // del más reciente al más antiguo
}
