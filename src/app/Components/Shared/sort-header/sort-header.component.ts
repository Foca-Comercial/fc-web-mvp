// ==================================================
// Componente: <th app-sort-header>
// ==================================================
// Encabezado de columna que se ordena en el servidor al hacer clic. Va sobre un <th> de una
// tabla con ServerTable (la `key` es el campo que la API acepta en `sort_by`):
//
//   <th app-sort-header sortKey="client_name" [sort]="table.sort()" (sortRequested)="table.toggleSort($event)">
//   	Cliente
//   </th>
//
// Cada clic recorre ascendente → descendente → orden por defecto de la tabla (ver
// `ServerTable.toggleSort`). Un encabezado sin orden se deja como <th scope="col"> normal.

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IconComponent } from '@components/Shared/icon/icon.component';
import { TableSort, sortIcon, sortState } from '@core/Utils/table-sort.utils';

@Component({
	selector: 'th[app-sort-header]',
	imports: [IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { scope: 'col', '[attr.aria-sort]': 'ariaSort()' },
	template: `
		<button
			type="button"
			class="inline-flex items-center justify-center gap-1 uppercase transition hover:text-brand-950"
			(click)="sortRequested.emit(sortKey())"
		>
			<ng-content />
			<app-icon [name]="icon()" size="size-3.5" />
		</button>
	`,
})
export class SortHeaderComponent {
	// Campo de la API por el que ordena esta columna
	readonly sortKey = input.required<string>();
	// Orden actual de la tabla (`table.sort()`)
	readonly sort = input<TableSort | null>(null);
	// Pide ordenar por esta columna: emite su `sortKey`
	readonly sortRequested = output<string>();

	protected readonly ariaSort = computed(() => sortState(this.sort(), this.sortKey()));
	protected readonly icon = computed(() => sortIcon(this.sort(), this.sortKey()));
}
