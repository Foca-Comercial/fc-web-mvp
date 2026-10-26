// ==================================================
// Componente: <app-route-card>
// ==================================================
// Card de una ruta del día (pestaña Rutas del día): nombre, estado (Por agregar /
// Agregado), N.° de clientes, hora de salida, clientes que contiene y sus dos acciones.
// "Vista principal" queda deshabilitado cuando la ruta ya está agregada.
// Las rutas de la semana usan la card compacta <app-route-week-card>.
//
//   <app-route-card [card]="card" (viewDetails)="openDetail(card)" (addToMain)="addToMain(card)" />

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IconComponent } from '@components/Shared/icon/icon.component';
import { formatDepartureTime, ROUTE_STATUS_LABELS, RouteDayCard } from '@core/Utils/route-board.utils';

@Component({
	selector: 'app-route-card',
	imports: [IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'flex min-h-80 flex-col gap-3 rounded-2xl bg-white px-5 py-3 shadow-card' },
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
