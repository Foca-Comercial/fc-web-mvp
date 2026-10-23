// ==================================================
// Pedidos por ruta: del formulario al POST /orders/routes/{id}
// ==================================================
// La plantilla (GET /orders/routes/{id}/template) trae, por cliente de la ruta, SOLO sus
// productos con precio pactado (los que lleva en la ruta) con cantidad sugerida 1. En el
// formulario cada cliente arranca con todos ellos: el gestor ajusta cantidades, quita lo
// que no pidió o marca al cliente como "No pidió hoy". Aquí se convierte esa selección en
// los pedidos a crear y en el texto de la confirmación.
// El precio NO se envía: lo pone el backend (el pactado). Los totales son solo para mostrar.
// Otros productos o precios se agregan después, editando el pedido en el tablero.

import {
	RouteOrderItemInput,
	RouteOrdersCreate,
	RouteOrderTemplate,
	RouteTemplateClient,
	RouteTemplateProduct,
} from '@core/Models/CoreModule/order.model';
import { toApiTime } from './date.utils';
import { escapeHtml } from './html.utils';
import { formatCop, toNumber } from './money.utils';

// ----- Selección del formulario -----
// Productos elegidos por cliente, en orden. `cant` puede quedar en 0 mientras el usuario
// la está escribiendo.
export interface RouteLineInput {
	id_product: number;
	cant: number;
}

export type RouteSelections = Readonly<Record<number, readonly RouteLineInput[]>>;

// Clientes marcados como "No pidió hoy"
export type RouteExclusions = ReadonlySet<number>;

// Agrega el producto con cantidad 1 (si ya estaba, no lo repite: la API rechaza productos repetidos)
export function addProduct(selections: RouteSelections, idClient: number, idProduct: number): RouteSelections {
	const lines = selections[idClient] ?? [];
	if (lines.some((line) => line.id_product === idProduct)) return selections;
	return { ...selections, [idClient]: [...lines, { id_product: idProduct, cant: 1 }] };
}

export function setProductQuantity(selections: RouteSelections, idClient: number, idProduct: number, cant: number): RouteSelections {
	const lines = selections[idClient] ?? [];
	const safe = Number.isFinite(cant) && cant > 0 ? Math.floor(cant) : 0;
	return { ...selections, [idClient]: lines.map((line) => (line.id_product === idProduct ? { ...line, cant: safe } : line)) };
}

export function removeProduct(selections: RouteSelections, idClient: number, idProduct: number): RouteSelections {
	const lines = (selections[idClient] ?? []).filter((line) => line.id_product !== idProduct);
	return { ...selections, [idClient]: lines };
}

// ----- Clientes -----
// A quienes se les puede crear el pedido de hoy: sin pedido de hoy y con productos pactados
export function orderableClients(template: RouteOrderTemplate): RouteTemplateClient[] {
	return template.clients.filter((client) => client.existing_order_id === null && client.products.length > 0);
}

// Sin precios pactados: aparecen en la ruta, pero no se les puede generar pedido desde ella
export function clientsWithoutProducts(template: RouteOrderTemplate): RouteTemplateClient[] {
	return template.clients.filter((client) => client.existing_order_id === null && client.products.length === 0);
}

// Selección inicial: cada cliente que se puede pedir arranca con todos sus productos
// pactados y la cantidad que sugiere la API
export function selectionsFromTemplate(template: RouteOrderTemplate): RouteSelections {
	const selections: Record<number, RouteLineInput[]> = {};
	for (const client of orderableClients(template)) {
		selections[client.id_client] = client.products.map((product) => ({
			id_product: product.id_product,
			cant: product.cant > 0 ? product.cant : 1,
		}));
	}
	return selections;
}

// ¿Algún producto de un cliente incluido quedó sin cantidad?
export function hasMissingQuantity(selections: RouteSelections, excluded: RouteExclusions = new Set()): boolean {
	return Object.entries(selections).some(
		([idClient, lines]) => !excluded.has(Number(idClient)) && lines.some((line) => line.cant <= 0)
	);
}

// ----- Renglones y totales -----
export interface RouteOrderLine {
	product: RouteTemplateProduct;
	cant: number;
	subtotal: number; // estimado con el precio pactado
}

// Pedido que se va a crear para un cliente
export interface RouteOrderDraft {
	client: RouteTemplateClient;
	lines: RouteOrderLine[];
	total: number;
}

// Renglones elegidos de un cliente (incluye los que aún no tienen cantidad), en orden
export function clientLines(client: RouteTemplateClient, selections: RouteSelections): RouteOrderLine[] {
	const products = new Map(client.products.map((product) => [product.id_product, product]));
	const lines: RouteOrderLine[] = [];
	for (const input of selections[client.id_client] ?? []) {
		const product = products.get(input.id_product);
		if (!product) continue;
		lines.push({ product, cant: input.cant, subtotal: input.cant * toNumber(product.unit_price) });
	}
	return lines;
}

// Productos pactados del cliente que no están en su lista (para volver a agregarlos)
export function removedProducts(client: RouteTemplateClient, selections: RouteSelections): RouteTemplateProduct[] {
	const chosen = new Set((selections[client.id_client] ?? []).map((line) => line.id_product));
	return client.products.filter((product) => !chosen.has(product.id_product));
}

// Un borrador por cliente incluido que tiene al menos un producto con cantidad
export function buildRouteOrderDrafts(
	template: RouteOrderTemplate,
	selections: RouteSelections,
	excluded: RouteExclusions = new Set()
): RouteOrderDraft[] {
	return orderableClients(template)
		.filter((client) => !excluded.has(client.id_client))
		.map((client) => {
			const lines = clientLines(client, selections).filter((line) => line.cant > 0);
			return { client, lines, total: lines.reduce((sum, line) => sum + line.subtotal, 0) };
		})
		.filter((draft) => draft.lines.length > 0);
}

export function draftsTotal(drafts: readonly RouteOrderDraft[]): number {
	return drafts.reduce((sum, draft) => sum + draft.total, 0);
}

// ----- Envío -----
// Body de POST /orders/routes/{id}: renglones sin precio. `deliveryTime` es el valor del
// <input type="time">.
export function buildRouteOrdersPayload(
	drafts: readonly RouteOrderDraft[],
	deliveryTime: string,
	driverId: number | null
): RouteOrdersCreate {
	return {
		estimated_delivery: toApiTime(deliveryTime),
		id_user_vehicle: driverId,
		orders: drafts.map((draft) => ({
			id_client: draft.client.id_client,
			items: draft.lines.map((line): RouteOrderItemInput => ({ id_product: line.product.id_product, cant: line.cant })),
		})),
	};
}

// HTML de la alerta de confirmación: una cajita gris por pedido (cliente, su total y sus
// productos) y el total estimado. Estilos en línea porque SweetAlert pinta este HTML tal
// cual; los colores son los de slate / brand de styles.css.
export function routeOrdersConfirmHtml(
	drafts: readonly RouteOrderDraft[],
	meta: { deliveryText: string; driverText: string }
): string {
	const boxes = drafts
		.map((draft) => {
			const lines = draft.lines
				.map(
					(line) => `
						<li style="display:flex;justify-content:space-between;gap:1rem;padding:.2rem 0">
							<span><strong style="color:#1e3a8a">${line.cant}×</strong> ${escapeHtml(line.product.name)}</span>
							<span style="white-space:nowrap;font-variant-numeric:tabular-nums">${formatCop(line.subtotal)}</span>
						</li>`
				)
				.join('');
			return `
				<div style="border:1px solid #e2e8f0;border-radius:.75rem;background:#f1f5f9;padding:.625rem .875rem">
					<div style="display:flex;justify-content:space-between;gap:1rem;padding-bottom:.375rem;margin-bottom:.25rem;border-bottom:1px solid #cbd5e1">
						<strong style="color:#0f172a">${escapeHtml(draft.client.name)}</strong>
						<strong style="white-space:nowrap;color:#172554;font-variant-numeric:tabular-nums">${formatCop(draft.total)}</strong>
					</div>
					<ul style="margin:0;padding:0;list-style:none;font-size:.875rem;color:#334155">${lines}</ul>
				</div>`;
		})
		.join('');

	return `
		<div style="text-align:left">
			<p style="margin:0 0 .75rem">
				Entrega estimada: <strong>${escapeHtml(meta.deliveryText)}</strong> ·
				Domiciliario: <strong>${escapeHtml(meta.driverText)}</strong>
			</p>
			<div style="display:grid;gap:.5rem;max-height:20rem;overflow-y:auto;padding-right:.25rem">${boxes}</div>
			<p style="margin:.75rem 0 0;text-align:right">Total estimado: <strong style="color:#172554">${formatCop(draftsTotal(drafts))}</strong></p>
		</div>
	`;
}
