// ==================================================
// Cancelación de pedidos (lógica pura)
// ==================================================
// Un pedido PENDING o DISPATCHED se cancela con un motivo de la lista fija y una nota
// opcional; la API guarda quién y cuándo (POST /orders/{id}/cancel). No borra nada: el PO no
// se reutiliza. Un despachado que se cancela sale en el cierre como informativo (no suma).

import { OrderCancelRequest, OrderSummary } from '@core/Models/CoreModule/order.model';
import { CANCEL_REASON_LABELS, CancelReason, OrderState } from '@core/Models/Shared/api-types.model';
import { Option } from './admin-filters.utils';

// Lo mínimo que se necesita para cancelar: sirve con una fila del tablero o con el detalle
export type CancellableOrder = Pick<OrderSummary, 'id_order' | 'purchase_order' | 'client_name' | 'state'>;

// Máximo de caracteres de la nota (lo valida la API)
export const MAX_CANCEL_NOTE_LENGTH = 300;

export const CANCEL_REASON_OPTIONS: readonly Option[] = Object.values(CancelReason).map((reason) => ({
	value: reason,
	label: CANCEL_REASON_LABELS[reason],
}));

export function cancelReasonError(reason: CancelReason | null): string | null {
	return reason === null ? 'Elige el motivo de la cancelación.' : null;
}

export function cancelNoteError(note: string): string | null {
	return note.trim().length > MAX_CANCEL_NOTE_LENGTH ? `Máximo ${MAX_CANCEL_NOTE_LENGTH} caracteres.` : null;
}

// La nota se envía recortada y, si queda vacía, como null
export function toCancelRequest(reason: CancelReason, note: string): OrderCancelRequest {
	const trimmed = note.trim();
	return { cancel_reason: reason, cancel_note: trimmed === '' ? null : trimmed };
}

// Aviso según el estado: un despachado ya salió con el domiciliario
export function cancelNotice(state: OrderState): string {
	return state === OrderState.DISPATCHED
		? 'El pedido ya fue despachado: en el cierre del día saldrá en el listado de cancelados (no suma a las ventas).'
		: 'El pedido no se despachará y su PO no se reutiliza.';
}
