// ==================================================
// Componente: <app-page-size-select>
// ==================================================
// "Mostrar 25 por página": elige cuántas filas se ven por página en una tabla. Usa el
// <select> nativo. No sabe de datos; quien lo usa reinicia la página al cambiar el tamaño.
//
//   <app-page-size-select [options]="pageSizeOptions" [(size)]="pageSize" />

import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { IconComponent } from '@components/Shared/icon/icon.component';

@Component({
	selector: 'app-page-size-select',
	imports: [IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'inline-block' },
	template: `
		<label class="flex items-center gap-2 text-xs text-slate-500">
			Mostrar
			<span class="relative">
				<select
					class="cursor-pointer appearance-none rounded-lg border border-slate-200 bg-slate-100 py-1.5 pl-3 pr-8 text-sm font-semibold text-slate-900 outline-none transition hover:bg-slate-200/70 focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/25"
					(change)="size.set(+$any($event.target).value)"
				>
					@for (option of options(); track option) {
						<option [value]="option" [selected]="option === size()">{{ option }}</option>
					}
				</select>
				<app-icon name="chevron-down" size="size-4" class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" />
			</span>
			por página
		</label>
	`,
})
export class PageSizeSelectComponent {
	readonly options = input.required<readonly number[]>();
	readonly size = model.required<number>();
}
