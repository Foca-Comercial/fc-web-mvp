// ==================================================
// Pipe: orderState
// ==================================================
//   {{ order.state | orderState }} → Despachado

import { Pipe, PipeTransform } from '@angular/core';
import { ORDER_STATE_LABELS, OrderState } from '@core/Models/Shared/api-types.model';

@Pipe({ name: 'orderState' })
export class OrderStatePipe implements PipeTransform {
	transform(value: OrderState | string | null | undefined): string {
		if (!value) return '';
		return ORDER_STATE_LABELS[value as OrderState] ?? value;
	}
}
