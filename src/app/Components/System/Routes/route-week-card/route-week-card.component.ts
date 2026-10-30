// ==================================================
// Componente: <app-route-week-card>
// ==================================================
// Card compacta de una ruta en el tablero de la semana (una columna por día): nombre, hora
// de salida, N.° de clientes, clientes que contiene, los días en que sale y "Ver detalles".
// Sin estado ni pedidos: eso vive en la pestaña Rutas del día.
//
//   <app-route-week-card [card]="card" (viewDetails)="openDetail(card)" />

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IconComponent } from '@components/Shared/icon/icon.component';
import { DaysWeekPipe } from '@core/Pipes/days-week.pipe';
import { formatDepartureTime, RouteWeekCard } from '@core/Utils/route-board.utils';

@Component({
	selector: 'app-route-week-card',
	imports: [IconComponent, DaysWeekPipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'flex min-w-0 flex-col rounded-xl bg-white p-3 shadow-card' },
	template: `
		<div class="flex items-start gap-2">
			<span class="grid size-8 shrink-0 place-items-center rounded-full bg-brand-900">
				<app-icon name="map" size="size-4" class="text-white" />
			</span>
			<h3 class="line-clamp-2 min-w-0 break-words text-sm font-semibold leading-5 text-slate-900" [title]="card().route.name">
				{{ card().route.name }}
			</h3>
		</div>

		<dl class="mt-2.5 space-y-1 text-xs text-slate-600">
			<div>
				<dt class="sr-only">Hora de salida</dt>
				<dd class="flex items-center gap-1.5">
					<app-icon name="clock" size="size-4" class="text-slate-500" />
					<span class="font-semibold tabular-nums text-slate-900">{{ departure() }}</span>
				</dd>
			</div>
			<div>
				<dt class="sr-only">Número de clientes</dt>
				<dd class="flex items-center gap-1.5">
					<app-icon name="building-office-2" size="size-4" class="text-slate-500" />
					<span class="tabular-nums">{{ clientsText() }}</span>
				</dd>
			</div>
		</dl>

		@if (card().clientNames) {
			<p class="mt-2 line-clamp-2 break-words text-xs text-slate-500" [title]="card().clientNames">{{ card().clientNames }}</p>
		}

		<p class="mt-2 w-fit max-w-full truncate rounded-md bg-brand-100 px-1.5 py-0.5 text-xs font-medium text-brand-900" title="Días en que sale">
			{{ card().route.days_week | daysWeek }}
		</p>

		<button
			type="button"
			class="mt-2.5 flex items-center justify-center gap-1 rounded-lg bg-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-300"
			[attr.aria-label]="'Ver detalles de la ruta ' + card().route.name"
			(click)="viewDetails.emit()"
		>
			<app-icon name="eye" size="size-4" />
			Ver detalles
		</button>
	`,
})
export class RouteWeekCardComponent {
	readonly card = input.required<RouteWeekCard>();
	readonly viewDetails = output<void>();

	protected readonly departure = computed(() => formatDepartureTime(this.card().route.departure_time));
	protected readonly clientsText = computed(() => {
		const count = this.card().route.clients_count;
		return `${count} ${count === 1 ? 'cliente' : 'clientes'}`;
	});
}
