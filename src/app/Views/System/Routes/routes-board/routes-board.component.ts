// ==================================================
// Vista: Rutas constantes
// ==================================================
// Dos pestañas:
//   - Rutas del día: las rutas que salen hoy (GET /orders/routes-of-day), con su estado
//     y acciones. Una ruta está "Por agregar" hasta que se generan sus pedidos del día
//     con "Vista principal" (<app-route-orders-modal>); entonces pasa a "Agregado" y sus
//     pedidos aparecen en el tablero de despachos (la vista principal).
//   - Rutas de la semana: todas las rutas activas (GET /routes/cards?only_active=true)
//     en un tablero con una columna por día (lunes a domingo) y cards compactas, solo
//     informativas. Se carga la primera vez que se abre la pestaña. Tiene su propio
//     filtro por día: con un día elegido, su columna ocupa todo el ancho.
// Las dos listas ya traen los nombres y zonas de los clientes de cada ruta; la lista
// completa de clientes (teléfono, dirección…) la pide el modal de detalle al abrirse.
// Buscar y filtrar se hace en el cliente (ver route-board.utils).
// Crear, editar y eliminar rutas es del panel de administración: aquí el gestor solo
// agrega los pedidos de las rutas del día al tablero de despachos.

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { EmptyStateComponent } from '@components/Shared/empty-state/empty-state.component';
import { FilterSelectComponent } from '@components/Shared/filter-select/filter-select.component';
import { SearchInputComponent } from '@components/Shared/search-input/search-input.component';
import { SkeletonComponent } from '@components/Shared/skeleton/skeleton.component';
import { TabItem, TabsComponent } from '@components/Shared/tabs/tabs.component';
import { RouteCardComponent } from '@components/System/Routes/route-card/route-card.component';
import { RouteDetailModalComponent } from '@components/System/Routes/route-detail-modal/route-detail-modal.component';
import { RouteOrdersModalComponent } from '@components/System/Routes/route-orders-modal/route-orders-modal.component';
import { RouteWeekCardComponent } from '@components/System/Routes/route-week-card/route-week-card.component';
import { RouteOrdersCreated } from '@core/Models/CoreModule/order.model';
import { ApiAlertService } from '@core/Service/Alerts/api-alert.service';
import { OrderService } from '@core/Service/CoreModule/order.service';
import { RouteService } from '@core/Service/ParametersModule/route.service';
import { isoWeekdayBogota } from '@core/Utils/date.utils';
import {
	buildRouteCard,
	buildWeekRouteCard,
	filterRoutes,
	groupRoutesByDay,
	markRouteAdded,
	RouteCardInfo,
	RouteDayCard,
	RouteFilters,
	routeStatusOptions,
	RouteWeekCard,
	routeZoneOptions,
	sortDayCards,
	weekDayOptions,
} from '@core/Utils/route-board.utils';

type RoutesTab = 'day' | 'week';

@Component({
	selector: 'app-routes-board',
	imports: [
		NgTemplateOutlet,
		EmptyStateComponent,
		FilterSelectComponent,
		SearchInputComponent,
		SkeletonComponent,
		TabsComponent,
		RouteCardComponent,
		RouteDetailModalComponent,
		RouteOrdersModalComponent,
		RouteWeekCardComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './routes-board.component.html',
})
export class RoutesBoardComponent {
	private readonly orders = inject(OrderService);
	private readonly routes = inject(RouteService);
	private readonly apiAlert = inject(ApiAlertService);

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

	// ----- Filtros -----
	protected readonly search = signal('');
	protected readonly zone = signal('');
	protected readonly status = signal(''); // solo aplica a Rutas del día
	protected readonly day = signal(''); // solo aplica a Rutas de la semana: '1' (lunes) … '7' (domingo)
	protected readonly selected = signal<RouteCardInfo | null>(null); // modal de detalle (día o semana)
	protected readonly ordersCard = signal<RouteDayCard | null>(null); // modal "Vista principal"

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

	// Las ya agregadas quedan al final: lo pendiente siempre está primero
	protected readonly visibleDayCards = computed(() => sortDayCards(filterRoutes(this.dayCards(), this.filters())));
	protected readonly weekDays = computed(() => groupRoutesByDay(filterRoutes(this.weekCards(), this.filters()), this.day()));
	protected readonly weekHasResults = computed(() => this.weekDays().some((day) => day.cards.length > 0));
	protected readonly singleDay = computed(() => this.day() !== '');
	protected readonly today = isoWeekdayBogota();
	protected readonly skeletonCards = [0, 1, 2, 3, 4, 5];
	protected readonly weekSkeletonColumns = [0, 1, 2, 3, 4, 5, 6];

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
			this.dayCards.set(routes.map(buildRouteCard));
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
			this.weekCards.set(routes.map(buildWeekRouteCard));
			this.weekFailed.set(false);
			this.weekLoaded = true;
		} catch (error) {
			this.weekFailed.set(true);
			await this.apiAlert.handleError(error, 'No se pudieron cargar las rutas de la semana');
		} finally {
			this.weekLoading.set(false);
		}
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

	protected openDetail(card: RouteCardInfo): void {
		this.selected.set(card);
	}

	// "Vista principal": abre el formulario para generar los pedidos de la ruta
	protected addToMain(card: RouteDayCard): void {
		this.ordersCard.set(card);
	}

	// Pedidos creados: la card pasa a "Agregado" sin recargar toda la pestaña
	protected onOrdersCreated(result: RouteOrdersCreated): void {
		this.dayCards.update((cards) => markRouteAdded(cards, result.id_route, result.created));
		this.ordersCard.set(null);
	}

	// Otro gestor ya agregó la ruta: se recarga el estado real de las rutas del día
	protected onOrdersOutdated(): void {
		this.ordersCard.set(null);
		void this.loadDay();
	}
}
