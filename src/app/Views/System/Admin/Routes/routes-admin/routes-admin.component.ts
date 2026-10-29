// ==================================================
// Vista: Administración · Rutas
// ==================================================
// Rutas constantes: salen ciertos días de la semana a una hora, con sus clientes. El
// GESTOR_COMERCIAL genera desde «Rutas del día» los pedidos de las rutas activas; aquí
// el ADMINISTRADOR las crea, edita, desactiva y les asigna clientes.
//
// - Listado paginado en la API (GET /routes/admin) con ServerTable: búsqueda por nombre,
//   filtro de día de la semana y de estado (activas por defecto).
// - Crear y editar en un modal (<app-route-form>): nombre, días y hora de salida.
// - Clientes de la ruta en otro modal (<app-route-clients>).
// - Desactivar / reactivar: una ruta inactiva no aparece en «Rutas del día»; sus
//   pedidos conservan la ruta. No hay borrado físico.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { DataTableComponent } from '@components/Shared/data-table/data-table.component';
import { EmptyStateComponent } from '@components/Shared/empty-state/empty-state.component';
import { FilterSelectComponent } from '@components/Shared/filter-select/filter-select.component';
import { IconButtonComponent } from '@components/Shared/icon-button/icon-button.component';
import { IconComponent } from '@components/Shared/icon/icon.component';
import { ModalComponent } from '@components/Shared/modal/modal.component';
import { PageSizeSelectComponent } from '@components/Shared/page-size-select/page-size-select.component';
import { PaginationComponent } from '@components/Shared/pagination/pagination.component';
import { SearchInputComponent } from '@components/Shared/search-input/search-input.component';
import { TableSkeletonComponent } from '@components/Shared/skeleton/table-skeleton.component';
import { StatusBadgeComponent } from '@components/Shared/status-badge/status-badge.component';
import { RouteClientsComponent } from '@components/System/Admin/route-clients/route-clients.component';
import { RouteFormComponent } from '@components/System/Admin/route-form/route-form.component';
import { Route, RouteAdminFilters, RouteAdminRow } from '@core/Models/ParametersModule/parameters.model';
import { ApiTimePipe } from '@core/Pipes/api-time.pipe';
import { DaysWeekPipe } from '@core/Pipes/days-week.pipe';
import { AlertService } from '@core/Service/Alerts/alert.service';
import { ApiAlertService } from '@core/Service/Alerts/api-alert.service';
import { RouteService } from '@core/Service/ParametersModule/route.service';
import { ServerTable } from '@core/State/server-table.state';
import { STATUS_FILTER_OPTIONS, activeToOption, idToOption, optionToActive, optionToId } from '@core/Utils/admin-filters.utils';
import { DEFAULT_ROUTE_FILTERS, clientsCountText, dayFilterOptions, hasCustomRouteFilters } from '@core/Utils/admin-routes.utils';
import { escapeHtml } from '@core/Utils/html.utils';
import { PAGE_SIZE_OPTIONS } from '@core/Utils/order-board.utils';

@Component({
	selector: 'app-routes-admin',
	imports: [
		ApiTimePipe,
		DataTableComponent,
		DaysWeekPipe,
		EmptyStateComponent,
		FilterSelectComponent,
		IconButtonComponent,
		IconComponent,
		ModalComponent,
		PageSizeSelectComponent,
		PaginationComponent,
		RouteClientsComponent,
		RouteFormComponent,
		SearchInputComponent,
		StatusBadgeComponent,
		TableSkeletonComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './routes-admin.component.html',
})
export class RoutesAdminComponent {
	private readonly routes = inject(RouteService);
	private readonly apiAlert = inject(ApiAlertService);
	private readonly alert = inject(AlertService);

	// ----- Listado (paginado en la API) -----
	protected readonly table = new ServerTable<RouteAdminFilters, RouteAdminRow>({
		load: (query) => this.routes.getAdminPage(query),
		filters: DEFAULT_ROUTE_FILTERS,
		errorTitle: 'No se pudieron cargar las rutas',
	});
	protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
	protected readonly columnCount = 7;

	// ----- Filtros -----
	protected readonly statusOptions = STATUS_FILTER_OPTIONS;
	protected readonly dayOptions = dayFilterOptions();
	protected readonly statusValue = computed(() => activeToOption(this.table.filters().active));
	protected readonly dayValue = computed(() => idToOption(this.table.filters().day));
	protected readonly filtered = computed(() => hasCustomRouteFilters(this.table.filters()));

	// ----- Formulario (crear / editar) -----
	protected readonly formOpen = signal(false);
	protected readonly editing = signal<RouteAdminRow | null>(null);
	protected readonly formTitle = computed(() => (this.editing() ? 'Editar ruta' : 'Nueva ruta'));

	// ----- Clientes de la ruta -----
	protected readonly clientsOpen = signal(false);
	protected readonly clientsRoute = signal<RouteAdminRow | null>(null);
	protected readonly clientsTitle = computed(() => `Clientes · ${this.clientsRoute()?.name ?? ''}`);

	protected readonly clientsCountText = clientsCountText;

	protected setSearch(value: string): void {
		this.table.setFilter('search', value);
	}

	protected setStatus(value: string): void {
		this.table.setFilter('active', optionToActive(value));
	}

	protected setDay(value: string): void {
		this.table.setFilter('day', optionToId(value));
	}

	protected clearFilters(): void {
		this.table.resetFilters();
	}

	// ----- Crear / editar -----
	protected newRoute(): void {
		this.editing.set(null);
		this.formOpen.set(true);
	}

	protected edit(route: RouteAdminRow): void {
		this.editing.set(route);
		this.formOpen.set(true);
	}

	protected onSaved(route: Route): void {
		const created = this.editing() === null;
		this.formOpen.set(false);
		this.table.reload();
		if (created) {
			// Recién creada no tiene clientes: se abren para agregarlos
			this.alert.toast(`Ruta ${route.name} creada`);
			this.openClients({ ...route, clients_count: 0 });
		} else {
			this.alert.toast('Cambios guardados');
		}
	}

	// ----- Clientes -----
	protected openClients(route: RouteAdminRow): void {
		this.clientsRoute.set(route);
		this.clientsOpen.set(true);
	}

	// ----- Desactivar / reactivar -----
	protected async setActive(route: RouteAdminRow, active: boolean): Promise<void> {
		const name = `<strong>${escapeHtml(route.name)}</strong>`;
		const result = await this.apiAlert.confirmAndRun(
			active
				? {
						title: '¿Reactivar la ruta?',
						html: `${name} vuelve a aparecer en «Rutas del día» los días en que sale.`,
						icon: 'question',
						confirmText: 'Sí, reactivar',
					}
				: {
						title: '¿Desactivar la ruta?',
						html: `${name} deja de aparecer en «Rutas del día»: ya no se generan pedidos desde ella. Sus pedidos y clientes se conservan y la puedes reactivar cuando quieras.`,
						icon: 'warning',
						confirmText: 'Sí, desactivar',
						danger: true,
					},
			() => this.routes.update(route.id_route, { active }),
			{
				successToast: active ? 'Ruta reactivada' : 'Ruta desactivada',
				errorTitle: active ? 'No se pudo reactivar la ruta' : 'No se pudo desactivar la ruta',
			}
		);
		if (result.ok) this.table.reload();
	}
}
