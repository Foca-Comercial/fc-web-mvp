// ==================================================
// Editor de productos de un pedido (lógica pura)
// ==================================================
// Lo usan la edición de un pedido pendiente (PUT /orders/{id}/items-order) y, más adelante,
// el registro de pedidos nuevos. Cada renglón trae el precio como TEXTO (`priceText`) porque
// se está escribiendo; se convierte a número solo para sumar y para enviar. Los subtotales y
// el total que se ven son una estimación: la API recalcula y guarda los definitivos.

import { PickerOption } from '@components/Shared/item-picker/item-picker.utils';
import { ProductCatalogItem } from '@core/Models/CoreModule/catalog.model';
import { OrderDetailItem, OrderItemInput, OrderItemsSyncRequest } from '@core/Models/CoreModule/order.model';
import { formatCop, toNumber } from './money.utils';

export interface EditorLine {
	id_order_detail: number | null; // null = renglón nuevo
	id_product: number;
	code: string;
	name: string;
	cant: number; // 0 mientras el usuario la está escribiendo
	priceText: string; // "12500" o "12500.5"; vacío si se borró
}

// ----- Construcción -----
export function linesFromItems(items: readonly OrderDetailItem[]): EditorLine[] {
	return items.map((item) => ({
		id_order_detail: item.id_order_detail,
		id_product: item.id_product,
		code: item.product_code,
		name: item.product_name,
		cant: item.cant,
		priceText: String(toNumber(item.unit_price)),
	}));
}

// Si el producto ya estaba en el pedido original y se quitó, al volver a agregarlo se reutiliza
// su renglón: así se conserva el `id_order_detail` y la API lo actualiza en vez de borrar y crear.
export function addCatalogLine(
	lines: readonly EditorLine[],
	product: ProductCatalogItem,
	original: readonly EditorLine[] = []
): EditorLine[] {
	if (lines.some((line) => line.id_product === product.id_product)) return [...lines];
	const before = original.find((line) => line.id_product === product.id_product);
	return [
		...lines,
		{
			id_order_detail: before?.id_order_detail ?? null,
			id_product: product.id_product,
			code: product.code,
			name: product.name,
			cant: 1,
			priceText: String(toNumber(product.effective_price)),
		},
	];
}

export function removeLine(lines: readonly EditorLine[], idProduct: number): EditorLine[] {
	return lines.filter((line) => line.id_product !== idProduct);
}

export function setLineQuantity(lines: readonly EditorLine[], idProduct: number, cant: number): EditorLine[] {
	const safe = Number.isFinite(cant) && cant > 0 ? Math.floor(cant) : 0;
	return lines.map((line) => (line.id_product === idProduct ? { ...line, cant: safe } : line));
}

export function setLinePrice(lines: readonly EditorLine[], idProduct: number, text: string): EditorLine[] {
	const priceText = sanitizePrice(text);
	return lines.map((line) => (line.id_product === idProduct ? { ...line, priceText } : line));
}

// Solo dígitos y un punto decimal, con hasta 2 decimales ("12a50" → "1250"; "12.5.7" → "12.57")
export function sanitizePrice(text: string): string {
	const cleaned = text.replace(/[^\d.]/g, '');
	const [integer, ...rest] = cleaned.split('.');
	if (rest.length === 0) return integer;
	return `${integer}.${rest.join('').slice(0, 2)}`;
}

// ----- Valores -----
// null si está vacío o no es un número válido
export function parsePrice(text: string): number | null {
	if (!text.trim()) return null;
	const value = Number(text);
	return Number.isFinite(value) && value >= 0 ? value : null;
}

export function lineSubtotal(line: EditorLine): number {
	return line.cant * (parsePrice(line.priceText) ?? 0);
}

export function linesTotal(lines: readonly EditorLine[]): number {
	return lines.reduce((sum, line) => sum + lineSubtotal(line), 0);
}

// Qué impide guardar (null = todo bien)
export function itemsProblem(lines: readonly EditorLine[]): string | null {
	if (lines.length === 0) return 'El pedido debe tener al menos un producto.';
	if (lines.some((line) => line.cant <= 0)) return 'Hay productos sin cantidad.';
	if (lines.some((line) => parsePrice(line.priceText) === null)) return 'Hay productos sin precio.';
	return null;
}

// ¿Cambió algo respecto al pedido guardado? Compara por producto, sin importar el orden.
export function itemsChanged(original: readonly EditorLine[], current: readonly EditorLine[]): boolean {
	if (original.length !== current.length) return true;
	const before = new Map(original.map((line) => [line.id_product, line]));
	return current.some((line) => {
		const saved = before.get(line.id_product);
		return !saved || saved.cant !== line.cant || parsePrice(saved.priceText) !== parsePrice(line.priceText);
	});
}

// ----- Envío -----
// Body de PUT /orders/{id}/items-order: la lista FINAL. Se asume que `itemsProblem` ya dio null.
export function buildItemsSync(lines: readonly EditorLine[]): OrderItemsSyncRequest {
	return {
		items: lines.map((line) => ({
			id_order_detail: line.id_order_detail,
			id_product: line.id_product,
			cant: line.cant,
			unit_price: Math.round((parsePrice(line.priceText) ?? 0) * 100) / 100,
		})),
	};
}

// Renglones de un pedido NUEVO (POST /orders/new-client y /existing-client): sin `id_order_detail`
export function buildNewOrderItems(lines: readonly EditorLine[]): OrderItemInput[] {
	return lines.map((line) => ({
		id_product: line.id_product,
		cant: line.cant,
		unit_price: Math.round((parsePrice(line.priceText) ?? 0) * 100) / 100,
	}));
}

// ----- Buscador de productos -----
// Todo el catálogo menos lo que ya está en el pedido. El precio de la derecha es el que
// se cargará al agregarlo (el pactado del cliente si tiene).
export function catalogPickerOptions(catalog: readonly ProductCatalogItem[], lines: readonly EditorLine[]): PickerOption[] {
	const taken = new Set(lines.map((line) => line.id_product));
	return catalog
		.filter((product) => !taken.has(product.id_product))
		.map((product) => ({
			id: product.id_product,
			code: product.code,
			label: product.name,
			meta: `${formatCop(product.effective_price)}${product.agreed_price !== null ? ' · pactado' : ''}`,
		}));
}
