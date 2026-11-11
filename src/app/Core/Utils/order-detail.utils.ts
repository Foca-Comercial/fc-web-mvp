// ==================================================
// Detalle del pedido: edición de pago, factura y observación (lógica pura)
// ==================================================
// En PENDING y DISPATCHED el detalle deja cambiar el método de pago, el tipo de factura y la
// observación general (PATCH /orders/{id}), igual que el domiciliario: bloque propio con su
// botón Guardar. Aquí se arma el borrador, se detecta qué cambió y se arma el PATCH, que
// envía solo lo modificado.

import { OrderFullDetail, OrderUpdate } from '@core/Models/CoreModule/order.model';
import { InvoiceType, PaymentMethod } from '@core/Models/Shared/api-types.model';
import { observationsError, toObservations } from './billing.utils';

export interface BillingDraft {
	paymentMethod: PaymentMethod;
	invoiceType: InvoiceType;
	observations: string; // texto del campo; vacío = sin observación
}

type BillingSource = Pick<OrderFullDetail, 'payment_method' | 'invoice_type' | 'observations'>;

export function draftFromOrder(order: BillingSource): BillingDraft {
	return {
		paymentMethod: order.payment_method,
		invoiceType: order.invoice_type,
		observations: order.observations ?? '',
	};
}

// Solo lo que cambió. La observación se compara recortada y vacía = null (que la API borra).
export function billingChanges(order: BillingSource, draft: BillingDraft): OrderUpdate {
	const changes: OrderUpdate = {};
	if (draft.paymentMethod !== order.payment_method) changes.payment_method = draft.paymentMethod;
	if (draft.invoiceType !== order.invoice_type) changes.invoice_type = draft.invoiceType;
	const observations = toObservations(draft.observations);
	if (observations !== (order.observations ?? null)) changes.observations = observations;
	return changes;
}

export function hasBillingChanges(changes: OrderUpdate): boolean {
	return Object.keys(changes).length > 0;
}

// Problema que impide guardar (null = se puede guardar)
export function billingProblem(draft: BillingDraft): string | null {
	return observationsError(draft.observations);
}
