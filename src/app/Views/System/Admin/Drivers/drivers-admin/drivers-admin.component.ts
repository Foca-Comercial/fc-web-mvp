// ==================================================
// Vista: Administración · Domiciliarios
// ==================================================
// Domiciliarios = usuarios con rol VENDEDOR. Cada uno tiene una asignación por vehículo
// que maneja, con su propio código de vendedor (el que ve Siigo y el selector del pedido).
//
// - Listado paginado en la API (GET /drivers/admin) con ServerTable: búsqueda por nombre
//   o código y filtro de estado (activos por defecto).
// - Crear y editar los datos de la persona en un modal (<app-driver-form>). Al crear, la
//   API arma el usuario con la contraseña inicial y el rol VENDEDOR.
// - Asignaciones (vehículo + código) en otro modal (<app-driver-assignments>).
// - Desactivar / reactivar: sus asignaciones dejan de ofrecerse al asignar pedidos. Un
//   domiciliario protegido (con otro rol o vendedor por defecto) no se desactiva aquí.

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
import { DriverAssignmentsComponent } from '@components/System/Admin/driver-assignments/driver-assignments.component';
import { DriverFormComponent } from '@components/System/Admin/driver-form/driver-form.component';
import { DriverAdminFilters, DriverAdminRow } from '@core/Models/CoreModule/driver.model';
import { AlertService } from '@core/Service/Alerts/alert.service';
import { ApiAlertService } from '@core/Service/Alerts/api-alert.service';
import { DriverService } from '@core/Service/CoreModule/driver.service';
import { ServerTable } from '@core/State/server-table.state';
import { DEFAULT_DRIVER_FILTERS, driverFullName, hasCustomDriverFilters } from '@core/Utils/admin-drivers.utils';
import { STATUS_FILTER_OPTIONS, activeToOption, optionToActive } from '@core/Utils/admin-filters.utils';
import { escapeHtml } from '@core/Utils/html.utils';
import { PAGE_SIZE_OPTIONS } from '@core/Utils/order-board.utils';

@Component({
	selector: 'app-drivers-admin',
	imports: [
		DataTableComponent,
		DriverAssignmentsComponent,
		DriverFormComponent,
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
	templateUrl: './drivers-admin.component.html',
})
export class DriversAdminComponent {
	private readonly drivers = inject(DriverService);
	private readonly apiAlert = inject(ApiAlertService);
	private readonly alert = inject(AlertService);

	// ----- Listado (paginado en la API) -----
	protected readonly table = new ServerTable<DriverAdminFilters, DriverAdminRow>({
		load: (query) => this.drivers.getAdminPage(query),
		filters: DEFAULT_DRIVER_FILTERS,
		errorTitle: 'No se pudieron cargar los domiciliarios',
	});
	protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
	protected readonly columnCount = 6;

	// ----- Filtros -----
	protected readonly statusOptions = STATUS_FILTER_OPTIONS;
	protected readonly statusValue = computed(() => activeToOption(this.table.filters().active));
	protected readonly filtered = computed(() => hasCustomDriverFilters(this.table.filters()));

	// ----- Formulario (crear / editar) -----
	protected readonly formOpen = signal(false);
	protected readonly editing = signal<DriverAdminRow | null>(null);
	protected readonly formTitle = computed(() => (this.editing() ? 'Editar domiciliario' : 'Nuevo domiciliario'));

	// ----- Asignaciones -----
	protected readonly assignmentsOpen = signal(false);
	protected readonly assignmentsDriver = signal<DriverAdminRow | null>(null);
	protected readonly assignmentsTitle = computed(() => {
		const driver = this.assignmentsDriver();
		return `Vehículos y códigos · ${driver ? driverFullName(driver) : ''}`;
	});

	protected readonly fullName = driverFullName;

	protected setSearch(value: string): void {
		this.table.setFilter('search', value);
	}

	protected setStatus(value: string): void {
		this.table.setFilter('active', optionToActive(value));
	}

	protected clearFilters(): void {
		this.table.resetFilters();
	}

	// ----- Crear / editar -----
	protected newDriver(): void {
		this.editing.set(null);
		this.formOpen.set(true);
	}

	protected edit(driver: DriverAdminRow): void {
		this.editing.set(driver);
		this.formOpen.set(true);
	}

	protected onSaved(driver: DriverAdminRow): void {
		const created = this.editing() === null;
		this.formOpen.set(false);
		this.table.reload();
		if (created) {
			// Recién creado no tiene vehículos: se abren sus asignaciones para agregarlos
			this.alert.toast(`Domiciliario creado · usuario ${driver.username}`);
			this.openAssignments(driver);
		} else {
			this.alert.toast('Cambios guardados');
		}
	}

	// ----- Asignaciones -----
	protected openAssignments(driver: DriverAdminRow): void {
		this.assignmentsDriver.set(driver);
		this.assignmentsOpen.set(true);
	}

	// ----- Desactivar / reactivar -----
	protected async setActive(driver: DriverAdminRow, active: boolean): Promise<void> {
		const name = `<strong>${escapeHtml(driverFullName(driver))}</strong>`;
		const result = await this.apiAlert.confirmAndRun(
			active
				? {
						title: '¿Reactivar el domiciliario?',
						html: `${name} y sus asignaciones activas vuelven a ofrecerse al asignar pedidos.`,
						icon: 'question',
						confirmText: 'Sí, reactivar',
					}
				: {
						title: '¿Desactivar el domiciliario?',
						html: `${name} deja de ofrecerse al asignar pedidos, con todos sus vehículos. Sus pedidos y cierres se conservan y lo puedes reactivar cuando quieras.`,
						icon: 'warning',
						confirmText: 'Sí, desactivar',
						danger: true,
					},
			() => this.drivers.update(driver.id_user, { active }),
			{
				successToast: active ? 'Domiciliario reactivado' : 'Domiciliario desactivado',
				errorTitle: active ? 'No se pudo reactivar el domiciliario' : 'No se pudo desactivar el domiciliario',
			}
		);
		if (result.ok) this.table.reload();
	}
}
