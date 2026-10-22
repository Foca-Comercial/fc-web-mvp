// ==================================================
// Componente: <app-route-card>
// ==================================================
// Card de una ruta (vista Rutas): nombre, N.° de clientes, hora de salida y clientes que
// contiene. Tiene dos modos según `card.status`:
//   - Con estado (Rutas del día): badge Por agregar / Agregado y sus dos acciones.
//     "Vista principal" queda deshabilitado cuando la ruta ya está agregada.
//   - Sin estado (Rutas de la semana): solo informativa, con los días en que sale.
//
//   <app-route-card [card]="card" (viewDetails)="openDetail(card)" (addToMain)="addToMain(card)" />
//   <app-route-card [card]="weekCard" />

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IconComponent } from '@components/Shared/icon/icon.component';
import { DaysWeekPipe } from '@core/Pipes/days-week.pipe';
import { formatDepartureTime, ROUTE_STATUS_LABELS, RouteCardInfo } from '@core/Utils/route-board.utils';

@Component({
	selector: 'app-route-card',
	imports: [IconComponent, DaysWeekPipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		class: 'flex flex-col gap-3 rounded-2xl bg-white px-5 py-[13px] shadow-card',
		'[class.min-h-80]': '!informative()',
	},
	templateUrl: './route-card.component.html',
})
export class RouteCardComponent {
	readonly card = input.required<RouteCardInfo>();

	readonly viewDetails = output<void>();
	readonly addToMain = output<void>();

	protected readonly informative = computed(() => this.card().status === null);
	protected readonly added = computed(() => this.card().status === 'added');
	protected readonly statusLabel = computed(() => {
		const status = this.card().status;
		return status ? ROUTE_STATUS_LABELS[status] : '';
	});
	protected readonly departure = computed(() => formatDepartureTime(this.card().route.departure_time));
}
