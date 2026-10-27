// ==================================================
// Componente: <app-new-order-form>
// ==================================================
// Registro de un pedido nuevo, con dos formularios distintos que comparten lo demás
// (hora estimada, domiciliario y productos):
//   - Cliente existente: se busca entre los clientes registrados → POST /orders/existing-client.
//   - Cliente nuevo: se piden nombre, teléfono, dirección y barrio → POST /orders/new-client
//     (el cliente queda como temporal).
// Los productos salen de GET /products/catalog: con el cliente existente entran con SUS precios
// pactados; con un cliente nuevo, con el precio base. En ambos casos el precio se puede cambiar.
//
// Se monta solo mientras el modal está abierto (ver new-order-modal), así cada vez empieza
// en blanco. Los errores van en línea porque esto vive dentro de un <dialog> modal.

import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, firstValueFrom, map, of, startWith, switchMap } from 'rxjs';

import { ClientSearchComponent } from '@components/System/Orders/client-search/client-search.component';
import { OrderItemsEditorComponent } from '@components/System/Orders/order-items-editor/order-items-editor.component';
import { SkeletonComponent } from '@components/Shared/skeleton/skeleton.component';
import { NumericInputDirective } from '@core/Directives/numeric-input.directive';
import { Client, ProductCatalogItem } from '@core/Models/CoreModule/catalog.model';
import { OrderWithDetails } from '@core/Models/CoreModule/order.model';
import { ClientService } from '@core/Service/CoreModule/client.service';
import { OrderService } from '@core/Service/CoreModule/order.service';
import { ProductService } from '@core/Service/CoreModule/product.service';
import { UserVehicleService } from '@core/Service/CoreModule/user-vehicle.service';
import { NeighborhoodService } from '@core/Service/ParametersModule/neighborhood.service';
import { describeApiError, parseApiErrorAsync } from '@core/Utils/api-error.utils';
import {
	EMPTY_NEW_CLIENT,
	MAX_CLIENT_ADDRESS_LENGTH,
	MAX_CLIENT_NAME_LENGTH,
	NewClientDraft,
	PHONE_DIGITS,
	buildExistingClientOrder,
	buildNewClientOrder,
	hasErrors,
	neighborhoodLabel,
	newClientErrors,
	sortNeighborhoods,
} from '@core/Utils/new-order.utils';
import { EditorLine, itemsProblem } from '@core/Utils/order-items.utils';

type OrderMode = 'existing' | 'new';

@Component({
	selector: 'app-new-order-form',
	imports: [ClientSearchComponent, OrderItemsEditorComponent, SkeletonComponent, NumericInputDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './new-order-form.component.html',
})
export class NewOrderFormComponent {
	private readonly orders = inject(OrderService);
	private readonly products = inject(ProductService);
	private readonly userVehicles = inject(UserVehicleService);
	private readonly neighborhoodService = inject(NeighborhoodService);

	readonly created = output<OrderWithDetails>();
	readonly cancelled = output<void>();

	protected readonly modes: readonly { id: OrderMode; label: string }[] = [
		{ id: 'existing', label: 'Cliente existente' },
		{ id: 'new', label: 'Cliente nuevo' },
	];
	protected readonly phoneDigits = PHONE_DIGITS;
	protected readonly maxName = MAX_CLIENT_NAME_LENGTH;
	protected readonly maxAddress = MAX_CLIENT_ADDRESS_LENGTH;
	protected readonly neighborhoodLabel = neighborhoodLabel;

	protected readonly mode = signal<OrderMode>('existing');

	// ----- Listas de apoyo. undefined = cargando, null = no se pudo cargar -----
	protected readonly neighborhoods = toSignal(
		this.neighborhoodService.getDropdown().pipe(
			map((list) => sortNeighborhoods(list)),
			catchError(() => of(null))
		),
		{ initialValue: undefined }
	);
	protected readonly drivers = toSignal(this.userVehicles.getDriversDropdown().pipe(catchError(() => of(null))), { initialValue: undefined });

	// ----- Cliente -----
	protected readonly client = signal<Client | null>(null);
	protected readonly draft = signal<NewClientDraft>(EMPTY_NEW_CLIENT);
	protected readonly clientErrors = computed(() => newClientErrors(this.draft()));

	// ----- Pedido -----
	protected readonly deliveryTime = signal('');
	protected readonly driverId = signal<number | null>(null);

	// Catálogo: con cliente existente, con SUS precios; con cliente nuevo, precios base.
	// [] mientras no hay cliente elegido (el editor no se muestra todavía).
	protected readonly catalog = toSignal<readonly ProductCatalogItem[] | null | undefined>(
		toObservable(computed(() => (this.mode() === 'new' ? 'base' : (this.client()?.id_client ?? null)))).pipe(
			switchMap((source) =>
				source === null
					? of<readonly ProductCatalogItem[]>([])
					: this.products.getCatalog(source === 'base' ? undefined : source).pipe(
							startWith(undefined),
							catchError(() => of(null))
						)
			)
		),
		{ initialValue: undefined }
	);

	// Los productos empiezan vacíos y se reinician al cambiar de formulario o de cliente
	protected readonly lines = linkedSignal<{ mode: OrderMode; idClient: number | null }, EditorLine[]>({
		source: () => ({ mode: this.mode(), idClient: this.client()?.id_client ?? null }),
		computation: () => [],
	});

	// Se muestra desde que se sabe a quién va el pedido
	protected readonly showOrderFields = computed(() => this.mode() === 'new' || this.client() !== null);

	protected readonly submitted = signal(false); // tras el primer intento, se muestran los errores
	protected readonly saving = signal(false);
	protected readonly serverErrors = signal<string[]>([]);

	protected readonly itemsError = computed(() => itemsProblem(this.lines()));
	protected readonly missingClient = computed(() => this.mode() === 'existing' && this.client() === null);
	protected readonly canSubmit = computed(() => {
		if (this.saving()) return false;
		const clientOk = this.mode() === 'existing' ? this.client() !== null : !hasErrors(this.clientErrors());
		return clientOk && this.itemsError() === null;
	});

	protected setMode(mode: OrderMode): void {
		if (this.saving() || this.mode() === mode) return;
		this.mode.set(mode);
		this.submitted.set(false);
		this.serverErrors.set([]);
	}

	protected patchDraft(patch: Partial<NewClientDraft>): void {
		this.draft.update((draft) => ({ ...draft, ...patch }));
	}

	protected setNeighborhood(value: string): void {
		this.patchDraft({ idNeighborhood: value ? Number(value) : null });
	}

	protected setDriver(value: string): void {
		this.driverId.set(value ? Number(value) : null);
	}

	protected async submit(): Promise<void> {
		this.submitted.set(true);
		if (!this.canSubmit()) return;

		const extras = { deliveryTime: this.deliveryTime(), driverId: this.driverId() };
		const client = this.client();
		this.saving.set(true);
		this.serverErrors.set([]);
		try {
			const order = await firstValueFrom(
				this.mode() === 'existing' && client
					? this.orders.createForExistingClient(buildExistingClientOrder(client.id_client, this.lines(), extras))
					: this.orders.createForNewClient(buildNewClientOrder(this.draft(), this.lines(), extras))
			);
			this.created.emit(order);
		} catch (error) {
			this.serverErrors.set(describeApiError(await parseApiErrorAsync(error)));
		} finally {
			this.saving.set(false);
		}
	}
}
