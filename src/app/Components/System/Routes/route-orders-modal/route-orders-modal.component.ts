// ==================================================
// Componente: <app-route-orders-modal>
// ==================================================
// Agrega los pedidos de una ruta del día al tablero de despachos ("Vista principal").
// La plantilla de la ruta trae, por cliente, sus productos con precio pactado (los que
// lleva en la ruta) en cantidad 1. Cada cliente arranca con todos ellos: el gestor ajusta
// cantidades, quita lo que no pidió (y puede volver a agregarlo con el buscador) o lo
// desmarca como "No pidió hoy". Los clientes sin precios pactados no pueden generar
// pedido desde la ruta. El precio lo pone el backend; otros productos o precios se
// cambian después, editando el pedido en el tablero.
// Hora estimada (precargada con la de salida) y domiciliario (opcional) aplican a todos.
// Al confirmar la alerta, crea en una sola petición los pedidos de los clientes con
// productos (POST /orders/routes/{id}) y avisa con `(created)`.
//
//   <app-route-orders-modal [card]="ordersCard()" (closed)="…" (created)="…" (outdated)="…" />
//
// Mientras se ve la alerta de confirmación el <dialog> se oculta (`suspended`): un
// <dialog> modal vuelve inerte todo lo demás y SweetAlert quedaría sin poder usarse.
// El contenido sigue montado, así que lo digitado se conserva si se cancela.

import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, forkJoin, map, of, startWith, switchMap } from 'rxjs';

import { EmptyStateComponent } from '@components/Shared/empty-state/empty-state.component';
import { IconComponent } from '@components/Shared/icon/icon.component';
import { ItemPickerComponent } from '@components/Shared/item-picker/item-picker.component';
import { PickerOption } from '@components/Shared/item-picker/item-picker.utils';
import { ModalComponent } from '@components/Shared/modal/modal.component';
import { SkeletonComponent } from '@components/Shared/skeleton/skeleton.component';
import { StatusBadgeComponent } from '@components/Shared/status-badge/status-badge.component';
import { DriverVehicleDropdown } from '@core/Models/CoreModule/catalog.model';
import { RouteOrdersCreated, RouteOrderTemplate, RouteTemplateClient } from '@core/Models/CoreModule/order.model';
import { NumericInputDirective } from '@core/Directives/numeric-input.directive';
import { CopCurrencyPipe } from '@core/Pipes/cop-currency.pipe';
import { ApiAlertService } from '@core/Service/Alerts/api-alert.service';
import { OrderService } from '@core/Service/CoreModule/order.service';
import { UserVehicleService } from '@core/Service/CoreModule/user-vehicle.service';
import { parseApiError } from '@core/Utils/api-error.utils';
import { formatCop } from '@core/Utils/money.utils';
import { formatDepartureTime, RouteDayCard } from '@core/Utils/route-board.utils';
import {
	addProduct,
	buildRouteOrderDrafts,
	buildRouteOrdersPayload,
	clientLines,
	draftsTotal,
	hasMissingQuantity,
	orderableClients,
	removedProducts,
	removeProduct,
	RouteExclusions,
	RouteOrderLine,
	routeOrdersConfirmHtml,
	RouteSelections,
	selectionsFromTemplate,
	setProductQuantity,
} from '@core/Utils/route-orders.utils';

type FormState =
	| { status: 'idle' }
	| { status: 'loading' }
	| { status: 'error'; message: string }
	// `drivers` es null si no se pudo cargar la lista: es opcional y no bloquea el formulario
	| { status: 'ready'; template: RouteOrderTemplate; drivers: DriverVehicleDropdown[] | null };

const IDLE: FormState = { status: 'idle' };
const LOADING: FormState = { status: 'loading' };

// Máximo de dígitos de una cantidad
const MAX_QUANTITY_DIGITS = 4;

@Component({
	selector: 'app-route-orders-modal',
	imports: [
		ModalComponent,
		SkeletonComponent,
		EmptyStateComponent,
		IconComponent,
		ItemPickerComponent,
		StatusBadgeComponent,
		NumericInputDirective,
		CopCurrencyPipe,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './route-orders-modal.component.html',
})
export class RouteOrdersModalComponent {
	private readonly orders = inject(OrderService);
	private readonly userVehicles = inject(UserVehicleService);
	private readonly apiAlert = inject(ApiAlertService);

	readonly card = input<RouteDayCard | null>(null);
	readonly closed = output<void>();
	readonly created = output<RouteOrdersCreated>();
	// Otro gestor ya agregó la ruta (409): hay que refrescar el estado de las rutas
	readonly outdated = output<void>();

	private readonly routeId = computed(() => this.card()?.route.id_route ?? null);
	private readonly reloadTick = signal(0);

	// Plantilla + domiciliarios; cada cambio de ruta cancela la petición anterior
	protected readonly state = toSignal(
		combineLatest([toObservable(this.routeId), toObservable(this.reloadTick)]).pipe(
			switchMap(([id]) =>
				id === null
					? of(IDLE)
					: forkJoin({
							template: this.orders.getRouteTemplate(id),
							// Si solo falla la lista de domiciliarios, el formulario sigue (sin asignar)
							drivers: this.userVehicles.getDriversDropdown().pipe(catchError(() => of(null))),
						}).pipe(
							map(({ template, drivers }): FormState => ({ status: 'ready', template, drivers })),
							startWith(LOADING),
							catchError((error) => of<FormState>({ status: 'error', message: parseApiError(error).message }))
						)
			)
		),
		{ initialValue: IDLE }
	);

	protected readonly template = computed(() => {
		const state = this.state();
		return state.status === 'ready' ? state.template : null;
	});
	protected readonly drivers = computed(() => {
		const state = this.state();
		return state.status === 'ready' ? (state.drivers ?? []) : [];
	});
	protected readonly driversFailed = computed(() => {
		const state = this.state();
		return state.status === 'ready' && state.drivers === null;
	});

	// ----- Formulario (se reinicia con cada plantilla nueva) -----
	// Arranca con los productos pactados de cada cliente; el gestor ajusta cantidades
	protected readonly selections = linkedSignal<RouteOrderTemplate | null, RouteSelections>({
		source: this.template,
		computation: (template) => (template ? selectionsFromTemplate(template) : {}),
	});
	// Clientes marcados "No pidió hoy" (no se les crea pedido)
	protected readonly excluded = linkedSignal<RouteOrderTemplate | null, RouteExclusions>({
		source: this.template,
		computation: () => new Set<number>(),
	});
	protected readonly deliveryTime = linkedSignal(() => this.template()?.departure_time.slice(0, 5) ?? '');
	protected readonly driverId = linkedSignal<RouteOrderTemplate | null, number | null>({
		source: this.template,
		computation: () => null,
	});

	// Oculta el <dialog> mientras se ve la alerta de confirmación; vuelve a false con cada ruta
	private readonly suspended = linkedSignal({ source: this.card, computation: () => false });
	protected readonly open = computed(() => this.card() !== null && !this.suspended());

	// ----- Derivados -----
	protected readonly orderable = computed(() => {
		const template = this.template();
		return template ? orderableClients(template) : [];
	});
	protected readonly drafts = computed(() => {
		const template = this.template();
		return template ? buildRouteOrderDrafts(template, this.selections(), this.excluded()) : [];
	});
	protected readonly allHaveOrders = computed(() => (this.template()?.clients ?? []).every((client) => client.existing_order_id !== null));
	protected readonly total = computed(() => draftsTotal(this.drafts()));
	private readonly clientTotals = computed(() => new Map(this.drafts().map((draft) => [draft.client.id_client, draft.total])));
	protected readonly missingQuantity = computed(() => hasMissingQuantity(this.selections(), this.excluded()));
	protected readonly canSubmit = computed(() => this.drafts().length > 0 && !this.missingQuantity());

	// Productos elegidos de cada cliente, en el orden en que se agregaron
	private readonly linesByClient = computed(() => {
		const template = this.template();
		const selections = this.selections();
		if (!template) return new Map<number, RouteOrderLine[]>();
		return new Map(template.clients.map((client) => [client.id_client, clientLines(client, selections)]));
	});

	// Opciones del buscador de cada cliente: sus productos pactados que quitó de la lista
	private readonly pickerOptionsByClient = computed(() => {
		const template = this.template();
		const selections = this.selections();
		const result = new Map<number, PickerOption[]>();
		for (const client of template?.clients ?? []) {
			result.set(
				client.id_client,
				removedProducts(client, selections).map((product) => ({
					id: product.id_product,
					code: product.code,
					label: product.name,
					meta: formatCop(product.unit_price),
				}))
			);
		}
		return result;
	});

	protected readonly title = computed(() => {
		const name = this.card()?.route.name;
		return name ? `Agregar ruta ${name} al tablero` : 'Agregar ruta al tablero';
	});
	protected readonly submitLabel = computed(() => {
		const count = this.drafts().length;
		return count === 0 ? 'Agregar pedidos' : `Agregar ${count} ${count === 1 ? 'pedido' : 'pedidos'}`;
	});

	protected readonly maxQuantityDigits = MAX_QUANTITY_DIGITS;

	// ----- Por cliente -----
	protected linesOf(client: RouteTemplateClient): RouteOrderLine[] {
		return this.linesByClient().get(client.id_client) ?? [];
	}

	protected pickerOptions(client: RouteTemplateClient): PickerOption[] {
		return this.pickerOptionsByClient().get(client.id_client) ?? [];
	}

	protected isExcluded(client: RouteTemplateClient): boolean {
		return this.excluded().has(client.id_client);
	}

	protected clientTotal(client: RouteTemplateClient): number {
		return this.clientTotals().get(client.id_client) ?? 0;
	}

	// ----- Edición -----
	// "Incluir" marcado = se le crea pedido; desmarcado = "No pidió hoy" (se conserva su lista)
	protected setIncluded(client: RouteTemplateClient, included: boolean): void {
		this.excluded.update((current) => {
			const next = new Set(current);
			if (included) next.delete(client.id_client);
			else next.add(client.id_client);
			return next;
		});
	}

	protected addProduct(client: RouteTemplateClient, idProduct: number): void {
		this.selections.update((current) => addProduct(current, client.id_client, idProduct));
	}

	protected removeProduct(client: RouteTemplateClient, line: RouteOrderLine): void {
		this.selections.update((current) => removeProduct(current, client.id_client, line.product.id_product));
	}

	protected setQuantity(client: RouteTemplateClient, line: RouteOrderLine, value: string | number): void {
		const cant = typeof value === 'number' ? value : Number.parseInt(value, 10);
		this.selections.update((current) => setProductQuantity(current, client.id_client, line.product.id_product, cant));
	}

	protected stepQuantity(client: RouteTemplateClient, line: RouteOrderLine, step: 1 | -1): void {
		this.setQuantity(client, line, Math.max(line.cant + step, 1));
	}

	protected setDriver(value: string): void {
		this.driverId.set(value ? Number(value) : null);
	}

	protected retry(): void {
		this.reloadTick.update((tick) => tick + 1);
	}

	protected onOpenChange(open: boolean): void {
		// Al ocultarse para la confirmación no se cierra de verdad
		if (!open && !this.suspended()) this.closed.emit();
	}

	// ----- Envío -----
	protected async submit(): Promise<void> {
		const card = this.card();
		const drafts = this.drafts();
		if (!card || !this.canSubmit()) return;

		const count = drafts.length;
		const plural = count === 1 ? 'pedido' : 'pedidos';
		const driver = this.drivers().find((option) => option.id_user_vehicle === this.driverId());
		const html = routeOrdersConfirmHtml(drafts, {
			deliveryText: formatDepartureTime(this.deliveryTime()) || 'Sin hora definida',
			driverText: driver ? `${driver.code} · ${driver.driver_name}` : null,
		});
		const payload = buildRouteOrdersPayload(drafts, this.deliveryTime(), this.driverId());

		this.suspended.set(true);
		const result = await this.apiAlert.confirmAndRun(
			{
				title: `¿Agregar ${count} ${plural} de la ruta ${card.route.name} al tablero de despachos?`,
				html,
				icon: 'question',
				confirmText: `Sí, agregar ${count} ${plural}`,
			},
			() => this.orders.createRouteOrders(card.route.id_route, payload),
			{
				loadingTitle: 'Agregando pedidos...',
				successTitle: 'Pedidos agregados',
				successText: `Se ${count === 1 ? 'agregó' : 'agregaron'} ${count} ${plural} al tablero de despachos.`,
			}
		);

		if (result.ok) {
			this.created.emit(result.data);
		} else if ('error' in result && result.error.code === 'ROUTE_ORDER_EXISTS') {
			this.outdated.emit();
		} else {
			// Canceló o falló: el modal vuelve con lo que ya había digitado
			this.suspended.set(false);
		}
	}
}
