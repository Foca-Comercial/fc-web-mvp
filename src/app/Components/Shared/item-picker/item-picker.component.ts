// ==================================================
// Componente: <app-item-picker>
// ==================================================
// Buscador desplegable para AGREGAR elementos a una lista (p. ej. productos a un pedido).
// Se escribe el código o el nombre, o se elige de la lista; al elegir avisa con
// `(picked)` y la caja queda limpia y con el foco para agregar el siguiente.
// Accesible (patrón combobox de WAI-ARIA): ↑ ↓ para moverse, Enter para elegir, Esc
// para cerrar la lista. Si se escribe un código exacto, Enter lo agrega de una vez.
//
//   <app-item-picker placeholder="Agregar producto…" [options]="options()" (picked)="add($event)" />
//   options = [{ id: 3, code: '001', label: 'Bolsa 6L', meta: '$ 12.500', badge: 'Pactado' }, …]
//
// Búsqueda en el servidor (`remote`): no filtra aquí; avisa lo escrito con `(queryChange)`
// (con espera de `debounceMs`) y muestra las `options` que le devuelvan, con `loading`.
//
//   <app-item-picker remote [options]="clientOptions()" [loading]="searching()"
//                    (queryChange)="search($event)" (picked)="assign($event)" />
//
// La lista se pinta dentro del componente (no en un overlay): así funciona también dentro
// de un <dialog> modal, que vuelve inerte todo lo que está por fuera.

import {
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	input,
	output,
	signal,
} from '@angular/core';

import { IconComponent } from '@components/Shared/icon/icon.component';
import { filterPickerOptions, PickerOption } from './item-picker.utils';

let nextId = 0;

@Component({
	selector: 'app-item-picker',
	imports: [IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'relative block' },
	template: `
		<div
			class="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 transition focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-500/25 hover:border-slate-400"
		>
			<app-icon name="magnifying-glass" size="size-4" class="text-slate-400" />
			<input
				type="text"
				role="combobox"
				autocomplete="off"
				aria-autocomplete="list"
				class="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
				[placeholder]="placeholder()"
				[attr.aria-label]="ariaLabel() || placeholder()"
				[attr.aria-expanded]="open()"
				[attr.aria-controls]="listId"
				[attr.aria-activedescendant]="open() && activeOption() ? optionId(activeIndex()) : null"
				[value]="query()"
				(input)="onInput($any($event.target).value)"
				(focus)="open.set(true)"
				(click)="open.set(true)"
				(blur)="open.set(false)"
				(keydown)="onKeydown($event)"
			/>
			<app-icon name="chevron-down" size="size-4" class="text-slate-400 transition-transform" [class.rotate-180]="open()" />
		</div>

		@if (open()) {
			<ul
				[id]="listId"
				role="listbox"
				class="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-glass"
			>
				@for (option of filtered(); track option.id; let i = $index) {
					<li
						role="option"
						[id]="optionId(i)"
						[attr.aria-selected]="i === activeIndex()"
						class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
						[class]="i === activeIndex() ? 'bg-brand-50 text-brand-950' : 'text-slate-700'"
						(mousedown)="$event.preventDefault()"
						(mouseenter)="activeIndex.set(i)"
						(click)="pick(option)"
					>
						@if (option.code) {
							<span class="w-10 shrink-0 font-semibold tabular-nums text-brand-900">{{ option.code }}</span>
						}
						<span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
						@if (option.badge) {
							<span class="shrink-0 rounded-md bg-success-100 px-1.5 py-0.5 text-[11px] font-semibold text-success-800">
								{{ option.badge }}
							</span>
						}
						@if (option.meta) {
							<span class="max-w-[45%] shrink-0 truncate tabular-nums text-slate-500">{{ option.meta }}</span>
						}
					</li>
				} @empty {
					<li class="px-3 py-2.5 text-sm text-slate-500">
						@if (loading()) {
							Buscando…
						} @else {
							{{ query() ? noMatchText() : emptyText() }}
						}
					</li>
				}
			</ul>
		}
	`,
})
export class ItemPickerComponent {
	readonly options = input.required<readonly PickerOption[]>();
	readonly placeholder = input('Buscar…');
	readonly ariaLabel = input('');
	readonly noMatchText = input('Ningún elemento coincide con la búsqueda.');
	readonly emptyText = input('No hay más elementos para agregar.');
	// Búsqueda en el servidor: no filtra localmente y avisa lo escrito con `queryChange`
	readonly remote = input(false, { transform: booleanAttribute });
	readonly loading = input(false);
	readonly debounceMs = input(300);

	readonly picked = output<number>();
	readonly queryChange = output<string>();

	protected readonly listId = `item-picker-${nextId++}`;
	protected readonly query = signal('');
	protected readonly open = signal(false);
	protected readonly activeIndex = signal(0);

	protected readonly filtered = computed(() =>
		this.remote() ? [...this.options()] : filterPickerOptions(this.options(), this.query())
	);

	private timer: ReturnType<typeof setTimeout> | null = null;

	constructor() {
		inject(DestroyRef).onDestroy(() => this.cancelTimer());
	}
	protected readonly activeOption = computed(() => this.filtered()[this.activeIndex()] ?? null);

	protected optionId(index: number): string {
		return `${this.listId}-option-${index}`;
	}

	protected onInput(text: string): void {
		this.query.set(text);
		this.activeIndex.set(0);
		this.open.set(true);
		if (this.remote()) {
			this.cancelTimer();
			this.timer = setTimeout(() => this.queryChange.emit(text.trim()), this.debounceMs());
		}
	}

	protected pick(option: PickerOption): void {
		this.picked.emit(option.id);
		this.query.set('');
		this.activeIndex.set(0);
		if (this.remote()) {
			this.cancelTimer();
			this.queryChange.emit('');
		}
	}

	private cancelTimer(): void {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	protected onKeydown(event: KeyboardEvent): void {
		const total = this.filtered().length;

		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowUp': {
				event.preventDefault();
				if (!this.open()) {
					this.open.set(true);
					return;
				}
				if (total === 0) return;
				const step = event.key === 'ArrowDown' ? 1 : -1;
				this.activeIndex.set((this.activeIndex() + step + total) % total);
				this.scrollActiveIntoView();
				return;
			}
			case 'Enter': {
				// Nunca envía el formulario que lo contenga
				event.preventDefault();
				const option = this.activeOption();
				if (this.open() && option) this.pick(option);
				return;
			}
			case 'Escape':
				// Con la lista abierta, Esc solo la cierra (no cierra el modal que lo contiene)
				if (this.open()) {
					event.preventDefault();
					event.stopPropagation();
					this.open.set(false);
				}
				return;
		}
	}

	private scrollActiveIntoView(): void {
		queueMicrotask(() => document.getElementById(this.optionId(this.activeIndex()))?.scrollIntoView({ block: 'nearest' }));
	}
}
