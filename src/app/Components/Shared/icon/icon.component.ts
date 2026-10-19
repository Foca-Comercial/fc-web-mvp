// ==================================================
// Componente: <app-icon>
// ==================================================
// Icono Heroicons (outline) en SVG inline. Toma el color del texto (currentColor), así
// que el color se pone con `class` en el propio <app-icon>; el tamaño va en `size`
// como clase de Tailwind (por defecto size-5 = 1.25rem).
//
//   <app-icon name="eye" size="size-4" class="text-slate-500" />
//
// Es decorativo (aria-hidden): el botón o enlace que lo contiene debe llevar su
// propio aria-label o texto.

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ICONS, IconName } from './icons';

@Component({
	selector: 'app-icon',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'inline-flex shrink-0' },
	template: `
		<svg
			[class]="size()"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			[attr.stroke-width]="strokeWidth()"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			@for (d of paths(); track $index) {
				<path [attr.d]="d" />
			}
		</svg>
	`,
})
export class IconComponent {
	readonly name = input.required<IconName>();
	readonly size = input('size-5');
	readonly strokeWidth = input(1.5);

	protected readonly paths = computed(() => ICONS[this.name()]);
}
