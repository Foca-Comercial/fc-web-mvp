// ==================================================
// Componente: <app-order-status-badge>
// ==================================================
// Badge del estado de entrega de un pedido. Calcula Pendiente / Próximo / Retrasado con
// `estimated_delivery` y se refresca solo con el reloj compartido (ClockService).
//
//   <app-order-status-badge [state]="row.state" [estimatedDelivery]="row.estimated_delivery" />
//
// Si se está viendo un día que no es hoy, pasar `[orderDate]="'2026-10-14'"`.

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { StatusBadgeComponent } from '@components/Shared/status-badge/status-badge.component';
import { OrderState } from '@core/Models/Shared/api-types.model';
import { ClockService } from '@core/Service/Clock/clock.service';
import { computeDeliveryStatus } from '@core/Utils/delivery-status.utils';

@Component({
	selector: 'app-order-status-badge',
	imports: [StatusBadgeComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<app-status-badge [tone]="status().tone" [hint]="status().detail">{{ status().label }}</app-status-badge>`,
})
export class OrderStatusBadgeComponent {
	private readonly clock = inject(ClockService);

	readonly state = input.required<OrderState>();
	readonly estimatedDelivery = input<string | null>(null);
	readonly orderDate = input<string | null>(null);

	protected readonly status = computed(() =>
		computeDeliveryStatus(this.state(), this.estimatedDelivery(), this.clock.now(), this.orderDate())
	);
}
