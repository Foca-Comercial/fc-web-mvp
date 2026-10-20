// ==================================================
// Componente: <app-search-input>
// ==================================================
// Caja de búsqueda con lupa y botón de limpiar. Espera `debounceMs` después de la
// última tecla antes de actualizar `value` (para no consultar en cada letra); Enter y
// limpiar actualizan al instante.
//
//   <app-search-input placeholder="Buscar N° pedido o cliente" [(value)]="search" />

import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, linkedSignal, model } from '@angular/core';

import { IconComponent } from '@components/Shared/icon/icon.component';

@Component({
	selector: 'app-search-input',
	imports: [IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'block' },
	template: `
		<label
			class="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm transition focus-within:border-brand-500 focus-within:bg-white focus-within:ring-3 focus-within:ring-brand-500/25 hover:bg-slate-200/70"
		>
			<app-icon name="magnifying-glass" size="size-5" class="text-slate-500" />
			<input
				type="search"
				class="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-500 [&::-webkit-search-cancel-button]:hidden"
				[placeholder]="placeholder()"
				[attr.aria-label]="ariaLabel() || placeholder()"
				[value]="draft()"
				(input)="onInput($any($event.target).value)"
				(keydown.enter)="flush()"
			/>
			@if (draft()) {
				<button
					type="button"
					class="grid size-6 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-300/70 hover:text-slate-800"
					aria-label="Limpiar búsqueda"
					(click)="clear()"
				>
					<app-icon name="x-mark" size="size-4" />
				</button>
			}
		</label>
	`,
})
export class SearchInputComponent {
	readonly value = model('');
	readonly placeholder = input('Buscar…');
	readonly ariaLabel = input('');
	readonly debounceMs = input(300);

	// Lo que se ve en la caja; se re-sincroniza si `value` cambia desde afuera
	protected readonly draft = linkedSignal(() => this.value());

	private timer: ReturnType<typeof setTimeout> | null = null;

	constructor() {
		inject(DestroyRef).onDestroy(() => this.cancelTimer());
	}

	protected onInput(text: string): void {
		this.draft.set(text);
		this.cancelTimer();
		this.timer = setTimeout(() => this.flush(), this.debounceMs());
	}

	protected flush(): void {
		this.cancelTimer();
		const text = this.draft().trim();
		if (text !== this.value()) this.value.set(text);
	}

	protected clear(): void {
		this.cancelTimer();
		this.draft.set('');
		this.value.set('');
	}

	private cancelTimer(): void {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}
}
