// ==================================================
// Componente: <app-product-form>
// ==================================================
// Formulario de producto del panel de administración: crea (POST /products/admin) o
// edita (PATCH /products/admin/{id}, solo lo que cambió).
//   - Código de 3 dígitos, único. Si el producto ya tiene pedidos (`in_use`) el código
//     no se puede cambiar: lo usan el cierre, Siigo y el archivado.
//   - Nombre, descripción opcional (se guardan en mayúsculas) y precio base.
//
// Se monta solo mientras el modal está abierto. Los errores de la API van en línea
// porque esto vive dentro de un <dialog> modal.
//
//   @if (formOpen()) {
//     <app-product-form [product]="editing()" (saved)="onSaved($event)" (cancelled)="…" />
//   }

import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { NumericInputDirective } from '@core/Directives/numeric-input.directive';
import { ProductAdminRow } from '@core/Models/CoreModule/catalog.model';
import { ProductService } from '@core/Service/CoreModule/product.service';
import {
	MAX_PRODUCT_DESCRIPTION_LENGTH,
	MAX_PRODUCT_NAME_LENGTH,
	PRODUCT_CODE_DIGITS,
	ProductDraft,
	draftFromProduct,
	hasProductChanges,
	hasProductErrors,
	productChanges,
	productErrors,
	toProductCreate,
} from '@core/Utils/admin-products.utils';
import { describeApiError, parseApiErrorAsync } from '@core/Utils/api-error.utils';
import { sanitizePrice } from '@core/Utils/order-items.utils';

@Component({
	selector: 'app-product-form',
	imports: [NumericInputDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './product-form.component.html',
})
export class ProductFormComponent {
	private readonly products = inject(ProductService);

	// null = producto nuevo
	readonly product = input<ProductAdminRow | null>(null);
	readonly saved = output<ProductAdminRow>();
	readonly cancelled = output<void>();

	protected readonly codeDigits = PRODUCT_CODE_DIGITS;
	protected readonly maxName = MAX_PRODUCT_NAME_LENGTH;
	protected readonly maxDescription = MAX_PRODUCT_DESCRIPTION_LENGTH;

	protected readonly isEdit = computed(() => this.product() !== null);
	// Con pedidos, el código queda fijo (la API también lo rechaza: PRODUCT_CODE_IN_USE)
	protected readonly codeLocked = computed(() => this.product()?.in_use ?? false);
	protected readonly draft = linkedSignal<ProductDraft>(() => draftFromProduct(this.product()));
	protected readonly errors = computed(() => productErrors(this.draft()));

	// En edición solo se envía lo que cambió; sin cambios no hay nada que guardar
	private readonly changes = computed(() => {
		const product = this.product();
		return product ? productChanges(product, this.draft()) : null;
	});
	protected readonly unchanged = computed(() => {
		const changes = this.changes();
		return changes !== null && !hasProductChanges(changes);
	});

	protected readonly submitted = signal(false); // tras el primer intento, se muestran los errores
	protected readonly saving = signal(false);
	protected readonly serverErrors = signal<string[]>([]);

	protected patchDraft(patch: Partial<ProductDraft>): void {
		this.draft.update((draft) => ({ ...draft, ...patch }));
	}

	protected setPrice(field: HTMLInputElement): void {
		// Se escribe de vuelta el texto limpio: si no cambió el valor, Angular no tocaría el campo
		const clean = sanitizePrice(field.value);
		field.value = clean;
		this.patchDraft({ priceText: clean });
	}

	protected async submit(): Promise<void> {
		this.submitted.set(true);
		if (this.saving() || hasProductErrors(this.errors()) || this.unchanged()) return;

		const product = this.product();
		const changes = this.changes();
		this.saving.set(true);
		this.serverErrors.set([]);
		try {
			const row = await firstValueFrom(
				product && changes
					? this.products.updateAdmin(product.id_product, changes)
					: this.products.createAdmin(toProductCreate(this.draft()))
			);
			this.saved.emit(row);
		} catch (error) {
			this.serverErrors.set(describeApiError(await parseApiErrorAsync(error)));
		} finally {
			this.saving.set(false);
		}
	}
}
