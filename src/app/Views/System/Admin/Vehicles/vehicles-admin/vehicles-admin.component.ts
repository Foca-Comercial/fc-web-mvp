// ==================================================
// Vista: Administración · Vehículos
// ==================================================
// - Listado paginado en la API (GET /vehicles/admin) con ServerTable: búsqueda por nombre
//   y filtro de estado (activos por defecto). Cada fila trae cuántas asignaciones activas
//   (domiciliario + código) usan el vehículo.
// - Crear y editar el nombre en un modal (<app-vehicle-form>).
// - Desactivar / reactivar: desactivar oculta todas sus asignaciones del selector de
//   domiciliarios del pedido; la confirmación dice cuántas.

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
import { VehicleFormComponent } from '@components/System/Admin/vehicle-form/vehicle-form.component';
import { VehicleAdminFilters, VehicleAdminRow } from '@core/Models/ParametersModule/parameters.model';
import { AlertService } from '@core/Service/Alerts/alert.service';
import { ApiAlertService } from '@core/Service/Alerts/api-alert.service';
import { VehicleService } from '@core/Service/ParametersModule/vehicle.service';
import { ServerTable } from '@core/State/server-table.state';
import { STATUS_FILTER_OPTIONS, activeToOption, optionToActive } from '@core/Utils/admin-filters.utils';
import { DEFAULT_VEHICLE_FILTERS, assignmentsText, hasCustomVehicleFilters } from '@core/Utils/admin-vehicles.utils';
import { escapeHtml } from '@core/Utils/html.utils';
import { PAGE_SIZE_OPTIONS } from '@core/Utils/order-board.utils';

@Component({
	selector: 'app-vehicles-admin',
	imports: [
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
		VehicleFormComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './vehicles-admin.component.html',
})
export class VehiclesAdminComponent {
	private readonly vehicles = inject(VehicleService);
	private readonly apiAlert = inject(ApiAlertService);
	private readonly alert = inject(AlertService);

	// ----- Listado (paginado en la API) -----
	protected readonly table = new ServerTable<VehicleAdminFilters, VehicleAdminRow>({
		load: (query) => this.vehicles.getAdminPage(query),
		filters: DEFAULT_VEHICLE_FILTERS,
		errorTitle: 'No se pudieron cargar los vehículos',
	});
	protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
	protected readonly columnCount = 5;

	// ----- Filtros -----
	protected readonly statusOptions = STATUS_FILTER_OPTIONS;
	protected readonly statusValue = computed(() => activeToOption(this.table.filters().active));
	protected readonly filtered = computed(() => hasCustomVehicleFilters(this.table.filters()));

	// ----- Formulario (crear / editar) -----
	protected readonly formOpen = signal(false);
	protected readonly editing = signal<VehicleAdminRow | null>(null);
	protected readonly formTitle = computed(() => (this.editing() ? 'Editar vehículo' : 'Nuevo vehículo'));

	protected readonly assignmentsText = assignmentsText;

	protected setSearch(value: string): void {
		this.table.setFilter('search', value);
	}

	protected setStatus(value: string): void {
		this.table.setFilter('active', optionToActive(value));
	}

	protected clearFilters(): void {
		this.table.resetFilters();
	}

	protected newVehicle(): void {
		this.editing.set(null);
		this.formOpen.set(true);
	}

	protected edit(vehicle: VehicleAdminRow): void {
		this.editing.set(vehicle);
		this.formOpen.set(true);
	}

	protected onSaved(vehicle: VehicleAdminRow): void {
		const created = this.editing() === null;
		this.formOpen.set(false);
		this.alert.toast(created ? `Vehículo ${vehicle.name} creado` : 'Cambios guardados');
		this.table.reload();
	}

	// ----- Desactivar / reactivar -----
	protected async setActive(vehicle: VehicleAdminRow, active: boolean): Promise<void> {
		const name = `<strong>${escapeHtml(vehicle.name)}</strong>`;
		const count = vehicle.assignments_count;
		const affected =
			count === 0
				? 'No tiene asignaciones activas.'
				: `${count === 1 ? 'Su asignación activa deja' : `Sus <strong>${count}</strong> asignaciones activas dejan`} de ofrecerse al asignar pedidos.`;
		const result = await this.apiAlert.confirmAndRun(
			active
				? {
						title: '¿Reactivar el vehículo?',
						html: `${name} y sus asignaciones activas vuelven a ofrecerse al asignar pedidos.`,
						icon: 'question',
						confirmText: 'Sí, reactivar',
					}
				: {
						title: '¿Desactivar el vehículo?',
						html: `${name}: ${affected} Los pedidos que ya las tienen las conservan y lo puedes reactivar cuando quieras.`,
						icon: 'warning',
						confirmText: 'Sí, desactivar',
						danger: true,
					},
			() => this.vehicles.updateAdmin(vehicle.id_vehicle, { active }),
			{
				successToast: active ? 'Vehículo reactivado' : 'Vehículo desactivado',
				errorTitle: active ? 'No se pudo reactivar el vehículo' : 'No se pudo desactivar el vehículo',
			}
		);
		if (result.ok) this.table.reload();
	}
}
