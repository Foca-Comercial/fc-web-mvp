// ==================================================
// Vista: Rutas constantes
// ==================================================
// Rutas que salen hoy (GET /orders/routes-of-day) en cards. Cada card muestra cuántos
// clientes tiene, la hora de salida y qué clientes contiene; esos nombres y sus zonas
// vienen de GET /routes/{id}/clients (la API no los trae en las rutas del día).
// Buscar y filtrar se hace en el cliente (ver route-board.utils).
//
// Una ruta está "Por agregar" hasta que se generan sus pedidos del día; entonces pasa a
// "Agregado" y sus pedidos aparecen en el tablero de despachos (la vista principal).
// Crear rutas y generar los pedidos de una ruta se suman en el siguiente paso.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom, forkJoin, of } from 'rxjs';

import { EmptyStateComponent } from '@components/Shared/empty-state/empty-state.component';
import { FilterSelectComponent } from '@components/Shared/filter-select/filter-select.component';
import { IconComponent } from '@components/Shared/icon/icon.component';
import { SearchInputComponent } from '@components/Shared/search-input/search-input.component';
import { SkeletonComponent } from '@components/Shared/skeleton/skeleton.component';
import { RouteCardComponent } from '@components/System/Routes/route-card/route-card.component';
import { RouteDetailModalComponent } from '@components/System/Routes/route-detail-modal/route-detail-modal.component';
import { AlertService } from '@core/Service/Alerts/alert.service';
import { ApiAlertService } from '@core/Service/Alerts/api-alert.service';
import { OrderService } from '@core/Service/CoreModule/order.service';
import { RouteService } from '@core/Service/ParametersModule/route.service';
import {
	buildRouteCard,
	filterRoutes,
	RouteDayCard,
	RouteFilters,
	routeStatusOptions,
	routeZoneOptions,
} from '@core/Utils/route-board.utils';

@Component({
	selector: 'app-routes-board',
	imports: [
		EmptyStateComponent,
		FilterSelectComponent,
		IconComponent,
		SearchInputComponent,
		SkeletonComponent,
		RouteCardComponent,
		RouteDetailModalComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './routes-board.component.html',
})
export class RoutesBoardComponent {
	private readonly orders = inject(OrderService);
	private readonly routes = inject(RouteService);
	private readonly apiAlert = inject(ApiAlertService);
	private readonly alert = inject(AlertService);

	// ----- Datos -----
	private readonly cards = signal<RouteDayCard[]>([]);
	protected readonly loading = signal(true);
	protected readonly loadFailed = signal(false);

	// ----- Filtros -----
	protected readonly search = signal('');
	protected readonly zone = signal('');
	protected readonly status = signal('');
	protected readonly selected = signal<RouteDayCard | null>(null);

	private readonly filters = computed<RouteFilters>(() => ({
		search: this.search(),
		zone: this.zone(),
		status: this.status(),
	}));

	protected readonly zoneOptions = computed(() => routeZoneOptions(this.cards()));
	protected readonly statusOptions = routeStatusOptions();
	protected readonly hasFilters = computed(() => Object.values(this.filters()).some(Boolean));
	protected readonly visibleCards = computed(() => filterRoutes(this.cards(), this.filters()));
	protected readonly skeletonCards = [0, 1, 2, 3, 4, 5];

	constructor() {
		void this.load();
	}

	// ----- Carga -----
	private async load(): Promise<void> {
		this.loading.set(true);
		try {
			const routes = await firstValueFrom(this.orders.getRoutesOfDay());
			// Los clientes de todas las rutas en paralelo
			const clients = await firstValueFrom(
				routes.length ? forkJoin(routes.map((route) => this.routes.getClients(route.id_route))) : of([])
			);
			this.cards.set(routes.map((route, index) => buildRouteCard(route, clients[index] ?? [])));
			this.loadFailed.set(false);
		} catch (error) {
			this.loadFailed.set(true);
			await this.apiAlert.handleError(error, 'No se pudieron cargar las rutas');
		} finally {
			this.loading.set(false);
		}
	}

	protected retry(): void {
		void this.load();
	}

	// ----- Interacción -----
	protected clearFilters(): void {
		this.search.set('');
		this.zone.set('');
		this.status.set('');
	}

	protected openDetail(card: RouteDayCard): void {
		this.selected.set(card);
	}

	protected newRoute(): void {
		this.alert.toast('La creación de rutas se habilita en el siguiente paso', 'info');
	}

	protected addToMain(_card: RouteDayCard): void {
		this.alert.toast('La generación de pedidos desde la ruta se habilita en el siguiente paso', 'info');
	}
}
