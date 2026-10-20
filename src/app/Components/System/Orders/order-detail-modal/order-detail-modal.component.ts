// ==================================================
// Componente: <app-order-detail-modal>
// ==================================================
// Modal de solo lectura con el detalle completo de un pedido (GET /orders/{id}/details):
// cliente, entrega, domiciliario y productos. Se abre cuando `orderId` trae un número y
// avisa con `(closed)` para que quien lo usa vuelva a dejarlo en null.
//
//   <app-order-detail-modal [orderId]="selectedId()" (closed)="selectedId.set(null)" />

import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';

import { ModalComponent } from '@components/Shared/modal/modal.component';
import { SkeletonComponent } from '@components/Shared/skeleton/skeleton.component';
import { OrderStatusBadgeComponent } from '@components/System/Orders/order-status-badge/order-status-badge.component';
import { OrderFullDetail } from '@core/Models/CoreModule/order.model';
import { ApiTimePipe } from '@core/Pipes/api-time.pipe';
import { BogotaDatePipe } from '@core/Pipes/bogota-date.pipe';
import { CopCurrencyPipe } from '@core/Pipes/cop-currency.pipe';
import { OrderService } from '@core/Service/CoreModule/order.service';
import { parseApiError } from '@core/Utils/api-error.utils';

type DetailState =
	| { status: 'idle' }
	| { status: 'loading' }
	| { status: 'error'; message: string }
	| { status: 'ready'; order: OrderFullDetail };

const IDLE: DetailState = { status: 'idle' };
const LOADING: DetailState = { status: 'loading' };

@Component({
	selector: 'app-order-detail-modal',
	imports: [ModalComponent, SkeletonComponent, OrderStatusBadgeComponent, ApiTimePipe, BogotaDatePipe, CopCurrencyPipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './order-detail-modal.component.html',
})
export class OrderDetailModalComponent {
	private readonly orders = inject(OrderService);

	readonly orderId = input<number | null>(null);
	readonly closed = output<void>();

	// Sube para volver a pedir el detalle (botón "Reintentar")
	private readonly reloadTick = signal(0);

	protected readonly timeOnly: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

	// Un solo flujo: cada cambio de pedido cancela la petición anterior (switchMap)
	protected readonly detail = toSignal(
		combineLatest([toObservable(this.orderId), toObservable(this.reloadTick)]).pipe(
			switchMap(([id]) =>
				id === null
					? of(IDLE)
					: this.orders.getFullDetail(id).pipe(
							map((order): DetailState => ({ status: 'ready', order })),
							startWith(LOADING),
							catchError((error) => of<DetailState>({ status: 'error', message: parseApiError(error).message }))
						)
			)
		),
		{ initialValue: IDLE }
	);

	protected title(): string {
		const state = this.detail();
		return state.status === 'ready' ? `Pedido ${state.order.purchase_order}` : 'Detalle del pedido';
	}

	protected onOpenChange(open: boolean): void {
		if (!open) this.closed.emit();
	}

	protected retry(): void {
		this.reloadTick.update((tick) => tick + 1);
	}
}
