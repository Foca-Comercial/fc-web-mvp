// ==================================================
// Vista: Tablero de despachos
// ==================================================
// Pedidos del día en dos pestañas (pendientes / despachados). La API entrega el día
// completo sin paginar, así que la búsqueda, los filtros y la paginación se hacen aquí
// (ver order-board.utils). Se refresca solo cada minuto, sin molestar con alertas.
//
// Acciones por fila (ver reglas en order-actions.utils):
//   - Pendiente: ver detalle, o despachar → pasa a la pestaña de despachados y ofrece
//     imprimir el comprobante de despacho (CD).
//   - Despachado: ver detalle, o marcar como entregado.
//   - Entregado / cancelado: solo ver detalle.
// Asignar o cambiar el domiciliario y reimprimir el CD se hacen dentro del detalle.
// "Nuevo pedido" abre el formulario de registro (cliente existente o nuevo). Editar los
// productos y la hora de un pendiente se hace dentro del detalle.

import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { forkJoin, firstValueFrom } from 'rxjs';

import { DataTableComponent } from '@components/Shared/data-table/data-table.component';
import { EmptyStateComponent } from '@components/Shared/empty-state/empty-state.component';
import { FilterSelectComponent } from '@components/Shared/filter-select/filter-select.component';
import { IconButtonComponent } from '@components/Shared/icon-button/icon-button.component';
import { IconComponent } from '@components/Shared/icon/icon.component';
import { PageSizeSelectComponent } from '@components/Shared/page-size-select/page-size-select.component';
import { PaginationComponent } from '@components/Shared/pagination/pagination.component';
import { SearchInputComponent } from '@components/Shared/search-input/search-input.component';
import { TableSkeletonComponent } from '@components/Shared/skeleton/table-skeleton.component';
import { TabItem, TabsComponent } from '@components/Shared/tabs/tabs.component';
import { NewOrderModalComponent } from '@components/System/Orders/new-order-modal/new-order-modal.component';
import { OrderDetailModalComponent } from '@components/System/Orders/order-detail-modal/order-detail-modal.component';
import { OrderStatusBadgeComponent } from '@components/System/Orders/order-status-badge/order-status-badge.component';
import { OrderSummary, OrderWithDetails } from '@core/Models/CoreModule/order.model';
import { OrderState } from '@core/Models/Shared/api-types.model';
import { ApiTimePipe } from '@core/Pipes/api-time.pipe';
import { BogotaDatePipe } from '@core/Pipes/bogota-date.pipe';
import { AlertService } from '@core/Service/Alerts/alert.service';
import { ApiAlertService } from '@core/Service/Alerts/api-alert.service';
import { ClockService } from '@core/Service/Clock/clock.service';
import { OrderReceiptService } from '@core/Service/CoreModule/order-receipt.service';
import { OrderService } from '@core/Service/CoreModule/order.service';
import { orderCapabilities } from '@core/Utils/order-actions.utils';
import {
	BOARD_PAGE_SIZE,
	PAGE_SIZE_OPTIONS,
	BoardFilters,
	BoardSort,
	SortKey,
	DISPATCHED_TAB_STATUSES,
	PENDING_TAB_STATUSES,
	driverOptions,
	filterOrders,
	nextSort,
	paginate,
	sortOrders,
	statusOptions,
	totalPages,
	zoneOptions,
} from '@core/Utils/order-board.utils';

type BoardTab = 'pending' | 'dispatched';
// 'change' = recarga tras una acción del usuario: sin alertas como 'silent', pero nunca se descarta
type LoadMode = 'initial' | 'manual' | 'silent' | 'change';

// Cada cuánto se vuelve a pedir el tablero sin que el usuario haga nada
const AUTO_REFRESH_MS = 60_000;

@Component({
	selector: 'app-orders-board',
	imports: [
		DataTableComponent,
		EmptyStateComponent,
		FilterSelectComponent,
		IconButtonComponent,
		IconComponent,
		PageSizeSelectComponent,
		PaginationComponent,
		SearchInputComponent,
		TableSkeletonComponent,
		TabsComponent,
		NewOrderModalComponent,
		OrderDetailModalComponent,
		OrderStatusBadgeComponent,
		ApiTimePipe,
		BogotaDatePipe,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { '(document:visibilitychange)': 'onVisibilityChange()' },
	templateUrl: './orders-board.component.html',
})
export class OrdersBoardComponent {
	private readonly orders = inject(OrderService);
	private readonly apiAlert = inject(ApiAlertService);
	private readonly alert = inject(AlertService);
	private readonly receipt = inject(OrderReceiptService);
	protected readonly clock = inject(ClockService);

	// ----- Datos -----
	private readonly pendingRows = signal<OrderSummary[]>([]);
	private readonly dispatchedRows = signal<OrderSummary[]>([]);
	protected readonly loading = signal(true); // solo la primera carga (muestra skeleton)
	protected readonly refreshing = signal(false); // actualización pedida con el botón
	protected readonly loadFailed = signal(false); // la primera carga falló: no hay nada que mostrar
	protected readonly stale = signal(false); // la última actualización falló: se ven datos viejos
	protected readonly lastUpdated = signal<Date | null>(null);
	private inFlight = false;
	private reloadQueued = false; // se pidió recargar mientras otra carga estaba en curso

	// ----- Pestañas y filtros -----
	protected readonly tab = signal<BoardTab>('pending');
	protected readonly search = signal('');
	protected readonly zone = signal('');
	protected readonly status = signal('');
	protected readonly driver = signal('');
	protected readonly sort = signal<BoardSort | null>(null);
	protected readonly pageSize = signal(BOARD_PAGE_SIZE);
	protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
	protected readonly selectedId = signal<number | null>(null);
	protected readonly newOrderOpen = signal(false);

	protected readonly tabs = computed<TabItem[]>(() => [
		{ id: 'pending', label: 'Pedidos pendientes', count: this.pendingRows().length },
		{ id: 'dispatched', label: 'Pedidos despachados', count: this.dispatchedRows().length },
	]);

	private readonly activeRows = computed(() => (this.tab() === 'pending' ? this.pendingRows() : this.dispatchedRows()));
	private readonly filters = computed<BoardFilters>(() => ({
		search: this.search(),
		zone: this.zone(),
		status: this.status(),
		driver: this.driver(),
	}));

	protected readonly zoneOptions = computed(() => zoneOptions(this.activeRows()));
	protected readonly driverOptions = computed(() => driverOptions(this.activeRows()));
	protected readonly statusOptions = computed(() =>
		statusOptions(this.tab() === 'pending' ? PENDING_TAB_STATUSES : DISPATCHED_TAB_STATUSES)
	);
	protected readonly hasFilters = computed(() => Object.values(this.filters()).some(Boolean));

	// Depende de `clock.now()`: el filtro de Estado (Próximo / Retrasado) se reevalúa con el reloj
	private readonly filtered = computed(() => filterOrders(this.activeRows(), this.filters(), this.clock.now()));
	private readonly sorted = computed(() => sortOrders(this.filtered(), this.sort()));
	protected readonly pages = computed(() => totalPages(this.filtered().length, this.pageSize()));

	// Vuelve a la página 1 al cambiar de pestaña o de filtros; si el refresco deja menos
	// páginas que la actual, se queda en la última
	protected readonly page = linkedSignal<{ key: string; pages: number }, number>({
		source: () => ({ key: JSON.stringify([this.tab(), this.filters(), this.sort(), this.pageSize()]), pages: this.pages() }),
		computation: (source, previous) =>
			previous && previous.source.key === source.key ? Math.min(previous.value, source.pages) : 1,
	});

	protected readonly visibleRows = computed(() => paginate(this.sorted(), this.page(), this.pageSize()));
	protected readonly columnCount = 7;
	protected readonly OrderState = OrderState;
	protected readonly orderCapabilities = orderCapabilities;
	protected readonly summary = computed(() => {
		const total = this.filtered().length;
		if (total === 0) return '';
		const from = (this.page() - 1) * this.pageSize() + 1;
		const to = Math.min(this.page() * this.pageSize(), total);
		return `Mostrando ${from}–${to} de ${total} ${total === 1 ? 'pedido' : 'pedidos'}`;
	});

	protected readonly dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
	protected readonly timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

	constructor() {
		void this.load('initial');

		const timer = setInterval(() => {
			if (!document.hidden) void this.load('silent');
		}, AUTO_REFRESH_MS);
		inject(DestroyRef).onDestroy(() => clearInterval(timer));

		// Si tras un refresco la zona o el domiciliario elegidos ya no existen, se limpian:
		// si no, el <select> mostraría "Todas" mientras la tabla sigue filtrada
		effect(() => {
			const zone = this.zone();
			if (zone && !this.zoneOptions().some((option) => option.value === zone)) this.zone.set('');
		});
		effect(() => {
			const driver = this.driver();
			if (driver && !this.driverOptions().some((option) => option.value === driver)) this.driver.set('');
		});
	}

	// ----- Carga -----
	protected refresh(): void {
		void this.load('manual');
	}

	// Al volver a la pestaña del navegador, se actualiza si los datos ya tienen más de un minuto
	protected onVisibilityChange(): void {
		const last = this.lastUpdated();
		if (!document.hidden && last && Date.now() - last.getTime() >= AUTO_REFRESH_MS) void this.load('silent');
	}

	private async load(mode: LoadMode): Promise<void> {
		if (this.inFlight) {
			// Un cambio recién hecho (despachar, entregar…) no puede perderse: se recarga al terminar
			if (mode !== 'silent') this.reloadQueued = true;
			return;
		}
		this.inFlight = true;
		if (mode === 'manual') this.refreshing.set(true);

		try {
			const [pending, dispatched] = await firstValueFrom(
				forkJoin([this.orders.getDashboardSummary(), this.orders.getDispatchedSummary()])
			);
			this.pendingRows.set(pending);
			this.dispatchedRows.set(dispatched);
			this.lastUpdated.set(new Date());
			this.loadFailed.set(false);
			this.stale.set(false);
		} catch (error) {
			if (mode === 'initial') this.loadFailed.set(true);
			else this.stale.set(true);
			if (mode === 'silent' || mode === 'change') return;
			await this.apiAlert.handleError(error, 'No se pudo cargar el tablero');
		} finally {
			this.inFlight = false;
			this.loading.set(false);
			this.refreshing.set(false);
			if (this.reloadQueued) {
				this.reloadQueued = false;
				void this.load('change');
			}
		}
	}

	// ----- Interacción -----
	protected changeTab(id: string): void {
		this.tab.set(id as BoardTab);
		// Los estados cambian de una pestaña a otra
		this.status.set('');
	}

	protected toggleSort(key: SortKey): void {
		this.sort.update((current) => nextSort(current, key));
	}

	protected ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
		const sort = this.sort();
		if (sort?.key !== key) return 'none';
		return sort.direction === 'asc' ? 'ascending' : 'descending';
	}

	protected sortIcon(key: SortKey): 'chevron-up' | 'chevron-down' | 'chevron-up-down' {
		const state = this.ariaSort(key);
		return state === 'ascending' ? 'chevron-up' : state === 'descending' ? 'chevron-down' : 'chevron-up-down';
	}

	protected clearFilters(): void {
		this.search.set('');
		this.zone.set('');
		this.status.set('');
		this.driver.set('');
	}

	protected retry(): void {
		this.loading.set(true);
		void this.load('initial');
	}

	protected openDetail(row: OrderSummary): void {
		this.selectedId.set(row.id_order);
	}

	// El detalle guardó un cambio (p. ej. el domiciliario): la fila de la tabla se actualiza
	protected onDetailChanged(): void {
		void this.load('change');
	}

	// ----- Acciones por fila -----
	// PENDING → DISPATCHED. Se puede despachar sin domiciliario (regla del negocio), pero se
	// avisa porque el CD saldrá con "Sin asignar".
	protected async dispatch(row: OrderSummary): Promise<void> {
		const noDriver = !row.driver_code;
		const result = await this.apiAlert.confirmAndRun(
			{
				title: `¿Despachar el pedido ${row.purchase_order}?`,
				text: noDriver
					? `${row.client_name}. Aún no tiene domiciliario: el comprobante saldrá como «Sin asignar».`
					: `${row.client_name}. Domiciliario: ${row.driver_name}.`,
				icon: noDriver ? 'warning' : 'question',
				confirmText: 'Sí, despachar',
			},
			() => this.orders.dispatch(row.id_order),
			{ loadingTitle: 'Despachando pedido...', errorTitle: 'No se pudo despachar el pedido' }
		);
		if ('cancelled' in result) return;

		// Con error el pedido pudo cambiar de estado por otro lado: se refresca igual
		await this.load('change');
		if (!result.ok) return;

		const print = await this.alert.confirm({
			title: `Pedido ${row.purchase_order} despachado`,
			text: '¿Quieres imprimir el comprobante de despacho (CD)? Después podrás reimprimirlo desde el detalle.',
			icon: 'success',
			confirmText: 'Imprimir CD',
			cancelText: 'Ahora no',
		});
		if (print) await this.printReceipt(row);
	}

	// DISPATCHED → DELIVERED
	protected async deliver(row: OrderSummary): Promise<void> {
		const result = await this.apiAlert.confirmAndRun(
			{
				title: `¿Marcar el pedido ${row.purchase_order} como entregado?`,
				text: row.client_name,
				icon: 'question',
				confirmText: 'Sí, entregado',
			},
			() => this.orders.deliver(row.id_order),
			{
				loadingTitle: 'Registrando entrega...',
				successToast: `Pedido ${row.purchase_order} entregado`,
				errorTitle: 'No se pudo marcar como entregado',
			}
		);
		if ('cancelled' in result) return;
		await this.load('change');
	}

	private async printReceipt(row: OrderSummary): Promise<void> {
		const result = await this.receipt.print(row.id_order);
		if (!result.ok) await this.alert.error('No se pudo abrir el comprobante', result.message);
	}

	protected newOrder(): void {
		this.newOrderOpen.set(true);
	}

	// El pedido nuevo nace PENDING: se pasa a la pestaña de pendientes (limpiando filtros que
	// podrían esconderlo) y se recarga el tablero
	protected onOrderCreated(order: OrderWithDetails): void {
		this.tab.set('pending');
		this.clearFilters();
		void this.load('change');
		void this.offerAnotherOrder(order);
	}

	// Tras registrar, pregunta si se quiere cargar otro y reabre el formulario en blanco
	private async offerAnotherOrder(order: OrderWithDetails): Promise<void> {
		// Deja que el modal termine de cerrarse: una alerta sobre un <dialog> modal quedaría inerte
		await new Promise((resolve) => setTimeout(resolve, 100));
		const another = await this.alert.confirm({
			title: `Pedido ${order.purchase_order} registrado`,
			text: '¿Quieres registrar otro pedido?',
			icon: 'success',
			confirmText: 'Sí, registrar otro',
			cancelText: 'No, listo',
		});
		if (another) this.newOrderOpen.set(true);
	}
}
