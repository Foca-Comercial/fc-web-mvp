// ==================================================
// Componente: <app-tabs>
// ==================================================
// Pestañas grandes que se pegan a la tarjeta de abajo (la activa es blanca y se funde
// con ella). Accesible: role tablist/tab, flechas ← → Inicio Fin para moverse.
// El contenido de cada pestaña lo pinta quien lo usa; conviene darle a su contenedor
// role="tabpanel", id="<idPrefix>-panel-<id>" y aria-labelledby="<idPrefix>-<id>".
//
//   <app-tabs [tabs]="tabs" [(selected)]="activeTab" />
//   tabs = [{ id: 'pending', label: 'Pedidos pendientes', count: 12 }, …]
//
// Variantes (`variant`):
//   'default' → pestañas a todo el ancho; la activa es blanca (tablero de despachos)
//   'slate'   → pestañas grandes grises que se funden con un panel bg-slate-300 (Rutas)

import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

export type TabsVariant = 'default' | 'slate';

const VARIANTS: Record<TabsVariant, { list: string; active: string; inactive: string; count: string }> = {
	default: {
		list: 'flex',
		active: 'flex-1 rounded-t-2xl px-4 py-3.5 text-base font-bold transition sm:text-lg bg-white text-brand-950',
		inactive:
			'flex-1 rounded-t-2xl px-4 py-3.5 text-base font-bold transition sm:text-lg bg-slate-300/60 text-slate-600 hover:bg-slate-300/90 hover:text-slate-900',
		count: 'bg-brand-100 text-brand-900',
	},
	slate: {
		list: 'flex gap-1',
		active:
			'flex-1 rounded-t-xl bg-slate-300 px-4 py-6 text-lg font-bold leading-8 text-slate-600 transition sm:flex-none sm:min-w-[346px] sm:px-8 sm:text-2xl xl:text-[32px]',
		inactive:
			'flex-1 rounded-t-xl bg-slate-300/45 px-4 py-6 text-lg font-bold leading-8 text-slate-500 transition hover:bg-slate-300/75 hover:text-slate-600 sm:flex-none sm:min-w-[346px] sm:px-8 sm:text-2xl xl:text-[32px]',
		count: 'bg-white/70 text-slate-700',
	},
};

export interface TabItem {
	id: string;
	label: string;
	count?: number;
}

@Component({
	selector: 'app-tabs',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'block' },
	template: `
		<div role="tablist" [class]="styles().list" (keydown)="onKeydown($event)">
			@for (tab of tabs(); track tab.id) {
				<button
					type="button"
					role="tab"
					[id]="idPrefix() + '-' + tab.id"
					[attr.aria-selected]="tab.id === selected()"
					[attr.aria-controls]="idPrefix() + '-panel-' + tab.id"
					[attr.tabindex]="tab.id === selected() ? 0 : -1"
					[class]="tab.id === selected() ? styles().active : styles().inactive"
					(click)="select(tab.id)"
				>
					{{ tab.label }}
					@if (tab.count !== undefined) {
						<span
							class="ml-2 rounded-full px-2 py-0.5 text-xs font-semibold"
							[class]="tab.id === selected() ? styles().count : 'bg-white/70 text-slate-600'"
						>
							{{ tab.count }}
						</span>
					}
				</button>
			}
		</div>
	`,
})
export class TabsComponent {
	readonly tabs = input.required<readonly TabItem[]>();
	readonly selected = model.required<string>();
	// Evita ids repetidos si hubiera dos grupos de pestañas en la misma página
	readonly idPrefix = input('tab');
	readonly variant = input<TabsVariant>('default');

	protected readonly styles = computed(() => VARIANTS[this.variant()]);

	protected select(id: string): void {
		this.selected.set(id);
	}

	protected onKeydown(event: KeyboardEvent): void {
		const tabs = this.tabs();
		const current = tabs.findIndex((tab) => tab.id === this.selected());
		let next = current;

		switch (event.key) {
			case 'ArrowRight':
				next = (current + 1) % tabs.length;
				break;
			case 'ArrowLeft':
				next = (current - 1 + tabs.length) % tabs.length;
				break;
			case 'Home':
				next = 0;
				break;
			case 'End':
				next = tabs.length - 1;
				break;
			default:
				return;
		}

		event.preventDefault();
		const id = tabs[next].id;
		this.select(id);
		// El foco sigue a la pestaña activa (patrón WAI-ARIA)
		queueMicrotask(() => document.getElementById(`${this.idPrefix()}-${id}`)?.focus());
	}
}
