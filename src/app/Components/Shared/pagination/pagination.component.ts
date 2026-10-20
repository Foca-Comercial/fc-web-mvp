// ==================================================
// Componente: <app-pagination>
// ==================================================
// Paginación numérica (← 1 2 3 … 10 →). No sabe de datos: recibe la página y el total
// de páginas y avisa el cambio. Si hay una sola página, no se muestra.
//
//   <app-pagination [totalPages]="pages()" [(page)]="page" />

import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

import { IconComponent } from '@components/Shared/icon/icon.component';
import { buildPageItems } from './pagination.utils';

@Component({
	selector: 'app-pagination',
	imports: [IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'block' },
	template: `
		@if (totalPages() > 1) {
			<nav aria-label="Paginación" class="flex flex-wrap items-center justify-center gap-1 py-4">
				<button
					type="button"
					class="grid size-9 place-items-center rounded-lg text-slate-600 transition hover:bg-brand-50 hover:text-brand-900 disabled:pointer-events-none disabled:opacity-40"
					aria-label="Página anterior"
					[disabled]="page() <= 1"
					(click)="go(page() - 1)"
				>
					<app-icon name="chevron-left" size="size-4" />
				</button>

				@for (item of items(); track $index) {
					@if (item; as pageNumber) {
						<button
							type="button"
							class="grid size-9 place-items-center rounded-lg text-sm font-semibold tabular-nums transition"
							[class]="pageNumber === page() ? 'bg-brand-200 text-brand-950' : 'text-slate-700 hover:bg-brand-50 hover:text-brand-900'"
							[attr.aria-label]="'Página ' + pageNumber"
							[attr.aria-current]="pageNumber === page() ? 'page' : null"
							(click)="go(pageNumber)"
						>
							{{ pageNumber }}
						</button>
					} @else {
						<span class="grid size-9 place-items-center text-slate-400" aria-hidden="true">…</span>
					}
				}

				<button
					type="button"
					class="grid size-9 place-items-center rounded-lg text-slate-600 transition hover:bg-brand-50 hover:text-brand-900 disabled:pointer-events-none disabled:opacity-40"
					aria-label="Página siguiente"
					[disabled]="page() >= totalPages()"
					(click)="go(page() + 1)"
				>
					<app-icon name="chevron-right" size="size-4" />
				</button>
			</nav>
		}
	`,
})
export class PaginationComponent {
	readonly page = model(1);
	readonly totalPages = input.required<number>();

	protected readonly items = computed(() => buildPageItems(this.page(), this.totalPages()));

	protected go(target: number): void {
		const clamped = Math.min(Math.max(target, 1), this.totalPages());
		if (clamped !== this.page()) this.page.set(clamped);
	}
}
