// ==================================================
// Vista: Administración · Clientes
// ==================================================
// Clientes REGISTRADOS (los que persisten). Los temporales, creados desde un pedido, no
// aparecen: los borra la purga mensual.
//
// - Listado paginado en la API (GET /clients/admin) con ServerTable: búsqueda por nombre
//   o teléfono, filtro de zona y de estado (activos por defecto).
// - Crear y editar en un modal (<app-client-form>).
// - Desactivar / reactivar: PATCH { active }. Un cliente desactivado deja de aparecer al
//   tomar pedidos y en las rutas; su historial se conserva. No hay borrado físico.
// - Precios especiales del cliente en otro modal (<app-client-prices>); cada cambio
//   recarga la tabla para refrescar su conteo.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';

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
import { ClientFormComponent } from '@components/System/Admin/client-form/client-form.component';
import { ClientPricesComponent } from '@components/System/Admin/client-prices/client-prices.component';
import { ClientAdminFilters, ClientAdminRow } from '@core/Models/CoreModule/catalog.model';
import { ApiAlertService } from '@core/Service/Alerts/api-alert.service';
import { AlertService } from '@core/Service/Alerts/alert.service';
import { ClientService } from '@core/Service/CoreModule/client.service';
import { NeighborhoodService } from '@core/Service/ParametersModule/neighborhood.service';
import { ServerTable } from '@core/State/server-table.state';
import {
	CLIENT_STATUS_OPTIONS,
	DEFAULT_CLIENT_FILTERS,
	activeToOption,
	clientLinksSummary,
	hasCustomFilters,
	optionToActive,
	optionToZone,
	zoneFilterOptions,
	zoneToOption,
} from '@core/Utils/admin-clients.utils';
import { escapeHtml } from '@core/Utils/html.utils';
import { sortNeighborhoods } from '@core/Utils/new-order.utils';
import { PAGE_SIZE_OPTIONS } from '@core/Utils/order-board.utils';

@Component({
	selector: 'app-clients-admin',
	imports: [
		ClientFormComponent,
		ClientPricesComponent,
		DataTableComponent,
		EmptyStateComponent,
		FilterSelectComponent,
		IconButtonComponent,
		IconComponent,
		ModalComponent,
		PageSizeSelectComponent,
		PaginationComponent,
		SearchInputComponent,
		StatusBadgeComponent,
		TableSkeletonComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './clients-admin.component.html',
})
export class ClientsAdminComponent {
	private readonly clients = inject(ClientService);
	private readonly neighborhoodService = inject(NeighborhoodService);
	private readonly apiAlert = inject(ApiAlertService);
	private readonly alert = inject(AlertService);

	// ----- Listado (paginado en la API) -----
	protected readonly table = new ServerTable<ClientAdminFilters, ClientAdminRow>({
		load: (query) => this.clients.getAdminPage(query),
		filters: DEFAULT_CLIENT_FILTERS,
		errorTitle: 'No se pudieron cargar los clientes',
	});
	protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
	protected readonly columnCount = 7;

	// ----- Barrios: una sola carga para el filtro de zona y el formulario -----
	// undefined = cargando, null = no se pudo cargar
	protected readonly neighborhoods = toSignal(
		this.neighborhoodService.getDropdown().pipe(
			map((list) => sortNeighborhoods(list)),
			catchError(() => of(null))
		),
		{ initialValue: undefined }
	);
	protected readonly zoneOptions = computed(() => zoneFilterOptions(this.neighborhoods() ?? []));

	// ----- Filtros (texto para los <select>) -----
	protected readonly statusOptions = CLIENT_STATUS_OPTIONS;
	protected readonly statusValue = computed(() => activeToOption(this.table.filters().active));
	protected readonly zoneValue = computed(() => zoneToOption(this.table.filters().id_zone));
	protected readonly filtered = computed(() => hasCustomFilters(this.table.filters()));

	// ----- Formulario (crear / editar) -----
	protected readonly formOpen = signal(false);
	protected readonly editing = signal<ClientAdminRow | null>(null);
	protected readonly formTitle = computed(() => (this.editing() ? 'Editar cliente' : 'Nuevo cliente'));

	// ----- Precios especiales -----
	protected readonly pricesOpen = signal(false);
	protected readonly pricesClient = signal<ClientAdminRow | null>(null);
	protected readonly pricesTitle = computed(() => `Precios especiales · ${this.pricesClient()?.name ?? ''}`);

	protected readonly linksSummary = clientLinksSummary;

	// ----- Filtros -----
	protected setSearch(value: string): void {
		this.table.setFilter('search', value);
	}

	protected setStatus(value: string): void {
		this.table.setFilter('active', optionToActive(value));
	}

	protected setZone(value: string): void {
		this.table.setFilter('id_zone', optionToZone(value));
	}

	protected clearFilters(): void {
		this.table.resetFilters();
	}

	// ----- Crear / editar -----
	protected newClient(): void {
		this.editing.set(null);
		this.formOpen.set(true);
	}

	protected edit(client: ClientAdminRow): void {
		this.editing.set(client);
		this.formOpen.set(true);
	}

	protected onSaved(client: ClientAdminRow): void {
		const created = this.editing() === null;
		this.formOpen.set(false);
		this.alert.toast(created ? `Cliente ${client.name} creado` : 'Cambios guardados');
		this.table.reload();
	}

	// ----- Precios especiales -----
	protected openPrices(client: ClientAdminRow): void {
		this.pricesClient.set(client);
		this.pricesOpen.set(true);
	}

	// ----- Desactivar / reactivar -----
	protected async setActive(client: ClientAdminRow, active: boolean): Promise<void> {
		const name = `<strong>${escapeHtml(client.name)}</strong>`;
		const result = await this.apiAlert.confirmAndRun(
			active
				? {
						title: '¿Reactivar el cliente?',
						html: `${name} vuelve a aparecer al tomar pedidos y en sus rutas.`,
						icon: 'question',
						confirmText: 'Sí, reactivar',
					}
				: {
						title: '¿Desactivar el cliente?',
						html: `${name} deja de aparecer al tomar pedidos y en las rutas. Sus pedidos anteriores se conservan y lo puedes reactivar cuando quieras.`,
						icon: 'warning',
						confirmText: 'Sí, desactivar',
						danger: true,
					},
			() => this.clients.updateAdmin(client.id_client, { active }),
			{
				successToast: active ? 'Cliente reactivado' : 'Cliente desactivado',
				errorTitle: active ? 'No se pudo reactivar el cliente' : 'No se pudo desactivar el cliente',
			}
		);
		if (result.ok) this.table.reload();
	}
}
