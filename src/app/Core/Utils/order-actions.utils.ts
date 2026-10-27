// ==================================================
// Qué se puede hacer con un pedido según su estado
// ==================================================
// Un solo lugar para las reglas de la máquina de estados (PENDING → DISPATCHED →
// DELIVERED), así la tabla y el modal de detalle no las repiten. Espejo de lo que valida
// la API: el backend sigue siendo quien decide, esto solo evita ofrecer botones que fallarían.

import { OrderState } from '@core/Models/Shared/api-types.model';

export interface OrderCapabilities {
	canDispatch: boolean; // marcar como despachado (y generar el CD)
	canDeliver: boolean; // marcar como entregado
	canChangeDriver: boolean; // asignar, cambiar o quitar domiciliario
	canPrintReceipt: boolean; // el CD solo existe desde que se despacha
}

export function orderCapabilities(state: OrderState): OrderCapabilities {
	return {
		canDispatch: state === OrderState.PENDING,
		canDeliver: state === OrderState.DISPATCHED,
		canChangeDriver: state === OrderState.PENDING || state === OrderState.DISPATCHED,
		canPrintReceipt: state === OrderState.DISPATCHED || state === OrderState.DELIVERED,
	};
}
