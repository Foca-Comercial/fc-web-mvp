// ==================================================
// Componente: <app-route-detail-modal>
// ==================================================
// Modal de solo lectura con el detalle de una ruta: días en que sale, hora de salida, la
// lista de sus clientes y, si es una ruta del día, el estado de sus pedidos de hoy. Lo de la card ya está cargado; los clientes
// (teléfono, dirección, barrio…) se piden al abrirse (GET /routes/{id}/clients), así la
// vista no los pide de todas las rutas. Se abre cuando `card` trae una ruta y avisa con
// `(closed)`.
//
//   <app-route-detail-modal [card]="selected()" (closed)="selected.set(null)" />

import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';

import { EmptyStateComponent } from '@components/Shared/empty-state/empty-state.component';
import { ModalComponent } from '@components/Shared/modal/modal.component';
import { SkeletonComponent } from '@components/Shared/skeleton/skeleton.component';
import { RouteClient } from '@core/Models/ParametersModule/parameters.model';
import { DaysWeekPipe } from '@core/Pipes/days-week.pipe';
import { RouteService } from '@core/Service/ParametersModule/route.service';
import { parseApiError } from '@core/Utils/api-error.utils';
import { formatDepartureTime, isDayCard, ROUTE_STATUS_LABELS, RouteCardInfo } from '@core/Utils/route-board.utils';

type ClientsState =
	| { status: 'idle' }
	| { status: 'loading' }
	| { status: 'error'; message: string }
	| { status: 'ready'; clients: RouteClient[] };

const IDLE: ClientsState = { status: 'idle' };
const LOADING: ClientsState = { status: 'loading' };

@Component({
	selector: 'app-route-detail-modal',
	imports: [ModalComponent, EmptyStateComponent, SkeletonComponent, DaysWeekPipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './route-detail-modal.component.html',
})
export class RouteDetailModalComponent {
	private readonly routes = inject(RouteService);

	// Card de Rutas del día o de Rutas de la semana
	readonly card = input<RouteCardInfo | null>(null);
	readonly closed = output<void>();

	// Sube para volver a pedir los clientes (botón "Reintentar")
	private readonly reloadTick = signal(0);
	private readonly routeId = computed(() => this.card()?.route.id_route ?? null);

	// Un solo flujo: cada cambio de ruta cancela la petición anterior (switchMap)
	protected readonly clients = toSignal(
		combineLatest([toObservable(this.routeId), toObservable(this.reloadTick)]).pipe(
			switchMap(([id]) =>
				id === null
					? of(IDLE)
					: this.routes.getClients(id).pipe(
							// Solo los activos, como el N.° de clientes de la card
							map((clients): ClientsState => ({ status: 'ready', clients: clients.filter((client) => client.active) })),
							startWith(LOADING),
							catchError((error) => of<ClientsState>({ status: 'error', message: parseApiError(error).message }))
						)
			)
		),
		{ initialValue: IDLE }
	);

	protected readonly title = computed(() => this.card()?.route.name ?? 'Detalle de la ruta');
	protected readonly departure = computed(() => formatDepartureTime(this.card()?.route.departure_time));
	// Solo las rutas del día tienen estado y pedidos de hoy
	protected readonly dayCard = computed(() => {
		const card = this.card();
		return card && isDayCard(card) ? card : null;
	});
	protected readonly statusLabel = computed(() => {
		const card = this.dayCard();
		return card ? ROUTE_STATUS_LABELS[card.status] : '';
	});

	protected retry(): void {
		this.reloadTick.update((tick) => tick + 1);
	}

	protected onOpenChange(open: boolean): void {
		if (!open) this.closed.emit();
	}
}
