// ==================================================
// Componente: <app-route-detail-modal>
// ==================================================
// Modal de solo lectura con el detalle de una ruta del día: días en que sale, hora de
// salida, estado y la lista de sus clientes. Usa los datos que ya cargó la vista, así
// que no hace peticiones. Se abre cuando `card` trae una ruta, avisa con `(closed)` y con
// `(edit)` pide abrir el formulario de la ruta.
//
//   <app-route-detail-modal [card]="selected()" (closed)="selected.set(null)" (edit)="editRoute($event)" />

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { EmptyStateComponent } from '@components/Shared/empty-state/empty-state.component';
import { ModalComponent } from '@components/Shared/modal/modal.component';
import { DaysWeekPipe } from '@core/Pipes/days-week.pipe';
import { formatDepartureTime, ROUTE_STATUS_LABELS, RouteDayCard } from '@core/Utils/route-board.utils';

@Component({
	selector: 'app-route-detail-modal',
	imports: [ModalComponent, EmptyStateComponent, DaysWeekPipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './route-detail-modal.component.html',
})
export class RouteDetailModalComponent {
	readonly card = input<RouteDayCard | null>(null);
	readonly closed = output<void>();
	readonly edit = output<RouteDayCard>();

	protected readonly title = computed(() => this.card()?.route.name ?? 'Detalle de la ruta');
	protected readonly departure = computed(() => formatDepartureTime(this.card()?.route.departure_time));
	protected readonly statusLabel = computed(() => {
		const card = this.card();
		return card ? ROUTE_STATUS_LABELS[card.status] : '';
	});

	protected onOpenChange(open: boolean): void {
		if (!open) this.closed.emit();
	}
}
