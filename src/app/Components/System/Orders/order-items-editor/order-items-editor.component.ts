// ==================================================
// Componente: <app-order-items-editor>
// ==================================================
// Lista editable de productos de un pedido: cantidad (− [n] +), precio unitario editable,
// subtotal, quitar, y un buscador para agregar cualquier producto del catálogo (entra con
// el precio que aplica al cliente, que se puede cambiar). Sirve para editar un pedido
// pendiente y para registrar pedidos nuevos.
//
//   <app-order-items-editor [(lines)]="lines" [original]="saved()" [catalog]="catalog()" />
//
// `original` son los renglones ya guardados: al volver a agregar un producto que se quitó,
// recupera su renglón. La lógica está en Core/Utils/order-items.utils.

import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

import { IconComponent } from '@components/Shared/icon/icon.component';
import { ItemPickerComponent } from '@components/Shared/item-picker/item-picker.component';
import { PickerOption } from '@components/Shared/item-picker/item-picker.utils';
import { ProductCatalogItem } from '@core/Models/CoreModule/catalog.model';
import { NumericInputDirective } from '@core/Directives/numeric-input.directive';
import { CopCurrencyPipe } from '@core/Pipes/cop-currency.pipe';
import {
	EditorLine,
	addCatalogLine,
	catalogPickerOptions,
	lineSubtotal,
	linesTotal,
	parsePrice,
	removeLine,
	sanitizePrice,
	setLinePrice,
	setLineQuantity,
} from '@core/Utils/order-items.utils';

const MAX_QUANTITY_DIGITS = 4;

@Component({
	selector: 'app-order-items-editor',
	imports: [IconComponent, ItemPickerComponent, NumericInputDirective, CopCurrencyPipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './order-items-editor.component.html',
})
export class OrderItemsEditorComponent {
	readonly lines = model.required<EditorLine[]>();
	readonly original = input<readonly EditorLine[]>([]);
	// null = no se pudo cargar el catálogo (se puede editar lo que ya hay, pero no agregar)
	readonly catalog = input<readonly ProductCatalogItem[] | null>([]);
	readonly disabled = input(false);

	protected readonly maxQuantityDigits = MAX_QUANTITY_DIGITS;
	protected readonly total = computed(() => linesTotal(this.lines()));
	protected readonly options = computed<PickerOption[]>(() => catalogPickerOptions(this.catalog() ?? [], this.lines()));
	protected readonly subtotal = lineSubtotal;
	protected readonly hasPrice = (line: EditorLine): boolean => parsePrice(line.priceText) !== null;

	protected add(idProduct: number): void {
		const product = this.catalog()?.find((item) => item.id_product === idProduct);
		if (product) this.lines.update((lines) => addCatalogLine(lines, product, this.original()));
	}

	protected remove(line: EditorLine): void {
		this.lines.update((lines) => removeLine(lines, line.id_product));
	}

	protected step(line: EditorLine, delta: number): void {
		this.lines.update((lines) => setLineQuantity(lines, line.id_product, line.cant + delta));
	}

	protected setQuantity(line: EditorLine, raw: string): void {
		this.lines.update((lines) => setLineQuantity(lines, line.id_product, Number(raw)));
	}

	protected setPrice(line: EditorLine, field: HTMLInputElement): void {
		// Se escribe de vuelta el texto limpio: si no cambió el valor, Angular no tocaría el campo
		const clean = sanitizePrice(field.value);
		field.value = clean;
		this.lines.update((lines) => setLinePrice(lines, line.id_product, clean));
	}
}
