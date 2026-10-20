// ==================================================
// Componente: <app-filter-select>
// ==================================================
// Filtro desplegable en forma de píldora con su etiqueta adentro ("Zonas: Todas las
// zonas"). Usa el <select> nativo: accesible, con teclado y bien en móvil.
// `value` es texto; la opción "todas" tiene valor '' (vacío).
//
//   <app-filter-select label="Zonas" allLabel="Todas las zonas" [options]="zoneOptions()" [(value)]="zone" />
//   zoneOptions = [{ value: '3', label: 'Norte' }, …]

import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { IconComponent } from '@components/Shared/icon/icon.component';

export interface FilterOption {
	value: string;
	label: string;
}

@Component({
	selector: 'app-filter-select',
	imports: [IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'block' },
	template: `
		<label
			class="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 py-2.5 pl-3.5 pr-9 text-sm transition focus-within:border-brand-500 focus-within:bg-white focus-within:ring-3 focus-within:ring-brand-500/25 hover:bg-slate-200/70"
		>
			<span class="shrink-0 text-slate-500">{{ label() }}:</span>
			<select
				class="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent font-semibold text-slate-900 outline-none"
				(change)="value.set($any($event.target).value)"
			>
				<option value="" [selected]="value() === ''">{{ allLabel() }}</option>
				@for (option of options(); track option.value) {
					<option [value]="option.value" [selected]="option.value === value()">{{ option.label }}</option>
				}
			</select>
			<app-icon name="chevron-down" size="size-4" class="pointer-events-none absolute right-3 text-slate-500" />
		</label>
	`,
})
export class FilterSelectComponent {
	readonly label = input.required<string>();
	readonly allLabel = input('Todos');
	readonly options = input.required<readonly FilterOption[]>();
	readonly value = model('');
}
