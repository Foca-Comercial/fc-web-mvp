// ==================================================
// Vista: Administración · Productos
// ==================================================
// - Listado paginado en la API (GET /products/admin) con ServerTable: búsqueda por
//   código o nombre y filtro de estado (activos por defecto).
// - Crear y editar en un modal (<app-product-form>). El código no cambia si el producto
//   ya tiene pedidos.
// - Desactivar / reactivar: PATCH { active }. Un producto desactivado deja de ofrecerse
//   al tomar pedidos y en las rutas; los pedidos ya tomados lo conservan. No hay borrado
//   físico.

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
import { ProductFormComponent } from '@components/System/Admin/product-form/product-form.component';
import { ProductAdminFilters, ProductAdminRow } from '@core/Models/CoreModule/catalog.model';
import { CopCurrencyPipe } from '@core/Pipes/cop-currency.pipe';
import { AlertService } from '@core/Service/Alerts/alert.service';
import { ApiAlertService } from '@core/Service/Alerts/api-alert.service';
import { ProductService } from '@core/Service/CoreModule/product.service';
import { ServerTable } from '@core/State/server-table.state';
import { STATUS_FILTER_OPTIONS, activeToOption, optionToActive } from '@core/Utils/admin-filters.utils';
import { DEFAULT_PRODUCT_FILTERS, hasCustomProductFilters, specialPricesText } from '@core/Utils/admin-products.utils';
import { escapeHtml } from '@core/Utils/html.utils';
import { PAGE_SIZE_OPTIONS } from '@core/Utils/order-board.utils';

@Component({
	selector: 'app-products-admin',
	imports: [
		CopCurrencyPipe,
		DataTableComponent,
		EmptyStateComponent,
		FilterSelectComponent,
		IconButtonComponent,
		IconComponent,
		ModalComponent,
		PageSizeSelectComponent,
		PaginationComponent,
		ProductFormComponent,
		SearchInputComponent,
		StatusBadgeComponent,
		TableSkeletonComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './products-admin.component.html',
})
export class ProductsAdminComponent {
	private readonly products = inject(ProductService);
	private readonly apiAlert = inject(ApiAlertService);
	private readonly alert = inject(AlertService);

	// ----- Listado (paginado en la API) -----
	protected readonly table = new ServerTable<ProductAdminFilters, ProductAdminRow>({
		load: (query) => this.products.getAdminPage(query),
		filters: DEFAULT_PRODUCT_FILTERS,
		errorTitle: 'No se pudieron cargar los productos',
	});
	protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
	protected readonly columnCount = 7;

	// ----- Filtros -----
	protected readonly statusOptions = STATUS_FILTER_OPTIONS;
	protected readonly statusValue = computed(() => activeToOption(this.table.filters().active));
	protected readonly filtered = computed(() => hasCustomProductFilters(this.table.filters()));

	// ----- Formulario (crear / editar) -----
	protected readonly formOpen = signal(false);
	protected readonly editing = signal<ProductAdminRow | null>(null);
	protected readonly formTitle = computed(() => (this.editing() ? 'Editar producto' : 'Nuevo producto'));

	protected readonly specialPricesText = specialPricesText;

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
	protected newProduct(): void {
		this.editing.set(null);
		this.formOpen.set(true);
	}

	protected edit(product: ProductAdminRow): void {
		this.editing.set(product);
		this.formOpen.set(true);
	}

	protected onSaved(product: ProductAdminRow): void {
		const created = this.editing() === null;
		this.formOpen.set(false);
		this.alert.toast(created ? `Producto ${product.code} creado` : 'Cambios guardados');
		this.table.reload();
	}

	// ----- Desactivar / reactivar -----
	protected async setActive(product: ProductAdminRow, active: boolean): Promise<void> {
		const name = `<strong>${escapeHtml(`${product.code} · ${product.name}`)}</strong>`;
		const result = await this.apiAlert.confirmAndRun(
			active
				? {
						title: '¿Reactivar el producto?',
						html: `${name} vuelve a ofrecerse al tomar pedidos y en las rutas.`,
						icon: 'question',
						confirmText: 'Sí, reactivar',
					}
				: {
						title: '¿Desactivar el producto?',
						html: `${name} deja de ofrecerse al tomar pedidos y en las rutas. Los pedidos ya tomados lo conservan y lo puedes reactivar cuando quieras.`,
						icon: 'warning',
						confirmText: 'Sí, desactivar',
						danger: true,
					},
			() => this.products.updateAdmin(product.id_product, { active }),
			{
				successToast: active ? 'Producto reactivado' : 'Producto desactivado',
				errorTitle: active ? 'No se pudo reactivar el producto' : 'No se pudo desactivar el producto',
			}
		);
		if (result.ok) this.table.reload();
	}
}
