// ==================================================
// Directiva: appNumericInput
// ==================================================
// Restringe un input a dígitos (teléfono, códigos, cantidades) y limita su largo.
//   <input appNumericInput [maxDigits]="10" formControlName="phone" />

import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';

const NAVIGATION_KEYS = new Set(['Backspace', 'Delete', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);

@Directive({ selector: 'input[appNumericInput]' })
export class NumericInputDirective {
	private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);

	readonly maxDigits = input<number>(Infinity);

	@HostListener('keydown', ['$event'])
	onKeyDown(event: KeyboardEvent): void {
		// Atajos (copiar, pegar, seleccionar todo) y teclas de navegación
		if (event.ctrlKey || event.metaKey || NAVIGATION_KEYS.has(event.key)) return;

		const input = this.el.nativeElement;
		const hasSelection = input.selectionStart !== input.selectionEnd;
		if (!/^\d$/.test(event.key) || (!hasSelection && input.value.length >= this.maxDigits())) {
			event.preventDefault();
		}
	}

	// Cubre pegado, autocompletado y teclados móviles: limpia lo que no sea dígito
	@HostListener('input')
	onInput(): void {
		const input = this.el.nativeElement;
		const clean = input.value.replace(/\D/g, '').slice(0, this.maxDigits());
		if (clean !== input.value) {
			input.value = clean;
			// Notifica al FormControl el valor ya limpio
			input.dispatchEvent(new Event('input', { bubbles: true }));
		}
	}
}
