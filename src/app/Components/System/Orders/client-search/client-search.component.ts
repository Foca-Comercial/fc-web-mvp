// ==================================================
// Componente: <app-client-search>
// ==================================================
// Elige un cliente REGISTRADO buscándolo por nombre (GET /clients/search?name=, mínimo 2
// letras, máx. 10 resultados). Al elegir, la caja se reemplaza por la tarjeta del cliente
// con el botón "Cambiar". Los clientes temporales de pedidos anteriores no aparecen: para
// ellos se usa el formulario de cliente nuevo.
//
//   <app-client-search [(selected)]="client" [neighborhoods]="neighborhoods()" />
//
// `neighborhoods` (opcional) solo sirve para mostrar el barrio y la zona de cada cliente.
// La lista se pinta dentro del flujo normal (sin overlay) para que funcione en un <dialog>.

import { ChangeDetectionStrategy, Component, computed, inject, input, model, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';

import { IconComponent } from '@components/Shared/icon/icon.component';
import { SearchInputComponent } from '@components/Shared/search-input/search-input.component';
import { SkeletonComponent } from '@components/Shared/skeleton/skeleton.component';
import { Client } from '@core/Models/CoreModule/catalog.model';
import { NeighborhoodDropdown } from '@core/Models/ParametersModule/parameters.model';
import { ClientService } from '@core/Service/CoreModule/client.service';
import { canSearchClients, neighborhoodLabel } from '@core/Utils/new-order.utils';

type SearchState =
	| { status: 'idle' } // todavía no hay texto suficiente
	| { status: 'loading' }
	| { status: 'error' }
	| { status: 'ready'; clients: Client[] };

const IDLE: SearchState = { status: 'idle' };
const LOADING: SearchState = { status: 'loading' };

@Component({
	selector: 'app-client-search',
	imports: [IconComponent, SearchInputComponent, SkeletonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './client-search.component.html',
})
export class ClientSearchComponent {
	private readonly clients = inject(ClientService);

	readonly selected = model<Client | null>(null);
	readonly neighborhoods = input<readonly NeighborhoodDropdown[] | null>(null);

	protected readonly query = signal('');
	private readonly retryTick = signal(0);

	protected readonly state = toSignal(
		combineLatest([toObservable(this.query).pipe(map((text) => text.trim()), distinctUntilChanged()), toObservable(this.retryTick)]).pipe(
			switchMap(([text]) =>
				!canSearchClients(text)
					? of(IDLE)
					: this.clients.search(text).pipe(
							map((clients): SearchState => ({ status: 'ready', clients })),
							startWith(LOADING),
							catchError(() => of<SearchState>({ status: 'error' }))
						)
			)
		),
		{ initialValue: IDLE }
	);

	private readonly byId = computed(() => new Map((this.neighborhoods() ?? []).map((item) => [item.id_neighborhood, item])));

	// "Centro · Norte", o '' si no se pudo cargar la lista de barrios
	protected area(client: Client): string {
		const neighborhood = this.byId().get(client.id_neighborhood);
		return neighborhood ? neighborhoodLabel(neighborhood) : '';
	}

	protected pick(client: Client): void {
		this.selected.set(client);
	}

	protected change(): void {
		this.selected.set(null);
	}

	protected retry(): void {
		this.retryTick.update((tick) => tick + 1);
	}
}
