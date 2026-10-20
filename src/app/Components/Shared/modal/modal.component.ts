// ==================================================
// Componente: <app-modal>
// ==================================================
// Ventana modal sobre el <dialog> nativo: el navegador ya se encarga de atrapar el foco,
// cerrar con Escape y devolver el foco a quien la abrió. Aquí solo se le pone la marca.
// Cierra con la X, con Escape y al hacer clic en el fondo oscuro.
//
//   <app-modal title="Pedido 004" [(open)]="detailOpen">
//     …contenido…
//     <div modal-footer> <button class="btn-secondary" (click)="detailOpen.set(false)">Cerrar</button> </div>
//   </app-modal>
//
// El contenido se queda montado aunque esté cerrada; para que no trabaje de más,
// envolverlo en `@if (open())` cuando haga peticiones.

import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	ElementRef,
	effect,
	inject,
	input,
	model,
	viewChild,
} from '@angular/core';
import { IconButtonComponent } from '@components/Shared/icon-button/icon-button.component';

let nextId = 0;

@Component({
	selector: 'app-modal',
	imports: [IconButtonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<dialog
			#dialog
			class="m-auto max-h-[90dvh] w-[calc(100%-2rem)] overflow-hidden rounded-2xl bg-white p-0 text-slate-800 shadow-glass backdrop:bg-brand-950/50 backdrop:backdrop-blur-sm"
			[class]="maxWidth()"
			[attr.aria-labelledby]="titleId"
			(close)="onNativeClose()"
			(click)="onDialogClick($event)"
		>
			<div class="flex max-h-[90dvh] flex-col">
				<header class="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
					<h2 [id]="titleId" class="text-lg font-bold text-brand-950">{{ title() }}</h2>
					<button app-icon-button icon="x-mark" label="Cerrar" (click)="close()"></button>
				</header>
				<div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
					<ng-content />
				</div>
				<footer class="empty:hidden border-t border-slate-200 bg-slate-50 px-6 py-4">
					<ng-content select="[modal-footer]" />
				</footer>
			</div>
		</dialog>
	`,
	styles: `
		@media (prefers-reduced-motion: no-preference) {
			dialog[open] {
				animation: modal-in 0.18s ease-out;
			}
			dialog[open]::backdrop {
				animation: modal-fade 0.18s ease-out;
			}
		}
		@keyframes modal-in {
			from {
				opacity: 0;
				transform: translateY(0.75rem) scale(0.98);
			}
		}
		@keyframes modal-fade {
			from {
				opacity: 0;
			}
		}
	`,
})
export class ModalComponent {
	readonly open = model(false);
	readonly title = input.required<string>();
	// Ancho máximo como clase de Tailwind (max-w-2xl por defecto)
	readonly maxWidth = input('max-w-2xl');

	protected readonly titleId = `modal-title-${nextId++}`;
	// Sin `.required`: el efecto corre una vez antes de que exista la vista y la consulta aún está vacía
	private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

	constructor() {
		// Sincroniza el modelo `open` con el estado real del <dialog>
		effect(() => {
			const element = this.dialog()?.nativeElement;
			if (!element) return;
			if (this.open() && !element.open) {
				element.showModal();
				this.lockScroll(true);
			} else if (!this.open() && element.open) {
				element.close();
			}
		});

		inject(DestroyRef).onDestroy(() => this.lockScroll(false));
	}

	protected close(): void {
		this.open.set(false);
	}

	// Escape y element.close() disparan este evento nativo
	protected onNativeClose(): void {
		this.lockScroll(false);
		if (this.open()) this.open.set(false);
	}

	// El clic en el fondo oscuro llega con el propio <dialog> como destino
	protected onDialogClick(event: MouseEvent): void {
		if (event.target === this.dialog()?.nativeElement) this.close();
	}

	// Evita que la página de atrás se desplace mientras el modal está abierto
	private lockScroll(lock: boolean): void {
		document.body.style.overflow = lock ? 'hidden' : '';
	}
}
