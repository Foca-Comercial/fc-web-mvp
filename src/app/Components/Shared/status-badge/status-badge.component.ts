// ==================================================
// Componente: <app-status-badge>
// ==================================================
// Píldora de estado con punto de color. El color nunca va solo: siempre lleva texto, y
// el punto refuerza (pero no reemplaza) el significado.
//
//   <app-status-badge tone="late">Retrasado</app-status-badge>
//
// Tonos: pending (azul) · soon (ámbar) · late (rojo) · done (verde) · neutral/cancelled (gris)

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeTone = 'pending' | 'soon' | 'late' | 'done' | 'cancelled' | 'danger' | 'neutral';

const TONES: Record<BadgeTone, { box: string; dot: string }> = {
	pending: { box: 'border-brand-300 bg-brand-50 text-brand-900', dot: 'bg-brand-600' },
	soon: { box: 'border-warning-300 bg-warning-50 text-warning-800', dot: 'bg-warning-500' },
	late: { box: 'border-danger-300 bg-danger-50 text-danger-700', dot: 'bg-danger-500 motion-safe:animate-pulse' },
	done: { box: 'border-success-300 bg-success-50 text-success-800', dot: 'bg-success-500' },
	cancelled: { box: 'border-slate-300 bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
	// Rojo fijo (sin el pulso de "late"): p. ej. un pedido cancelado en el histórico
	danger: { box: 'border-danger-300 bg-danger-50 text-danger-700', dot: 'bg-danger-500' },
	neutral: { box: 'border-slate-300 bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
};

@Component({
	selector: 'app-status-badge',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { '[class]': 'boxClass()', '[attr.title]': 'hint() || null' },
	template: `
		<span class="size-1.5 shrink-0 rounded-full" [class]="dotClass()" aria-hidden="true"></span>
		<ng-content />
	`,
})
export class StatusBadgeComponent {
	readonly tone = input<BadgeTone>('neutral');
	// Texto del tooltip nativo (opcional)
	readonly hint = input<string | null>(null);

	protected readonly boxClass = computed(
		() => `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${TONES[this.tone()].box}`
	);
	protected readonly dotClass = computed(() => TONES[this.tone()].dot);
}
