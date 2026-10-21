// ==================================================
// Componente: <app-route-card>
// ==================================================
// Card de una ruta del día (vista Rutas): nombre, estado (Por agregar / Agregado),
// N.° de clientes, hora de salida, clientes que contiene y sus dos acciones.
// "Vista principal" queda deshabilitado cuando la ruta ya está agregada.
//
//   <app-route-card [card]="card" (viewDetails)="openDetail(card)" (addToMain)="addToMain(card)" />

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { formatDepartureTime, ROUTE_STATUS_LABELS, RouteDayCard } from '@core/Utils/route-board.utils';

@Component({
	selector: 'app-route-card',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'flex min-h-80 flex-col gap-3 rounded-2xl bg-white px-5 py-[13px] shadow-card' },
	templateUrl: './route-card.component.html',
})
export class RouteCardComponent {
	readonly card = input.required<RouteDayCard>();

	readonly viewDetails = output<void>();
	readonly addToMain = output<void>();

	protected readonly added = computed(() => this.card().status === 'added');
	protected readonly statusLabel = computed(() => ROUTE_STATUS_LABELS[this.card().status]);
	protected readonly departure = computed(() => formatDepartureTime(this.card().route.departure_time));
}
