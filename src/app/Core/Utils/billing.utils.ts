// ==================================================
// Pago, factura y observación del pedido (lógica pura)
// ==================================================
// Cada pedido lleva cómo paga el cliente (efectivo, transferencia o crédito), qué factura
// lleva (POS o electrónica) y una observación general opcional. Lo usan el formulario de
// pedido nuevo, el de pedidos por ruta, el detalle del pedido y el histórico.
//
// Regla del negocio que espeja a la API (`Order.has_receipt`): solo el efectivo en factura
// POS lleva CD (comprobante de despacho) y entra al consolidado del cierre; el resto se
// factura aparte en Siigo. La API sigue siendo quien decide: esto solo evita ofrecer lo que
// no aplica y avisa antes de guardar.

import {
	INVOICE_TYPE_LABELS,
	InvoiceType,
	PAYMENT_METHOD_LABELS,
	PaymentMethod,
} from '@core/Models/Shared/api-types.model';
import { Option } from './admin-filters.utils';

// Máximo de caracteres de la observación (lo valida la API)
export const MAX_OBSERVATIONS_LENGTH = 500;

// ----- Opciones de los <select> -----
export const PAYMENT_OPTIONS: readonly Option[] = Object.values(PaymentMethod).map((method) => ({
	value: method,
	label: PAYMENT_METHOD_LABELS[method],
}));

export const INVOICE_OPTIONS: readonly Option[] = Object.values(InvoiceType).map((type) => ({
	value: type,
	label: INVOICE_TYPE_LABELS[type],
}));

// El valor de un <select> llega como texto; solo se aceptan los valores del enum
export function toPaymentMethod(value: string): PaymentMethod {
	return (Object.values(PaymentMethod) as string[]).includes(value) ? (value as PaymentMethod) : PaymentMethod.CASH;
}

export function toInvoiceType(value: string): InvoiceType {
	return (Object.values(InvoiceType) as string[]).includes(value) ? (value as InvoiceType) : InvoiceType.POS;
}

// ----- Reglas -----
// Tipo de factura con el que arranca un pedido de un cliente registrado
export function defaultInvoiceType(requiresElectronicInvoice: boolean): InvoiceType {
	return requiresElectronicInvoice ? InvoiceType.ELECTRONIC : InvoiceType.POS;
}

// ¿Lleva CD? Solo POS + efectivo
export function hasReceipt(payment: PaymentMethod, invoice: InvoiceType): boolean {
	return payment === PaymentMethod.CASH && invoice === InvoiceType.POS;
}

// Aviso para el gestor cuando el pedido no lleva CD; null si lo lleva
export function noReceiptNotice(payment: PaymentMethod, invoice: InvoiceType): string | null {
	if (hasReceipt(payment, invoice)) return null;
	const cause =
		payment !== PaymentMethod.CASH && invoice !== InvoiceType.POS
			? 'es factura electrónica y no se paga en efectivo'
			: payment !== PaymentMethod.CASH
				? `se paga por ${PAYMENT_METHOD_LABELS[payment].toLowerCase()}`
				: 'es factura electrónica';
	return `Este pedido no lleva CD porque ${cause}: se factura aparte en Siigo.`;
}

// ----- Observación -----
// Se envía recortada y, si queda vacía, como null (la API no admite texto en blanco)
export function toObservations(text: string): string | null {
	const trimmed = text.trim();
	return trimmed === '' ? null : trimmed;
}

export function observationsError(text: string): string | null {
	return text.trim().length > MAX_OBSERVATIONS_LENGTH ? `Máximo ${MAX_OBSERVATIONS_LENGTH} caracteres.` : null;
}
