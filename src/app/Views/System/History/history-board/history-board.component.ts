// ==================================================
// Vista: Histórico de pedidos
// ==================================================
// Todos los pedidos por día de entrega, paginados en la API (GET /orders/history) con
// ServerTable: cada cambio de filtro, página o tamaño pide solo la página visible.
// Filtros: búsqueda (nombre del cliente o consecutivo exacto), estado, domiciliario y
// rango de fechas (por defecto, del 1 del mes anterior a hoy, igual que la API).
// "Ver" abre el detalle del pedido en modo solo consulta (<app-order-detail-modal readonly>):
// lo que ya quedó cerrado y exportado no se modifica desde aquí.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';

import { DataTableComponent } from '@components/Shared/data-table/data-table.component';
import { EmptyStateComponent } from '@components/Shared/empty-state/empty-state.component';
import { FilterSelectComponent } from '@components/Shared/filter-select/filter-select.component';
import { IconButtonComponent } from '@components/Shared/icon-button/icon-button.component';
import { PageSizeSelectComponent } from '@components/Shared/page-size-select/page-size-select.component';
import { PaginationComponent } from '@components/Shared/pagination/pagination.component';
import { SearchInputComponent } from '@components/Shared/search-input/search-input.component';
import { TableSkeletonComponent } from '@components/Shared/skeleton/table-skeleton.component';
import { StatusBadgeComponent } from '@components/Shared/status-badge/status-badge.component';
import { HistoryDateCardComponent } from '@components/System/History/history-date-card/history-date-card.component';
import { OrderDetailModalComponent } from '@components/System/Orders/order-detail-modal/order-detail-modal.component';
import { OrderHistoryPage, OrderHistoryRow } from '@core/Models/CoreModule/order.model';
import { IsoDate, ORDER_STATE_LABELS } from '@core/Models/Shared/api-types.model';
import { BogotaDatePipe } from '@core/Pipes/bogota-date.pipe';
import { CopCurrencyPipe } from '@core/Pipes/cop-currency.pipe';
import { OrderService } from '@core/Service/CoreModule/order.service';
import { UserVehicleService } from '@core/Service/CoreModule/user-vehicle.service';
import { ServerTable } from '@core/State/server-table.state';
import { idToOption, optionToId } from '@core/Utils/admin-filters.utils';
import { todayBogota } from '@core/Utils/date.utils';
import { formatCop } from '@core/Utils/money.utils';
import { PAGE_SIZE_OPTIONS } from '@core/Utils/order-board.utils';
import {
	HISTORY_STATE_OPTIONS,
	HistoryFilters,
	defaultHistoryFilters,
	driverFilterOptions,
	hasCustomFilters,
	historyStateTone,
	optionToState,
	stateToOption,
	withDateFrom,
	withDateTo,
} from '@core/Utils/order-history.utils';

@Component({
	selector: 'app-history-board',
	imports: [
		DataTableComponent,
		EmptyStateComponent,
		FilterSelectComponent,
		IconButtonComponent,
		PageSizeSelectComponent,
		PaginationComponent,
		SearchInputComponent,
		StatusBadgeComponent,
		TableSkeletonComponent,
		HistoryDateCardComponent,
		OrderDetailModalComponent,
		BogotaDatePipe,
		CopCurrencyPipe,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './history-board.component.html',
})
export class HistoryBoardComponent {
	private readonly orders = inject(OrderService);
	private readonly userVehicles = inject(UserVehicleService);

	private readonly defaults = defaultHistoryFilters(todayBogota());

	// ----- Listado (paginado en la API) -----
	protected readonly table = new ServerTable<HistoryFilters, OrderHistoryRow, OrderHistoryPage>({
		load: (query) => this.orders.getHistory(query),
		filters: this.defaults,
		errorTitle: 'No se pudo cargar el histórico',
	});
	protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
	protected readonly columnCount = 8;

	// ----- Opciones de los filtros -----
	protected readonly stateOptions = HISTORY_STATE_OPTIONS;
	// Si el selector de domiciliarios falla, el filtro queda sin opciones (la tabla sigue)
	protected readonly driverOptions = toSignal(
		this.userVehicles.getDriversDropdown().pipe(
			map((drivers) => driverFilterOptions(drivers)),
			catchError(() => of([]))
		),
		{ initialValue: [] }
	);

	// ----- Valores de los <select> (texto) -----
	protected readonly stateValue = computed(() => stateToOption(this.table.filters().state));
	protected readonly driverValue = computed(() => idToOption(this.table.filters().id_user_vehicle));
	protected readonly filtered = computed(() => hasCustomFilters(this.table.filters(), this.defaults));

	// "Mostrando 1–25 de 120 pedidos" y el total vendido del filtro (la API ya excluye cancelados)
	protected readonly summary = computed(() => {
		const page = this.table.data();
		if (!page || page.total === 0) return '';
		const from = (page.page - 1) * page.page_size + 1;
		const to = Math.min(page.page * page.page_size, page.total);
		return `Mostrando ${from}–${to} de ${page.total} ${page.total === 1 ? 'pedido' : 'pedidos'}`;
	});
	protected readonly totalSales = computed(() => {
		const page = this.table.data();
		return page && page.total > 0 ? formatCop(page.total_sales) : '';
	});

	// ----- Detalle -----
	protected readonly selectedId = signal<number | null>(null);

	protected readonly stateLabels = ORDER_STATE_LABELS;
	protected readonly stateTone = historyStateTone;
	protected readonly dateFormat: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

	// ----- Filtros -----
	protected setSearch(value: string): void {
		this.table.setFilter('search', value);
	}

	protected setState(value: string): void {
		this.table.setFilter('state', optionToState(value));
	}

	protected setDriver(value: string): void {
		this.table.setFilter('id_user_vehicle', optionToId(value));
	}

	protected setDateFrom(value: IsoDate): void {
		this.table.filters.update((filters) => withDateFrom(filters, value));
	}

	protected setDateTo(value: IsoDate): void {
		this.table.filters.update((filters) => withDateTo(filters, value));
	}

	protected clearFilters(): void {
		this.table.resetFilters();
	}

	// ----- Detalle -----
	protected openDetail(row: OrderHistoryRow): void {
		this.selectedId.set(row.id_order);
	}
}
