// ==================================================
// Componente: <button app-icon-button>
// ==================================================
// Botón cuadrado solo con icono (ver, asignar, editar…). Como no tiene texto, `label`
// es obligatorio: sirve de nombre accesible y de tooltip.
//
//   <button app-icon-button icon="eye" label="Ver detalle" (click)="view(row)"></button>
//   <button app-icon-button icon="user-plus" tone="primary" label="Asignar domiciliario"></button>

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { IconComponent } from '@components/Shared/icon/icon.component';
import { IconName } from '@components/Shared/icon/icons';

export type IconButtonTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const TONES: Record<IconButtonTone, string> = {
	neutral: 'bg-slate-200 text-slate-800 hover:bg-slate-300',
	primary: 'bg-brand-700 text-white hover:bg-brand-800',
	success: 'bg-success-100 text-success-800 hover:bg-success-200',
	warning: 'bg-warning-100 text-warning-800 hover:bg-warning-200',
	danger: 'bg-danger-600 text-white hover:bg-danger-700',
};

@Component({
	selector: 'button[app-icon-button]',
	imports: [IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		'[class]': 'hostClass()',
		'[attr.aria-label]': 'label()',
		'[attr.title]': 'label()',
		'[attr.type]': '"button"',
	},
	template: `<app-icon [name]="icon()" size="size-5" />`,
})
export class IconButtonComponent {
	readonly icon = input.required<IconName>();
	readonly label = input.required<string>();
	readonly tone = input<IconButtonTone>('neutral');

	protected readonly hostClass = computed(
		() => `grid size-9 place-items-center rounded-lg transition disabled:pointer-events-none disabled:opacity-50 ${TONES[this.tone()]}`
	);
}
