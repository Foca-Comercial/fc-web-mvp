// ==================================================
// Componente: <app-client-prices>
// ==================================================
// Precios especiales de un cliente registrado: uno por producto. Se usan al tomar pedidos
// (catálogo con su precio) y en las rutas (solo se ofrecen los productos con precio
// especial). Cambiar un precio aplica a los pedidos que se tomen después.
//
//   - Lista por código, con el precio base y la diferencia; el precio se edita en línea.
//   - Agregar: se elige un producto activo del catálogo y entra con su precio base.
//   - Quitar: confirmación en línea (esto vive dentro de un <dialog> modal, así que los
//     avisos y errores van en línea y no con SweetAlert).
//
// Se monta solo mientras el modal está abierto; avisa con (changed) tras cada cambio
// guardado para que la vista refresque el conteo de su tabla.
//
//   @if (pricesOpen()) {
//     <app-client-prices [client]="pricesClient()!" (changed)="table.reload()" (closed)="pricesOpen.set(false)" />
//   }

import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, firstValueFrom, Observable, of } from 'rxjs';

import { IconButtonComponent } from '@components/Shared/icon-button/icon-button.component';
import { ItemPickerComponent } from '@components/Shared/item-picker/item-picker.component';
import { SkeletonComponent } from '@components/Shared/skeleton/skeleton.component';
import { StatusBadgeComponent } from '@components/Shared/status-badge/status-badge.component';
import { ClientAdminRow, ClientSpecialPrice, ProductCatalogItem } from '@core/Models/CoreModule/catalog.model';
import { CopCurrencyPipe } from '@core/Pipes/cop-currency.pipe';
import { ClientService } from '@core/Service/CoreModule/client.service';
import { ProductService } from '@core/Service/CoreModule/product.service';
import { describeApiError, parseApiErrorAsync } from '@core/Utils/api-error.utils';
import {
	PriceDelta,
	isPriceChanged,
	priceDelta,
	pricePickerOptions,
	priceText,
	removePriceRow,
	toAgreedPrice,
	upsertPriceRow,
} from '@core/Utils/client-prices.utils';
import { sanitizePrice } from '@core/Utils/order-items.utils';

type Result<T> = { ok: true; data: T } | { ok: false };

// Producto que se está agregando, con el precio escrito
interface AddingPrice {
	product: ProductCatalogItem;
	text: string;
}

@Component({
	selector: 'app-client-prices',
	imports: [CopCurrencyPipe, IconButtonComponent, ItemPickerComponent, SkeletonComponent, StatusBadgeComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './client-prices.component.html',
})
export class ClientPricesComponent {
	private readonly clients = inject(ClientService);
	private readonly products = inject(ProductService);

	readonly client = input.required<ClientAdminRow>();
	readonly changed = output<void>();
	readonly closed = output<void>();

	// ----- Datos. undefined = cargando, null = no se pudo cargar -----
	protected readonly rows = signal<ClientSpecialPrice[] | null | undefined>(undefined);
	// Catálogo de productos activos con su precio base (para agregar)
	protected readonly catalog = toSignal(this.products.getCatalog().pipe(catchError(() => of(null))), {
		initialValue: undefined,
	});
	protected readonly options = computed(() => pricePickerOptions(this.catalog() ?? [], this.rows() ?? []));

	// ----- Edición -----
	// Precio escrito en cada renglón (id_product → texto); sin entrada = el guardado
	private readonly texts = signal<Record<number, string>>({});
	protected readonly adding = signal<AddingPrice | null>(null);
	protected readonly confirmRemove = signal<number | null>(null);
	protected readonly busy = signal<number | null>(null); // producto con una petición en vuelo
	protected readonly errors = signal<string[]>([]);

	constructor() {
		// Carga los precios al montarse (el modal lo monta al abrirse)
		effect(() => {
			const idClient = this.client().id_client;
			untracked(() => void this.load(idClient));
		});
	}

	// ----- Lectura -----
	protected textFor(row: ClientSpecialPrice): string {
		return this.texts()[row.id_product] ?? priceText(row.agreed_price);
	}

	protected changedRow(row: ClientSpecialPrice): boolean {
		return isPriceChanged(row, this.textFor(row));
	}

	protected deltaFor(row: ClientSpecialPrice): PriceDelta | null {
		return priceDelta(row.base_price, toAgreedPrice(this.textFor(row)));
	}

	protected addingDelta(adding: AddingPrice): PriceDelta | null {
		return priceDelta(adding.product.base_price, toAgreedPrice(adding.text));
	}

	protected validText(text: string): boolean {
		return toAgreedPrice(text) !== null;
	}

	// ----- Editar un precio -----
	protected setText(row: ClientSpecialPrice, field: HTMLInputElement): void {
		// Se escribe de vuelta el texto limpio: si no cambió el valor, Angular no tocaría el campo
		const clean = sanitizePrice(field.value);
		field.value = clean;
		this.texts.update((texts) => ({ ...texts, [row.id_product]: clean }));
	}

	protected async save(row: ClientSpecialPrice): Promise<void> {
		const price = toAgreedPrice(this.textFor(row));
		if (price === null || !this.changedRow(row)) return;
		const result = await this.run(row.id_product, this.clients.setSpecialPrice(this.client().id_client, row.id_product, price));
		if (!result.ok) return;
		this.rows.update((rows) => upsertPriceRow(rows ?? [], result.data));
		this.clearText(row.id_product);
		this.changed.emit();
	}

	protected undo(row: ClientSpecialPrice): void {
		this.clearText(row.id_product);
	}

	// ----- Quitar -----
	protected askRemove(row: ClientSpecialPrice): void {
		this.confirmRemove.set(row.id_product);
	}

	protected cancelRemove(): void {
		this.confirmRemove.set(null);
	}

	protected async remove(row: ClientSpecialPrice): Promise<void> {
		const result = await this.run(row.id_product, this.clients.removeSpecialPrice(this.client().id_client, row.id_product));
		this.confirmRemove.set(null);
		if (!result.ok) return;
		this.rows.update((rows) => removePriceRow(rows ?? [], row.id_product));
		this.clearText(row.id_product);
		this.changed.emit();
	}

	// ----- Agregar -----
	protected pick(idProduct: number): void {
		const product = this.catalog()?.find((item) => item.id_product === idProduct);
		if (product) this.adding.set({ product, text: priceText(product.base_price) });
	}

	protected setAddingText(field: HTMLInputElement): void {
		const clean = sanitizePrice(field.value);
		field.value = clean;
		this.adding.update((adding) => (adding ? { ...adding, text: clean } : adding));
	}

	protected cancelAdd(): void {
		this.adding.set(null);
	}

	protected async confirmAdd(): Promise<void> {
		const adding = this.adding();
		const price = adding ? toAgreedPrice(adding.text) : null;
		if (!adding || price === null) return;
		const idProduct = adding.product.id_product;
		const result = await this.run(idProduct, this.clients.setSpecialPrice(this.client().id_client, idProduct, price));
		if (!result.ok) return;
		this.rows.update((rows) => upsertPriceRow(rows ?? [], result.data));
		this.adding.set(null);
		this.changed.emit();
	}

	// ----- Interno -----
	protected retry(): void {
		void this.load(this.client().id_client);
	}

	private async load(idClient: number): Promise<void> {
		this.rows.set(undefined);
		this.errors.set([]);
		try {
			this.rows.set(await firstValueFrom(this.clients.getSpecialPrices(idClient)));
		} catch (error) {
			this.rows.set(null);
			this.errors.set(describeApiError(await parseApiErrorAsync(error)));
		}
	}

	// Una petición a la vez; el error se muestra en línea
	private async run<T>(idProduct: number, request: Observable<T>): Promise<Result<T>> {
		this.busy.set(idProduct);
		this.errors.set([]);
		try {
			// defaultValue: el DELETE (204) puede completar sin emitir
			return { ok: true, data: await firstValueFrom(request, { defaultValue: undefined as T }) };
		} catch (error) {
			this.errors.set(describeApiError(await parseApiErrorAsync(error)));
			return { ok: false };
		} finally {
			this.busy.set(null);
		}
	}

	private clearText(idProduct: number): void {
		this.texts.update((texts) => {
			const next = { ...texts };
			delete next[idProduct];
			return next;
		});
	}
}
