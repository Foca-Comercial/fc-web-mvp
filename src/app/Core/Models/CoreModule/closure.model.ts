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
