// ==================================================
// Vista: Tablero de despachos
// ==================================================
// Pedidos del día en dos pestañas (pendientes / despachados). Por defecto es hoy; el selector
// de día permite ver los pedidos PROGRAMADOS de días posteriores (hasta 60 días adelante).
// De un día futuro se ven y se editan, pero no se despachan hasta su día. La API entrega el
// día completo sin paginar, así que la búsqueda, los filtros y la paginación se hacen aquí
// (ver order-board.utils). Se refresca solo cada minuto, sin molestar con alertas.
//
// Acciones por fila (ver reglas en order-actions.utils):
//   - Pendiente: ver detalle, despachar → pasa a la pestaña de despachados y, si el pedido lleva
//     CD (POS + efectivo), ofrece imprimirlo; o cancelar con motivo.
//   - Despachado: ver detalle, marcar como entregado o cancelar con motivo.
//   - Entregado / cancelado: solo ver detalle.
// Despacho múltiple: con el filtro de una ruta y un domiciliario concretos aparecen casillas
// para despachar juntos los pendientes (POST /orders/dispatch-batch, todo o nada). Los CD se
// imprimen uno por uno desde el detalle.
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
import { SortHeaderComponent } from '@components/Shared/sort-header/sort-header.component';
import { NewOrderModalComponent } from '@components/System/Orders/new-order-modal/new-order-modal.component';
import { OrderCancelModalComponent } from '@components/System/Orders/order-cancel-modal/order-cancel-modal.component';
import { OrderDetailModalComponent } from '@components/System/Orders/order-detail-modal/order-detail-modal.component';
import { OrderStatusBadgeComponent } from '@components/System/Orders/order-status-badge/order-status-badge.component';
import { OrderSummary, OrderWithDetails } from '@core/Models/CoreModule/order.model';
import { INVOICE_TYPE_LABELS, OrderState, PAYMENT_METHOD_LABELS } from '@core/Models/Shared/api-types.model';
import { ApiTimePipe } from '@core/Pipes/api-time.pipe';
import { BogotaDatePipe } from '@core/Pipes/bogota-date.pipe';
import { AlertService } from '@core/Service/Alerts/alert.service';
import { ApiAlertService } from '@core/Service/Alerts/api-alert.service';
import { ClockService } from '@core/Service/Clock/clock.service';
import { OrderReceiptService } from '@core/Service/CoreModule/order-receipt.service';
import { OrderService } from '@core/Service/CoreModule/order.service';
import { formatIsoDateLong, todayBogota } from '@core/Utils/date.utils';
import { orderCapabilities } from '@core/Utils/order-actions.utils';
import {
	BOARD_PAGE_SIZE,
	PAGE_SIZE_OPTIONS,
	BoardFilters,
	BoardSort,
	DISPATCHED_TAB_STATUSES,
	PENDING_TAB_STATUSES,
	canBatchDispatch,
	driverOptions,
	filterOrders,
	isSortKey,
	nextSort,
	paginate,
	routeOptions,
	sortOrders,
	statusOptions,
	toggleId,
	totalPages,
	zoneOptions,
} from '@core/Utils/order-board.utils';
import { isScheduled, maxScheduleDate, scheduleError } from '@core/Utils/schedule.utils';

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
		SortHeaderComponent,
		NewOrderModalComponent,
		OrderCancelModalComponent,
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

	// ----- Día que se está viendo (hoy o un día programado) -----
	protected readonly today = todayBogota();
	protected readonly maxDate = maxScheduleDate(this.today);
	protected readonly day = signal(this.today);
	protected readonly isFutureDay = computed(() => isScheduled(this.day(), this.today));

	// ----- Pestañas y filtros -----
	protected readonly tab = signal<BoardTab>('pending');
	protected readonly search = signal('');
	protected readonly zone = signal('');
	protected readonly status = signal('');
	protected readonly driver = signal('');
	protected readonly route = signal('');
	protected readonly sort = signal<BoardSort | null>(null);
	protected readonly pageSize = signal(BOARD_PAGE_SIZE);
	protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
	protected readonly selectedId = signal<number | null>(null);
	protected readonly newOrderOpen = signal(false);
	protected readonly cancelling = signal<OrderSummary | null>(null);

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
		route: this.route(),
	}));

	protected readonly zoneOptions = computed(() => zoneOptions(this.activeRows()));
	protected readonly driverOptions = computed(() => driverOptions(this.activeRows()));
	protected readonly routeOptions = computed(() => routeOptions(this.activeRows()));
	protected readonly statusOptions = computed(() =>
		statusOptions(this.tab() === 'pending' ? PENDING_TAB_STATUSES : DISPATCHED_TAB_STATUSES)
	);
	protected readonly hasFilters = computed(() => Object.values(this.filters()).some(Boolean));

	// Depende de `clock.now()`: el filtro de Estado (Próximo / Retrasado) se reevalúa con el reloj
	private readonly filtered = computed(() => filterOrders(this.activeRows(), this.filters(), this.clock.now(), this.day()));
	private readonly sorted = computed(() => sortOrders(this.filtered(), this.sort()));
	protected readonly pages = computed(() => totalPages(this.filtered().length, this.pageSize()));

	// Vuelve a la página 1 al cambiar de pestaña o de filtros; si el refresco deja menos
	// páginas que la actual, se queda en la última
	protected readonly page = linkedSignal<{ key: string; pages: number }, number>({
		source: () => ({ key: JSON.stringify([this.day(), this.tab(), this.filters(), this.sort(), this.pageSize()]), pages: this.pages() }),
		computation: (source, previous) =>
			previous && previous.source.key === source.key ? Math.min(previous.value, source.pages) : 1,
	});

	protected readonly visibleRows = computed(() => paginate(this.sorted(), this.page(), this.pageSize()));

	// ----- Despacho múltiple -----
	// Solo en pendientes de un día que ya se puede despachar, con una ruta y un domiciliario filtrados
	protected readonly batchMode = computed(
		() => this.tab() === 'pending' && !this.isFutureDay() && canBatchDispatch(this.filters())
	);
	// Todos los despachables del filtro (no solo los de la página visible)
	private readonly batchCandidates = computed(() =>
		this.batchMode() ? this.sorted().filter((row) => orderCapabilities(row.state).canDispatch).map((row) => row.id_order) : []
	);
	// Al cambiar el filtro o refrescar se quitan de la selección los que ya no están
	protected readonly selected = linkedSignal<number[], number[]>({
		source: this.batchCandidates,
		computation: (candidates, previous) => (previous ? previous.value.filter((id) => candidates.includes(id)) : []),
	});
	protected readonly allSelected = computed(
		() => this.batchCandidates().length > 0 && this.selected().length === this.batchCandidates().length
	);
	protected readonly columnCount = computed(() => (this.batchMode() ? 9 : 8));

	protected readonly OrderState = OrderState;
	protected readonly paymentLabels = PAYMENT_METHOD_LABELS;
	protected readonly invoiceLabels = INVOICE_TYPE_LABELS;
	protected readonly orderCapabilities = orderCapabilities;
	protected readonly summary = computed(() => {
		const total = this.filtered().length;
		if (total === 0) return '';
		const from = (this.page() - 1) * this.pageSize() + 1;
		const to = Math.min(this.page() * this.pageSize(), total);
		return `Mostrando ${from}–${to} de ${total} ${total === 1 ? 'pedido' : 'pedidos'}`;
	});

	protected readonly dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
	protected readonly dayOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
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
		effect(() => {
			const route = this.route();
			if (route && !this.routeOptions().some((option) => option.value === route)) this.route.set('');
		});
	}

	// ----- Carga -----
	protected refresh(): void {
		void this.load('manual');
	}

	// Cambia el día que se ve. Solo de hoy en adelante: los pedidos de días anteriores no se
	// gestionan aquí. Las filas del día anterior se vacían para no mostrarlas mientras carga.
	protected setDay(value: string): void {
		if (!value || value === this.day() || scheduleError(value, this.today) !== null) return;
		this.day.set(value);
		this.pendingRows.set([]);
		this.dispatchedRows.set([]);
		this.lastUpdated.set(null);
		this.loading.set(true);
		void this.load('initial');
	}

	protected goToday(): void {
		this.setDay(this.today);
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
		let discarded = false;
		if (mode === 'manual') this.refreshing.set(true);

		try {
			const day = this.day();
			const [pending, dispatched] = await firstValueFrom(
				forkJoin([this.orders.getDashboardSummary(day), this.orders.getDispatchedSummary(day)])
			);
			// Si el usuario cambió de día mientras llegaba la respuesta, esta ya no corresponde
			if (day !== this.day()) {
				discarded = true;
				return;
			}
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
			// Con una respuesta descartada (cambió el día) sigue el skeleton hasta que llegue la nueva
			if (!discarded) this.loading.set(false);
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

	protected toggleSort(key: string): void {
		if (isSortKey(key)) this.sort.update((current) => nextSort(current, key));
	}

	protected clearFilters(): void {
		this.search.set('');
		this.zone.set('');
		this.status.set('');
		this.driver.set('');
		this.route.set('');
	}

	protected toggleSelected(id: number): void {
		this.selected.update((selected) => toggleId(selected, id));
	}

	protected toggleAll(): void {
		this.selected.set(this.allSelected() ? [] : [...this.batchCandidates()]);
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

		// Transferencia, crédito o factura electrónica no llevan CD: se despachan igual
		if (!row.has_receipt) {
			this.alert.toast(`Pedido ${row.purchase_order} despachado (no lleva CD)`);
			return;
		}
		const print = await this.alert.confirm({
			title: `Pedido ${row.purchase_order} despachado`,
			text: '¿Quieres imprimir el comprobante de despacho (CD)? Después podrás reimprimirlo desde el detalle.',
			icon: 'success',
			confirmText: 'Imprimir CD',
			cancelText: 'Ahora no',
		});
		if (print) await this.printReceipt(row);
	}

	// Varios PENDING → DISPATCHED (todo o nada). Si alguno falla, la alerta lista cada PO con su
	// motivo y no se despacha ninguno. No hay impresión múltiple: los CD salen desde el detalle.
	protected async dispatchSelected(): Promise<void> {
		const ids = this.selected();
		if (ids.length === 0) return;
		const route = this.routeOptions().find((option) => option.value === this.route())?.label ?? '';
		const driver = this.driverOptions().find((option) => option.value === this.driver())?.label ?? '';
		const count = ids.length === 1 ? '1 pedido' : `${ids.length} pedidos`;

		const result = await this.apiAlert.confirmAndRun(
			{
				title: `¿Despachar ${count}?`,
				text: `Ruta ${route} · Domiciliario: ${driver}. Los comprobantes (CD) se imprimen uno por uno desde el detalle.`,
				icon: 'question',
				confirmText: 'Sí, despachar',
			},
			() => this.orders.dispatchBatch(ids),
			{
				loadingTitle: 'Despachando pedidos...',
				successToast: ids.length === 1 ? 'Pedido despachado' : `${ids.length} pedidos despachados`,
				errorTitle: 'No se despachó ningún pedido',
			}
		);
		if ('cancelled' in result) return;
		await this.load('change');
	}

	protected cancel(row: OrderSummary): void {
		this.cancelling.set(row);
	}

	protected onCancelled(row: { purchase_order: string }): void {
		this.alert.toast(`Pedido ${row.purchase_order} cancelado`);
		void this.load('change');
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
		// Un pedido de otro día no se ve en el tablero actual: se avisa para qué día quedó
		const elsewhere = order.delivery_date !== this.day();
		const another = await this.alert.confirm({
			title: elsewhere ? `Pedido ${order.purchase_order} programado` : `Pedido ${order.purchase_order} registrado`,
			text: elsewhere
				? `Quedó programado para el ${formatIsoDateLong(order.delivery_date)}; lo verás en el tablero ese día. ¿Quieres registrar otro pedido?`
				: '¿Quieres registrar otro pedido?',
			icon: 'success',
			confirmText: 'Sí, registrar otro',
			cancelText: 'No, listo',
		});
		if (another) this.newOrderOpen.set(true);
	}
}
