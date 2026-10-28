// ==================================================
// Componente: <app-order-edit>
// ==================================================
// Formulario para editar un pedido PENDIENTE: día y hora de entrega y productos
// (cantidad, precio, agregar y quitar). Se muestra dentro del detalle del pedido.
// El domiciliario se cambia aparte, en el propio detalle.
//
//   <app-order-edit [order]="order" (saved)="…" (changed)="…" (cancelled)="…" />
//
// Guardar hace hasta dos peticiones, solo de lo que cambió: PUT /orders/{id}/items-order
// (productos) y PATCH /orders/{id} (hora y/o día de entrega; con otro día el pedido recibe un
// PO nuevo del día de destino y sale del tablero de hoy). Si la primera sale bien y la segunda falla, `changed`
// avisa que el pedido ya se modificó en parte, para que quien lo usa refresque.
// Los avisos van en línea: esto vive dentro de un <dialog> modal (ver order-detail-modal).

import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, firstValueFrom, of, startWith, switchMap } from 'rxjs';

import { OrderItemsEditorComponent } from '@components/System/Orders/order-items-editor/order-items-editor.component';
import { SkeletonComponent } from '@components/Shared/skeleton/skeleton.component';
import { ProductCatalogItem } from '@core/Models/CoreModule/catalog.model';
import { OrderFullDetail, OrderUpdate } from '@core/Models/CoreModule/order.model';
import { OrderService } from '@core/Service/CoreModule/order.service';
import { ProductService } from '@core/Service/CoreModule/product.service';
import { parseApiErrorAsync } from '@core/Utils/api-error.utils';
import { todayBogota, toApiTime } from '@core/Utils/date.utils';
import { EditorLine, buildItemsSync, itemsChanged, itemsProblem, linesFromItems } from '@core/Utils/order-items.utils';
import { maxScheduleDate, scheduleError } from '@core/Utils/schedule.utils';

@Component({
	selector: 'app-order-edit',
	imports: [OrderItemsEditorComponent, SkeletonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './order-edit.component.html',
})
export class OrderEditComponent {
	private readonly orders = inject(OrderService);
	private readonly products = inject(ProductService);

	readonly order = input.required<OrderFullDetail>();
	readonly saved = output<void>();
	readonly changed = output<void>();
	readonly cancelled = output<void>();

	// Catálogo con los precios de ESTE cliente. undefined = cargando, null = no se pudo cargar
	protected readonly catalog = toSignal<readonly ProductCatalogItem[] | null | undefined>(
		toObservable(computed(() => this.order().id_client)).pipe(
			switchMap((idClient) =>
				this.products.getCatalog(idClient).pipe(
					startWith(undefined),
					catchError(() => of(null))
				)
			)
		),
		{ initialValue: undefined }
	);

	// Lo guardado y lo que se está editando; ambos se reinician si llega el pedido actualizado
	protected readonly savedLines = computed<EditorLine[]>(() => linesFromItems(this.order().items));
	protected readonly lines = linkedSignal<EditorLine[]>(() => this.savedLines());
	protected readonly deliveryTime = linkedSignal(() => this.order().estimated_delivery?.slice(0, 5) ?? '');

	protected readonly today = todayBogota();
	protected readonly maxDate = maxScheduleDate(this.today);
	protected readonly deliveryDate = linkedSignal(() => this.order().delivery_date);
	protected readonly dateDirty = computed(() => this.deliveryDate() !== this.order().delivery_date);
	// Solo se valida si se cambió: un pedido ya vencido conserva su día sin que eso sea un error
	protected readonly dateError = computed(() => (this.dateDirty() ? scheduleError(this.deliveryDate(), this.today) : null));

	protected readonly itemsDirty = computed(() => itemsChanged(this.savedLines(), this.lines()));
	protected readonly timeDirty = computed(
		() => toApiTime(this.deliveryTime()) !== (this.order().estimated_delivery ?? null)
	);
	protected readonly problem = computed(() => itemsProblem(this.lines()));
	protected readonly error = signal<string | null>(null);
	protected readonly saving = signal(false);
	protected readonly canSave = computed(
		() =>
			!this.saving() &&
			this.problem() === null &&
			this.dateError() === null &&
			(this.itemsDirty() || this.timeDirty() || this.dateDirty())
	);

	protected async save(): Promise<void> {
		if (!this.canSave()) return;

		const id = this.order().id_order;
		this.saving.set(true);
		this.error.set(null);
		let touched = false;
		try {
			if (this.itemsDirty()) {
				await firstValueFrom(this.orders.syncItems(id, buildItemsSync(this.lines())));
				touched = true;
			}
			if (this.timeDirty() || this.dateDirty()) {
				const patch: OrderUpdate = {};
				if (this.timeDirty()) patch.estimated_delivery = toApiTime(this.deliveryTime());
				if (this.dateDirty()) patch.delivery_date = this.deliveryDate();
				await firstValueFrom(this.orders.updateOrder(id, patch));
				touched = true;
			}
			this.saved.emit();
		} catch (error) {
			this.error.set((await parseApiErrorAsync(error)).message);
			// Si la primera petición ya se aplicó, el pedido cambió aunque aquí se vea el error
			if (touched) this.changed.emit();
		} finally {
			this.saving.set(false);
		}
	}
}
