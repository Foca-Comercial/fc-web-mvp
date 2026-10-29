// ==================================================
// Panel de administración · Precios especiales de un cliente (lógica pura)
// ==================================================
// Un precio pactado por producto. La API asigna o cambia con PUT (upsert) y quita con
// DELETE; aquí se manejan los precios escritos como texto (igual que el editor de
// productos del pedido: sanitizePrice / parsePrice) y la lista ordenada por código.

import { PickerOption } from '@components/Shared/item-picker/item-picker.utils';
import { ClientSpecialPrice, ProductCatalogItem } from '@core/Models/CoreModule/catalog.model';
import { Money } from '@core/Models/Shared/api-types.model';
import { formatCop, toNumber } from './money.utils';
import { parsePrice } from './order-items.utils';

// ----- Texto ↔ precio -----
// "2500.00" → "2500" (lo que se muestra en el campo)
export function priceText(value: Money | number): string {
	return String(toNumber(value));
}

// Precio listo para enviar (2 decimales), o null si el texto no es un precio válido
export function toAgreedPrice(text: string): number | null {
	const value = parsePrice(text);
	return value === null ? null : Math.round(value * 100) / 100;
}

// ¿El texto escrito es un precio válido y distinto del guardado?
export function isPriceChanged(row: ClientSpecialPrice, text: string): boolean {
	const value = toAgreedPrice(text);
	return value !== null && value !== toNumber(row.agreed_price);
}

// ----- Lista (ordenada por código) -----
export function upsertPriceRow(rows: readonly ClientSpecialPrice[], row: ClientSpecialPrice): ClientSpecialPrice[] {
	return [...rows.filter((r) => r.id_product !== row.id_product), row].sort((a, b) =>
		a.product_code.localeCompare(b.product_code)
	);
}

export function removePriceRow(rows: readonly ClientSpecialPrice[], idProduct: number): ClientSpecialPrice[] {
	return rows.filter((row) => row.id_product !== idProduct);
}

// Productos del catálogo (activos) que aún no tienen precio pactado, con su precio base
export function pricePickerOptions(catalog: readonly ProductCatalogItem[], rows: readonly ClientSpecialPrice[]): PickerOption[] {
	const taken = new Set(rows.map((row) => row.id_product));
	return catalog
		.filter((product) => !taken.has(product.id_product))
		.map((product) => ({
			id: product.id_product,
			code: product.code,
			label: product.name,
			meta: `Base ${formatCop(product.base_price)}`,
		}));
}

// ----- Diferencia con el precio base -----
export type PriceDeltaTone = 'lower' | 'higher' | 'same';

export interface PriceDelta {
	label: string; // "−17 %", "+5 %", "Igual al base"
	tone: PriceDeltaTone;
}

// null si el precio base es 0 o el texto no es un precio válido
export function priceDelta(base: Money | number, agreed: Money | number | null): PriceDelta | null {
	const baseValue = toNumber(base);
	if (agreed === null || baseValue <= 0) return null;
	const percent = Math.round(((toNumber(agreed) - baseValue) / baseValue) * 100);
	if (percent === 0) return { label: 'Igual al base', tone: 'same' };
	return percent < 0 ? { label: `−${Math.abs(percent)} %`, tone: 'lower' } : { label: `+${percent} %`, tone: 'higher' };
}
