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

export interface ClosureSellerRow {
	id_user_vehicle: number;
	seller_code: number; // sin ceros a la izquierda (Siigo)
	seller_name: string;
	products: ClosureProduct[];
	total_quantity: number;
	orders_count: number;
	unassigned_orders: number; // pedidos sin conductor sumados al vendedor por defecto
	total_sales: Money;
	exported_at: IsoDateTime | null;
	export_outdated: boolean; // cambió después de exportar
}

export interface ClosureCards {
	total_orders: number;
	pending: number;
	dispatched: number;
	delivered: number;
	cancelled: number;
	sellers_count: number;
	total_income: Money; // despachados + entregados
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
