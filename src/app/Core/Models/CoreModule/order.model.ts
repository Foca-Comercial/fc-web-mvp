// ==================================================
// Modelos: pedidos
// ==================================================
// Espejo de order_schema, order_detail_schema, order_history_schema y
// route_order_schema (app/schemas/coreModule).

import {
	CancelReason,
	InvoiceType,
	IsoDate,
	IsoDateTime,
	Money,
	MoneyInput,
	OrderState,
	Page,
	PaymentMethod,
	TimeString,
} from '../Shared/api-types.model';
import { NewClientInput } from './catalog.model';

// ----- Respuestas -----
export interface Order {
	id_order: number;
	purchase_order: string; // consecutivo del día de entrega: "001", "002"…
	estimated_delivery: TimeString | null;
	order_total: Money | null;
	id_client: number;
	id_user_vehicle: number | null;
	id_user_taker: number;
	id_route: number | null;
	creation_datetime: IsoDateTime; // cuándo se tomó el pedido (auditoría)
	delivery_date: IsoDate; // día de entrega: normalmente hoy; un pedido programado lo trae a futuro
	dispatch_time: TimeString | null;
	delivery_time: TimeString | null;
	state: OrderState;
	payment_method: PaymentMethod;
	invoice_type: InvoiceType;
	observations: string | null; // observación general del pedido
	has_receipt: boolean; // lleva CD: solo POS + efectivo
	items_updated_at: IsoDateTime | null; // última edición de los productos (null = nunca)
}

export interface OrderDetail {
	id_order_detail: number;
	id_order: number;
	id_product: number;
	cant: number;
	unit_price: Money;
	subtotal: Money;
}

export interface OrderWithDetails extends Order {
	order_details: OrderDetail[];
}

// ----- Registro de pedidos -----
export interface OrderItemInput {
	id_product: number;
	cant: number; // > 0
	unit_price: MoneyInput; // >= 0, precargado del catálogo y editable
}

interface OrderCreateBase {
	delivery_date?: IsoDate | null; // sin enviar = hoy; programado: hoy o posterior, hasta 60 días
	estimated_delivery?: TimeString | null;
	id_user_vehicle?: number | null;
	payment_method?: PaymentMethod; // sin enviar = efectivo
	invoice_type?: InvoiceType; // sin enviar = el del cliente; un cliente temporal solo admite POS
	observations?: string | null; // observación general, máx. 500
	items: OrderItemInput[]; // al menos uno, sin productos repetidos
}

// POST /orders/new-client
export interface OrderCreateNewClient extends OrderCreateBase {
	client: NewClientInput;
}

// POST /orders/existing-client (solo clientes registrados)
export interface OrderCreateExistingClient extends OrderCreateBase {
	id_client: number;
}

// PATCH /orders/{id}: parcial, solo se modifica lo que se envía.
// - id_user_vehicle: asigna o cambia el domiciliario (null desasigna); hasta que el pedido sea final.
// - estimated_delivery: hora estimada (null la quita); solo mientras el pedido está PENDING.
// - delivery_date: día de entrega (no admite null); solo en PENDING. Cambiarlo asigna un PO nuevo del día de destino.
// - payment_method / invoice_type: no admiten null; en PENDING y DISPATCHED. Un cliente temporal no pasa a ELECTRONIC
//   (422 ELECTRONIC_INVOICE_NOT_ALLOWED).
// - observations: observación general (null la borra); en PENDING y DISPATCHED.
export interface OrderUpdate {
	id_user_vehicle?: number | null;
	estimated_delivery?: TimeString | null;
	delivery_date?: IsoDate;
	payment_method?: PaymentMethod;
	invoice_type?: InvoiceType;
	observations?: string | null;
}

// PUT /orders/{id}/items-order: lista FINAL deseada
export interface OrderItemSync {
	id_order_detail: number | null; // null = producto nuevo
	id_product: number;
	cant: number;
	unit_price: MoneyInput;
}

export interface OrderItemsSyncRequest {
	items: OrderItemSync[];
}

// ----- Tablas del día (dashboard-summary / dispatched-summary) -----
export interface OrderSummary {
	id_order: number;
	purchase_order: string;
	creation_time: string; // "HH:MM" en Bogotá
	estimated_delivery: TimeString | null; // base de "Próximo" / "Retrasado" (ver delivery-status.utils)
	client_name: string;
	zone_name: string;
	product_codes: string;
	total_quantity: number;
	driver_code: string | null;
	driver_name: string | null;
	state: OrderState;
}

// ----- Modal de detalle (GET /orders/{id}/details) -----
export interface OrderDetailItem {
	id_order_detail: number;
	id_product: number;
	product_code: string;
	product_name: string;
	// false = se desactivó después de tomar el pedido: el renglón se conserva (cantidad y
	// precio editables, o quitarlo), pero no se puede volver a agregar
	product_active: boolean;
	cant: number;
	unit_price: Money;
	subtotal: Money;
}

export interface OrderFullDetail {
	id_order: number;
	purchase_order: string;
	creation_datetime: IsoDateTime; // hora de Bogotá
	creation_date: IsoDate; // día en que se tomó el pedido (puede ser distinto al de entrega)
	creation_time: string; // "HH:MM" en que se tomó
	delivery_date: IsoDate;
	estimated_delivery: TimeString | null;
	dispatch_time: TimeString | null;
	delivery_time: TimeString | null;
	state: OrderState;
	order_total: Money;
	// Facturación y observación
	payment_method: PaymentMethod;
	invoice_type: InvoiceType;
	has_receipt: boolean; // lleva CD: solo POS + efectivo
	observations: string | null;
	// Ruta de la que se generó (null = pedido individual)
	id_route: number | null;
	route_name: string | null;
	// Auditoría
	taker_name: string; // quién registró el pedido
	items_updater_name: string | null; // quién editó los productos por última vez (null = nadie)
	items_updated_at: IsoDateTime | null; // cuándo (hora de Bogotá)
	// Cancelación (solo con state = CANCELLED)
	cancel_reason: CancelReason | null;
	cancel_note: string | null;
	cancelled_at: IsoDateTime | null;
	canceller_name: string | null;
	id_client: number; // para pedir el catálogo con los precios de este cliente
	client_name: string;
	client_phone: string | null;
	client_address: string | null;
	neighborhood_name: string;
	zone_name: string;
	id_user_vehicle: number | null; // preselecciona el domiciliario al cambiarlo
	driver_code: string | null;
	driver_name: string | null;
	items: OrderDetailItem[];
}

// ----- Histórico (GET /orders/history) -----
export interface OrderHistoryQuery {
	date_from?: IsoDate;
	date_to?: IsoDate;
	state?: OrderState | null;
	id_route?: number | null;
	id_user_vehicle?: number | null;
	search?: string | null; // nombre del cliente o N.° de pedido exacto
	payment_method?: PaymentMethod | null;
	invoice_type?: InvoiceType | null;
	page?: number;
	page_size?: number; // 1–200
	// Orden en el servidor (por defecto: date ascendente). Campos válidos: date, purchase_order,
	// client_name, zone_name, route_name, total_quantity, total, driver_name, state,
	// payment_method e invoice_type; otro → 422 INVALID_SORT_FIELD
	sort_by?: string | null;
	sort_dir?: 'asc' | 'desc' | null;
}

export interface OrderHistoryRow {
	id_order: number;
	purchase_order: string;
	order_date: IsoDate;
	creation_time: string;
	client_name: string;
	zone_name: string;
	route_name: string | null;
	product_codes: string;
	total_quantity: number;
	order_total: Money | null;
	driver_code: string | null;
	driver_name: string | null;
	state: OrderState;
	payment_method: PaymentMethod;
	invoice_type: InvoiceType;
}

// Página del histórico: Page<T> más el rango aplicado y el total vendido del filtro
export interface OrderHistoryPage extends Page<OrderHistoryRow> {
	date_from: IsoDate;
	date_to: IsoDate;
	total_sales: Money; // sin cancelados
}

// ----- Pedidos por ruta -----
export interface RouteOfDay {
	id_route: number;
	name: string;
	departure_time: TimeString;
	days_week: number[];
	clients_count: number;
	client_names: string[]; // nombres de esos clientes (activos y registrados), A-Z
	zones: string[]; // zonas distintas de esos clientes, A-Z
	orders_count: number; // pedidos de ese día ya generados desde la ruta
}

// GET /orders/routes/{id}/template: por cliente, SOLO sus productos con precio pactado
// (activos). Son los que lleva en la ruta; no se envía el catálogo completo.
export interface RouteTemplateProduct {
	id_product: number;
	code: string;
	name: string;
	unit_price: Money; // precio pactado con el cliente
	cant: number; // cantidad sugerida (1); el gestor la edita
}

export interface RouteTemplateClient {
	id_client: number;
	name: string;
	phone: string | null;
	address: string | null;
	neighborhood_name: string;
	zone_name: string;
	requires_electronic_invoice: boolean; // sus pedidos salen con factura electrónica por defecto
	products: RouteTemplateProduct[]; // vacío = sin precios pactados: no se le genera pedido
	existing_order_id: number | null; // ya tiene pedido de hoy desde la ruta
}

export interface RouteOrderTemplate {
	id_route: number;
	name: string;
	departure_time: TimeString;
	clients: RouteTemplateClient[];
}

// Renglón de un pedido por ruta: sin precio, el backend usa el pactado del cliente
// (solo productos con precio pactado; si no, NO_SPECIAL_PRICE)
export interface RouteOrderItemInput {
	id_product: number;
	cant: number; // > 0
}

export interface RouteOrderClientInput {
	id_client: number;
	payment_method?: PaymentMethod; // sin enviar = efectivo
	invoice_type?: InvoiceType; // sin enviar = el del cliente (requires_electronic_invoice)
	observations?: string | null;
	items: RouteOrderItemInput[];
}

// POST /orders/routes/{id}
export interface RouteOrdersCreate {
	estimated_delivery?: TimeString | null;
	id_user_vehicle?: number | null;
	orders: RouteOrderClientInput[]; // solo los clientes con productos
}

export interface RouteOrdersCreated {
	id_route: number;
	created: number;
	orders: Order[];
}
