// ==================================================
// Componente: <app-order-detail-modal>
// ==================================================
// Detalle completo de un pedido (GET /orders/{id}/details) con las acciones que su
// estado permite:
//   - PENDING: editar la hora estimada y los productos (modo "Editar pedido", ver order-edit).
//   - PENDING / DISPATCHED: asignar, cambiar o quitar el domiciliario (PATCH /orders/{id}).
//   - DISPATCHED / DELIVERED: reimprimir el comprobante de despacho (CD).
//   - DELIVERED / CANCELLED: solo lectura (la API rechaza cambios en estados finales).
// Se abre cuando `orderId` trae un número. Avisa con `(closed)` para que quien lo usa
// vuelva a dejarlo en null, y con `(changed)` cuando guardó un cambio, para que refresque.
//
//   <app-order-detail-modal [orderId]="selectedId()" (closed)="selectedId.set(null)" (changed)="reload()" />
//
// Los avisos van EN LÍNEA y no con SweetAlert: un <dialog> modal deja inerte todo lo que
// no está dentro de él, y una alerta encima quedaría sin poder cerrarse.

import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
	Observable,
	Subject,
	catchError,
	distinctUntilChanged,
	filter,
	firstValueFrom,
	map,
	of,
	startWith,
	switchMap,
} from 'rxjs';

import { IconComponent } from '@components/Shared/icon/icon.component';
import { ModalComponent } from '@components/Shared/modal/modal.component';
import { SkeletonComponent } from '@components/Shared/skeleton/skeleton.component';
import { OrderEditComponent } from '@components/System/Orders/order-edit/order-edit.component';
import { OrderStatusBadgeComponent } from '@components/System/Orders/order-status-badge/order-status-badge.component';
import { DriverVehicleDropdown } from '@core/Models/CoreModule/catalog.model';
import { OrderFullDetail } from '@core/Models/CoreModule/order.model';
import { ApiTimePipe } from '@core/Pipes/api-time.pipe';
import { BogotaDatePipe } from '@core/Pipes/bogota-date.pipe';
import { CopCurrencyPipe } from '@core/Pipes/cop-currency.pipe';
import { OrderReceiptService } from '@core/Service/CoreModule/order-receipt.service';
import { OrderService } from '@core/Service/CoreModule/order.service';
import { UserVehicleService } from '@core/Service/CoreModule/user-vehicle.service';
import { parseApiError, parseApiErrorAsync } from '@core/Utils/api-error.utils';
import { todayBogota } from '@core/Utils/date.utils';
import { orderCapabilities } from '@core/Utils/order-actions.utils';
import { isScheduled } from '@core/Utils/schedule.utils';

type DetailState =
	| { status: 'idle' }
	| { status: 'loading' }
	| { status: 'error'; message: string }
	| { status: 'ready'; order: OrderFullDetail };

// 'refresh' vuelve a pedir el detalle sin tapar lo que ya se ve (tras guardar un cambio)
type LoadMode = 'initial' | 'retry' | 'refresh';

interface Feedback {
	tone: 'success' | 'error';
	text: string;
}

const IDLE: DetailState = { status: 'idle' };
const LOADING: DetailState = { status: 'loading' };

@Component({
	selector: 'app-order-detail-modal',
	imports: [
		IconComponent,
		OrderEditComponent,
		ModalComponent,
		SkeletonComponent,
		OrderStatusBadgeComponent,
		ApiTimePipe,
		BogotaDatePipe,
		CopCurrencyPipe,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './order-detail-modal.component.html',
})
export class OrderDetailModalComponent {
	private readonly orders = inject(OrderService);
	private readonly userVehicles = inject(UserVehicleService);
	private readonly receipt = inject(OrderReceiptService);

	readonly orderId = input<number | null>(null);
	readonly closed = output<void>();
	readonly changed = output<void>();

	// Pide de nuevo el detalle (reintentar, o refrescar después de guardar)
	private readonly reload$ = new Subject<LoadMode>();

	protected readonly timeOnly: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
	protected readonly longDate: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };

	// Un solo flujo: cada cambio de pedido cancela la petición anterior (switchMap)
	protected readonly detail = toSignal(
		toObservable(this.orderId).pipe(
			switchMap((id) =>
				id === null
					? of(IDLE)
					: this.reload$.pipe(
							startWith('initial' as LoadMode),
							switchMap((mode) => this.load(id, mode))
						)
			)
		),
		{ initialValue: IDLE }
	);

	// Domiciliarios para el selector. undefined = cargando, null = no se pudo cargar. Se pide
	// al abrir el modal; si falla, el detalle sigue siendo útil (solo no se puede cambiar).
	protected readonly drivers = toSignal<DriverVehicleDropdown[] | null | undefined>(
		toObservable(computed(() => this.orderId() !== null)).pipe(
			distinctUntilChanged(),
			filter(Boolean),
			switchMap(() =>
				this.userVehicles.getDriversDropdown().pipe(
					startWith(undefined),
					catchError(() => of(null))
				)
			)
		),
		{ initialValue: undefined }
	);

	protected readonly order = computed(() => {
		const state = this.detail();
		return state.status === 'ready' ? state.order : null;
	});
	protected readonly capabilities = computed(() => {
		const order = this.order();
		return order ? orderCapabilities(order.state, isScheduled(order.delivery_date, todayBogota())) : null;
	});

	// ----- Domiciliario -----
	// Se reinicia con el pedido guardado cada vez que llega un detalle nuevo
	protected readonly selectedDriver = linkedSignal<OrderFullDetail | null, number | null>({
		source: this.order,
		computation: (order) => order?.id_user_vehicle ?? null,
	});
	protected readonly dirty = computed(() => {
		const order = this.order();
		return order !== null && this.selectedDriver() !== order.id_user_vehicle;
	});
	// Si el domiciliario actual ya no está en la lista (p. ej. lo desactivaron) se agrega
	// su opción para que el selector no aparezca vacío
	protected readonly currentDriverMissing = computed(() => {
		const order = this.order();
		const drivers = this.drivers();
		return (
			order !== null &&
			order.id_user_vehicle !== null &&
			Array.isArray(drivers) &&
			!drivers.some((driver) => driver.id_user_vehicle === order.id_user_vehicle)
		);
	});

	// Ver o editar los productos y la hora; siempre abre en "ver"
	protected readonly editing = linkedSignal<number | null, boolean>({ source: this.orderId, computation: () => false });

	protected readonly saving = signal(false);
	protected readonly printing = signal(false);
	// El aviso se borra al cambiar de pedido
	protected readonly feedback = linkedSignal<number | null, Feedback | null>({
		source: this.orderId,
		computation: () => null,
	});

	protected title(): string {
		const order = this.order();
		return order ? `Pedido ${order.purchase_order}` : 'Detalle del pedido';
	}

	protected onOpenChange(open: boolean): void {
		if (!open) this.closed.emit();
	}

	protected retry(): void {
		this.reload$.next('retry');
	}

	protected setDriver(value: string): void {
		this.selectedDriver.set(value ? Number(value) : null);
	}

	protected async saveDriver(): Promise<void> {
		const order = this.order();
		if (!order || this.saving() || !this.dirty()) return;

		const driverId = this.selectedDriver();
		this.saving.set(true);
		this.feedback.set(null);
		try {
			await firstValueFrom(this.orders.updateOrder(order.id_order, { id_user_vehicle: driverId }));
			this.feedback.set({
				tone: 'success',
				text: driverId === null ? 'Domiciliario quitado del pedido.' : 'Domiciliario actualizado.',
			});
			this.reload$.next('refresh');
			this.changed.emit();
		} catch (error) {
			this.feedback.set({ tone: 'error', text: (await parseApiErrorAsync(error)).message });
		} finally {
			this.saving.set(false);
		}
	}

	protected startEditing(): void {
		this.feedback.set(null);
		this.editing.set(true);
	}

	// Guardó todo: vuelve a "ver" con el pedido ya actualizado
	protected onEditSaved(): void {
		this.editing.set(false);
		this.feedback.set({ tone: 'success', text: 'Pedido actualizado.' });
		this.onEditChanged();
	}

	// El pedido cambió (del todo o en parte): se vuelve a pedir y se avisa a la tabla
	protected onEditChanged(): void {
		this.reload$.next('refresh');
		this.changed.emit();
	}

	protected async printReceipt(): Promise<void> {
		const order = this.order();
		if (!order || this.printing()) return;

		this.printing.set(true);
		this.feedback.set(null);
		const result = await this.receipt.print(order.id_order);
		this.printing.set(false);
		if (!result.ok) this.feedback.set({ tone: 'error', text: result.message });
	}

	private load(id: number, mode: LoadMode): Observable<DetailState> {
		const request = this.orders.getFullDetail(id).pipe(
			map((order): DetailState => ({ status: 'ready', order })),
			catchError((error) => of<DetailState>({ status: 'error', message: parseApiError(error).message }))
		);
		// Al refrescar se deja a la vista el detalle anterior hasta que llegue el nuevo
		return mode === 'refresh' ? request : request.pipe(startWith(LOADING));
	}
}
