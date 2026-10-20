// ==================================================
// Componente: <tbody app-table-skeleton>
// ==================================================
// Filas de relleno con la forma de la tabla mientras carga. Va en lugar del <tbody>
// real, dentro de <app-data-table>:
//
//   @if (loading()) { <tbody app-table-skeleton [rows]="8" [columns]="7"></tbody> }
//   @else { <tbody>…</tbody> }

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { SkeletonComponent } from './skeleton.component';

@Component({
	selector: 'tbody[app-table-skeleton]',
	imports: [SkeletonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { role: 'presentation', 'aria-busy': 'true' },
	template: `
		@for (row of rowList(); track row) {
			<tr>
				@for (column of columnList(); track column) {
					<td>
						<app-skeleton class="mx-auto h-4 w-full max-w-24 rounded-md" />
					</td>
				}
			</tr>
		}
	`,
})
export class TableSkeletonComponent {
	readonly rows = input(8);
	readonly columns = input.required<number>();

	protected readonly rowList = computed(() => Array.from({ length: this.rows() }, (_, index) => index));
	protected readonly columnList = computed(() => Array.from({ length: this.columns() }, (_, index) => index));
}
