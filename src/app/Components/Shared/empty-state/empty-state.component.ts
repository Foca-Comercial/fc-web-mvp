// ==================================================
// Componente: <app-empty-state>
// ==================================================
// Mensaje cuando no hay datos (tabla vacía, sin resultados). Lo que se escriba dentro
// aparece debajo (normalmente un botón de acción).
//
//   <app-empty-state icon="inbox" title="No hay pedidos pendientes" description="Los nuevos pedidos aparecerán aquí.">
//     <button type="button" class="btn-primary">Nuevo pedido</button>
//   </app-empty-state>

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from '@components/Shared/icon/icon.component';
import { IconName } from '@components/Shared/icon/icons';

@Component({
	selector: 'app-empty-state',
	imports: [IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'flex flex-col items-center justify-center gap-3 px-6 py-14 text-center' },
	template: `
		<span class="grid size-14 place-items-center rounded-full bg-brand-100 text-brand-700">
			<app-icon [name]="icon()" size="size-7" />
		</span>
		<div>
			<p class="text-base font-bold text-brand-950">{{ title() }}</p>
			@if (description()) {
				<p class="mt-1 max-w-sm text-sm text-slate-500">{{ description() }}</p>
			}
		</div>
		<ng-content />
	`,
})
export class EmptyStateComponent {
	readonly icon = input<IconName>('inbox');
	readonly title = input.required<string>();
	readonly description = input<string | null>(null);
}
