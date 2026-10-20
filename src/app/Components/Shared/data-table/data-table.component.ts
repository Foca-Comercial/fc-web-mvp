// ==================================================
// Componente: <app-data-table>
// ==================================================
// Envoltorio con el estilo de tabla de la marca. Se usa con una <table> normal adentro,
// así cada vista decide sus columnas y celdas con total libertad:
//
//   <app-data-table>
//     <table>
//       <thead><tr><th>ID</th><th>Cliente</th></tr></thead>
//       <tbody>@for (row of rows(); track row.id) { <tr><td>…</td></tr> }</tbody>
//     </table>
//   </app-data-table>
//
// Mientras carga: <tbody app-table-skeleton [rows]="8" [columns]="7"></tbody>
//
// Los estilos van con `:where()` (especificidad cero) dentro de `@layer components`, así
// cualquier utilidad de Tailwind sobre un th/td (text-left, w-24, font-mono…) los pisa.
// Encapsulación None: la tabla es contenido proyectado de la vista que la usa.

import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

@Component({
	selector: 'app-data-table',
	changeDetection: ChangeDetectionStrategy.OnPush,
	encapsulation: ViewEncapsulation.None,
	template: `<ng-content />`,
	styles: `
		@layer components {
			app-data-table {
				display: block;
				overflow-x: auto;
			}

			:where(app-data-table table) {
				width: 100%;
				min-width: 52rem;
				border-collapse: collapse;
			}

			:where(app-data-table thead th) {
				background-color: var(--color-brand-200);
				color: var(--color-brand-900);
				padding: 1rem;
				font-size: 0.75rem;
				font-weight: 700;
				letter-spacing: 0.06em;
				text-align: center;
				text-transform: uppercase;
				white-space: nowrap;
			}

			:where(app-data-table tbody td) {
				padding: 0.75rem 1rem;
				font-size: 0.875rem;
				color: var(--color-slate-700);
				text-align: center;
				vertical-align: middle;
			}

			:where(app-data-table tbody tr) {
				border-bottom: 1px solid var(--color-slate-200);
				transition: background-color 0.15s;
			}

			:where(app-data-table tbody tr:hover) {
				background-color: var(--color-brand-50);
			}
		}
	`,
})
export class DataTableComponent {}
