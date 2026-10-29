// ==================================================
// Panel de administración · Productos (lógica pura)
// ==================================================
// La API pagina y filtra (GET /products/admin); aquí se validan los campos del
// formulario y se arma lo que se envía. El precio se escribe como texto, igual que en
// el editor de productos del pedido (sanitizePrice / parsePrice).

import { ProductAdminFilters, ProductAdminRow, ProductCreate, ProductUpdate } from '@core/Models/CoreModule/catalog.model';
import { toNumber } from './money.utils';
import { parsePrice } from './order-items.utils';

export const PRODUCT_CODE_DIGITS = 3;
export const MAX_PRODUCT_NAME_LENGTH = 50;
export const MAX_PRODUCT_DESCRIPTION_LENGTH = 200;

// ----- Filtros -----
// Por defecto se ven los activos; los inactivos se buscan con el filtro de estado
export const DEFAULT_PRODUCT_FILTERS: ProductAdminFilters = { search: '', active: true };

export function hasCustomProductFilters(filters: ProductAdminFilters): boolean {
	return filters.search !== DEFAULT_PRODUCT_FILTERS.search || filters.active !== DEFAULT_PRODUCT_FILTERS.active;
}

// ----- Formulario (crear / editar) -----
export interface ProductDraft {
	code: string; // solo dígitos
	name: string;
	description: string;
	priceText: string; // "4500" o "4500.5"
}

export const EMPTY_PRODUCT: ProductDraft = { code: '', name: '', description: '', priceText: '' };

export type ProductField = keyof ProductDraft;
export type ProductErrors = Partial<Record<ProductField, string>>;

export function draftFromProduct(product: ProductAdminRow | null): ProductDraft {
	if (!product) return { ...EMPTY_PRODUCT };
	return {
		code: product.code,
		name: product.name,
		description: product.description ?? '',
		priceText: String(toNumber(product.base_price)),
	};
}

// Errores de cada campo (vacío = todo bien). La descripción es opcional.
export function productErrors(draft: ProductDraft): ProductErrors {
	const errors: ProductErrors = {};
	if (!new RegExp(`^\\d{${PRODUCT_CODE_DIGITS}}$`).test(draft.code)) {
		errors.code = `El código debe tener ${PRODUCT_CODE_DIGITS} dígitos.`;
	}

	const name = draft.name.trim();
	if (!name) errors.name = 'Escribe el nombre del producto.';
	else if (name.length > MAX_PRODUCT_NAME_LENGTH) errors.name = `Máximo ${MAX_PRODUCT_NAME_LENGTH} caracteres.`;

	if (draft.description.trim().length > MAX_PRODUCT_DESCRIPTION_LENGTH) {
		errors.description = `Máximo ${MAX_PRODUCT_DESCRIPTION_LENGTH} caracteres.`;
	}

	if (toBasePrice(draft.priceText) === null) errors.priceText = 'Escribe el precio base.';
	return errors;
}

export function hasProductErrors(errors: ProductErrors): boolean {
	return Object.keys(errors).length > 0;
}

// Precio listo para enviar (2 decimales), o null si el texto no es válido
export function toBasePrice(text: string): number | null {
	const value = parsePrice(text);
	return value === null ? null : Math.round(value * 100) / 100;
}

export function toProductCreate(draft: ProductDraft): ProductCreate {
	return {
		code: draft.code,
		name: draft.name.trim(),
		description: draft.description.trim() || null,
		base_price: toBasePrice(draft.priceText) ?? 0,
	};
}

// Solo lo que cambió (PATCH parcial). La API guarda nombre y descripción en mayúsculas,
// así que se comparan igual que quedarán guardados.
export function productChanges(product: ProductAdminRow, draft: ProductDraft): ProductUpdate {
	const next = toProductCreate(draft);
	const changes: ProductUpdate = {};
	if (next.code !== product.code) changes.code = next.code;
	if (next.name.toUpperCase() !== product.name) changes.name = next.name;
	if ((next.description?.toUpperCase() ?? null) !== product.description) changes.description = next.description ?? null;
	if (toNumber(next.base_price) !== toNumber(product.base_price)) changes.base_price = next.base_price;
	return changes;
}

export function hasProductChanges(changes: ProductUpdate): boolean {
	return Object.keys(changes).length > 0;
}

// ----- Textos -----
// "3 clientes" con precio especial pactado
export function specialPricesText(count: number): string {
	if (count === 0) return 'Ninguno';
	return `${count} ${count === 1 ? 'cliente' : 'clientes'}`;
}
