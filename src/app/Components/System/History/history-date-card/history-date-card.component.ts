// ==================================================
// Componente: <app-history-date-card>
// ==================================================
// Tarjeta de una punta del rango de fechas del histórico ("Rango de fecha inicial": ícono,
// título y fecha). Toda la tarjeta abre el calendario nativo del navegador (showPicker de
// un <input type="date"> invisible), así se ve como el diseño y se elige con el selector
// accesible del navegador.
//
//   <app-history-date-card label="Rango de fecha inicial" [value]="from" [max]="to" (valueChange)="setFrom($event)" />

import { ChangeDetectionStrategy, Component, ElementRef, input, output, viewChild } from '@angular/core';

import { IconComponent } from '@components/Shared/icon/icon.component';
import { IsoDate } from '@core/Models/Shared/api-types.model';
import { BogotaDatePipe } from '@core/Pipes/bogota-date.pipe';

@Component({
	selector: 'app-history-date-card',
	imports: [IconComponent, BogotaDatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'relative block' },
	template: `
		<button
			type="button"
			class="flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-2 text-left shadow-card transition hover:bg-brand-50"
			[attr.aria-label]="label() + ': ' + (value() | bogotaDate: longFormat) + '. Cambiar fecha'"
			(click)="openPicker()"
		>
			<span class="flex min-w-0 items-center gap-3">
				<span class="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
					<app-icon name="calendar-days" size="size-5" />
				</span>
				<span class="min-w-0">
					<span class="block truncate text-xs font-medium text-slate-500">{{ label() }}</span>
					<span class="block text-sm font-semibold tabular-nums text-slate-900">{{ value() | bogotaDate: shortFormat }}</span>
				</span>
			</span>
			<app-icon name="chevron-down" size="size-4" class="shrink-0 text-slate-500" />
		</button>

		<!-- Invisible: solo aporta el calendario nativo, que se abre junto a la tarjeta -->
		<input
			#picker
			type="date"
			tabindex="-1"
			aria-hidden="true"
			class="pointer-events-none absolute bottom-0 left-6 size-px opacity-0"
			[value]="value()"
			[min]="min()"
			[max]="max()"
			(change)="onPicked($any($event.target))"
		/>
	`,
})
export class HistoryDateCardComponent {
	readonly label = input.required<string>();
	readonly value = input.required<IsoDate>();
	readonly min = input<IsoDate | null>(null);
	readonly max = input<IsoDate | null>(null);
	readonly valueChange = output<IsoDate>();

	private readonly picker = viewChild.required<ElementRef<HTMLInputElement>>('picker');

	protected readonly shortFormat: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
	protected readonly longFormat: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

	protected openPicker(): void {
		const input = this.picker().nativeElement;
		try {
			input.showPicker();
		} catch {
			// Navegadores sin showPicker: el clic sobre el input abre su calendario
			input.focus();
			input.click();
		}
	}

	protected onPicked(input: HTMLInputElement): void {
		// "Borrar" en el calendario no deja el rango sin fecha: se vuelve a la que había
		if (input.value) this.valueChange.emit(input.value);
		else input.value = this.value();
	}
}
