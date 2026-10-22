// ==================================================
// Vista: Rutas constantes
// ==================================================
// Dos pestañas:
//   - Rutas del día: las rutas que salen hoy (GET /orders/routes-of-day), con su estado
//     y acciones. Una ruta está "Por agregar" hasta que se generan sus pedidos del día;
//     entonces pasa a "Agregado" y sus pedidos aparecen en el tablero de despachos (la
//     vista principal).
//   - Rutas de la semana: todas las rutas activas (GET /routes/cards?only_active=true)
//     agrupadas de lunes a domingo, en cards solo informativas. Se carga la primera vez
//     que se abre la pestaña. Tiene su propio filtro por día de la semana.
// Los nombres y zonas de los clientes de cada ruta vienen de GET /routes/{id}/clients
// (las rutas no los traen) y se guardan para no pedirlos dos veces entre pestañas.
// Buscar y filtrar se hace en el cliente (ver route-board.utils).
// Crear rutas y generar los pedidos de una ruta se suman en el siguiente paso.

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom, forkJoin, of } from 'rxjs';

import { EmptyStateComponent } from '@components/Shared/empty-state/empty-state.component';
import { FilterSelectComponent } from '@components/Shared/filter-select/filter-select.component';
import { IconComponent } from '@components/Shared/icon/icon.component';
import { SearchInputComponent } from '@components/Shared/search-input/search-input.component';
import { SkeletonComponent } from '@components/Shared/skeleton/skeleton.component';
import { TabItem, TabsComponent } from '@components/Shared/tabs/tabs.component';
import { RouteCardComponent } from '@components/System/Routes/route-card/route-card.component';
import { RouteDetailModalComponent } from '@components/System/Routes/route-detail-modal/route-detail-modal.component';
import { RouteClient } from '@core/Models/ParametersModule/parameters.model';
import { AlertService } from '@core/Service/Alerts/alert.service';
import { ApiAlertService } from '@core/Service/Alerts/api-alert.service';
import { OrderService } from '@core/Service/CoreModule/order.service';
import { RouteService } from '@core/Service/ParametersModule/route.service';
import { isoWeekdayBogota } from '@core/Utils/date.utils';
import {
	buildRouteCard,
	buildWeekRouteCard,
	filterRoutes,
	groupRoutesByDay,
	RouteDayCard,
	RouteFilters,
	routeStatusOptions,
	RouteWeekCard,
	routeZoneOptions,
	weekDayOptions,
} from '@core/Utils/route-board.utils';

type RoutesTab = 'day' | 'week';

@Component({
	selector: 'app-routes-board',
	imports: [
		NgTemplateOutlet,
		EmptyStateComponent,
		FilterSelectComponent,
		IconComponent,
		SearchInputComponent,
		SkeletonComponent,
		TabsComponent,
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

	// ----- Pestañas -----
	protected readonly tab = signal<RoutesTab>('day');
	protected readonly tabs: TabItem[] = [
		{ id: 'day', label: 'Rutas Del Día' },
		{ id: 'week', label: 'Rutas De La Semana' },
	];

	// ----- Datos -----
	private readonly dayCards = signal<RouteDayCard[]>([]);
	protected readonly dayLoading = signal(true);
	protected readonly dayFailed = signal(false);

	private readonly weekCards = signal<RouteWeekCard[]>([]);
	protected readonly weekLoading = signal(false);
	protected readonly weekFailed = signal(false);
	private weekLoaded = false;

	// Clientes por ruta, compartidos entre las dos pestañas
	private readonly clientsByRoute = new Map<number, RouteClient[]>();

	// ----- Filtros -----
	protected readonly search = signal('');
	protected readonly zone = signal('');
	protected readonly status = signal(''); // solo aplica a Rutas del día
	protected readonly day = signal(''); // solo aplica a Rutas de la semana: '1' (lunes) … '7' (domingo)
	protected readonly selected = signal<RouteDayCard | null>(null);

	private readonly filters = computed<RouteFilters>(() => ({
		search: this.search(),
		zone: this.zone(),
		status: this.tab() === 'day' ? this.status() : '',
	}));

	private readonly loading = computed(() => (this.tab() === 'day' ? this.dayLoading() : this.weekLoading()));
	protected readonly zoneOptions = computed(() => routeZoneOptions(this.tab() === 'day' ? this.dayCards() : this.weekCards()));
	protected readonly statusOptions = routeStatusOptions();
	protected readonly dayOptions = weekDayOptions();
	protected readonly hasFilters = computed(
		() => Object.values(this.filters()).some(Boolean) || (this.tab() === 'week' && this.day() !== '')
	);

	protected readonly visibleDayCards = computed(() => filterRoutes(this.dayCards(), this.filters()));
	protected readonly weekDays = computed(() => groupRoutesByDay(filterRoutes(this.weekCards(), this.filters()), this.day()));
	protected readonly weekHasResults = computed(() => this.weekDays().some((day) => day.cards.length > 0));
	protected readonly today = isoWeekdayBogota();
	protected readonly skeletonCards = [0, 1, 2, 3, 4, 5];

	constructor() {
		void this.loadDay();

		// Si la zona elegida no existe en la pestaña que se está viendo, se limpia: si no,
		// el <select> mostraría "Todas" mientras las cards siguen filtradas
		effect(() => {
			const zone = this.zone();
			if (zone && !this.loading() && !this.zoneOptions().some((option) => option.value === zone)) this.zone.set('');
		});
	}

	// ----- Carga -----
	private async loadDay(): Promise<void> {
		this.dayLoading.set(true);
		try {
			const routes = await firstValueFrom(this.orders.getRoutesOfDay());
			await this.loadClients(routes.map((route) => route.id_route));
			this.dayCards.set(routes.map((route) => buildRouteCard(route, this.clientsByRoute.get(route.id_route) ?? [])));
			this.dayFailed.set(false);
		} catch (error) {
			this.dayFailed.set(true);
			await this.apiAlert.handleError(error, 'No se pudieron cargar las rutas del día');
		} finally {
			this.dayLoading.set(false);
		}
	}

	private async loadWeek(): Promise<void> {
		this.weekLoading.set(true);
		try {
			const routes = await firstValueFrom(this.routes.getCards(true));
			await this.loadClients(routes.map((route) => route.id_route));
			this.weekCards.set(routes.map((route) => buildWeekRouteCard(route, this.clientsByRoute.get(route.id_route) ?? [])));
			this.weekFailed.set(false);
			this.weekLoaded = true;
		} catch (error) {
			this.weekFailed.set(true);
			await this.apiAlert.handleError(error, 'No se pudieron cargar las rutas de la semana');
		} finally {
			this.weekLoading.set(false);
		}
	}

	// Pide en paralelo los clientes de las rutas que aún no se tienen
	private async loadClients(routeIds: number[]): Promise<void> {
		const missing = [...new Set(routeIds)].filter((id) => !this.clientsByRoute.has(id));
		const clients = await firstValueFrom(
			missing.length ? forkJoin(missing.map((id) => this.routes.getClients(id))) : of([])
		);
		missing.forEach((id, index) => this.clientsByRoute.set(id, clients[index] ?? []));
	}

	protected retry(): void {
		if (this.tab() === 'day') void this.loadDay();
		else void this.loadWeek();
	}

	// ----- Interacción -----
	protected changeTab(id: string): void {
		this.tab.set(id as RoutesTab);
		if (id === 'week' && !this.weekLoaded && !this.weekLoading()) void this.loadWeek();
	}

	protected clearFilters(): void {
		this.search.set('');
		this.zone.set('');
		this.status.set('');
		this.day.set('');
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
