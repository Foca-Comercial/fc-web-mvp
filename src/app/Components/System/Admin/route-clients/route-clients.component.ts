// ==================================================
// Componente: <app-route-clients>
// ==================================================
// Clientes de una ruta en el panel de administración:
//   - Asignados (GET /routes/{id}/clients): los inactivos se marcan, y se avisa si un
//     cliente no tiene productos activos con precio especial (aparece en la plantilla de
//     la ruta, pero no se le puede generar pedido desde ella).
//   - Agregar: búsqueda en la API (GET /routes/{id}/available-clients?name=) de clientes
//     registrados, activos y aún no asignados → POST /routes/{id}/clients.
//   - Quitar: confirmación en línea → DELETE /routes/{id}/clients/{id_client}.
//
// Vive dentro de un <dialog> modal: avisos y errores en línea. Avisa con (changed) tras
// cada cambio para que la vista refresque el conteo de su tabla.

import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, firstValueFrom, map, Observable, of, startWith, switchMap } from 'rxjs';

import { IconButtonComponent } from '@components/Shared/icon-button/icon-button.component';
import { SearchInputComponent } from '@components/Shared/search-input/search-input.component';
import { SkeletonComponent } from '@components/Shared/skeleton/skeleton.component';
import { StatusBadgeComponent } from '@components/Shared/status-badge/status-badge.component';
import { RouteAdminRow, RouteAvailableClient, RouteClient } from '@core/Models/ParametersModule/parameters.model';
import { RouteService } from '@core/Service/ParametersModule/route.service';
import {
	canSearchClients,
	lacksSpecialPrices,
	removeRouteClient,
	routeClientsSummary,
	sortRouteClients,
} from '@core/Utils/admin-routes.utils';
import { describeApiError, parseApiErrorAsync } from '@core/Utils/api-error.utils';

type Result<T> = { ok: true; data: T } | { ok: false };

// Resultado de la búsqueda. undefined = buscando, null = falló
type Available = readonly RouteAvailableClient[] | null | undefined;

@Component({
	selector: 'app-route-clients',
	imports: [IconButtonComponent, SearchInputComponent, SkeletonComponent, StatusBadgeComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './route-clients.component.html',
})
export class RouteClientsComponent {
	private readonly routes = inject(RouteService);

	readonly route = input.required<RouteAdminRow>();
	readonly changed = output<void>();
	readonly closed = output<void>();

	protected readonly lacksPrices = lacksSpecialPrices;

	// ----- Asignados. undefined = cargando, null = no se pudo cargar -----
	protected readonly clients = signal<RouteClient[] | null | undefined>(undefined);
	protected readonly summary = computed(() => routeClientsSummary(this.clients() ?? []));

	// ----- Agregar: búsqueda en la API -----
	protected readonly adding = signal(false);
	protected readonly query = signal('');
	private readonly searchTick = signal(0); // vuelve a buscar tras asignar
	protected readonly searchable = computed(() => canSearchClients(this.query()));
	protected readonly available = toSignal<Available, undefined>(
		combineLatest([toObservable(this.adding), toObservable(this.query), toObservable(this.searchTick)]).pipe(
			switchMap(([adding, query]) => {
				if (!adding || !canSearchClients(query)) return of<Available>([]);
				return this.routes.getAvailableClients(this.route().id_route, query).pipe(
					map((list): Available => list),
					startWith<Available>(undefined),
					catchError(() => of<Available>(null))
				);
			})
		),
		{ initialValue: undefined }
	);

	// ----- Acciones -----
	protected readonly confirmRemove = signal<number | null>(null);
	protected readonly busy = signal<number | null>(null); // id_client con una petición en vuelo
	protected readonly errors = signal<string[]>([]);

	constructor() {
		// Carga los clientes al montarse (el modal lo monta al abrirse)
		effect(() => {
			const idRoute = this.route().id_route;
			untracked(() => void this.load(idRoute));
		});
	}

	// ----- Agregar -----
	protected startAdd(): void {
		this.errors.set([]);
		this.query.set('');
		this.adding.set(true);
	}

	protected stopAdd(): void {
		this.adding.set(false);
	}

	protected async assign(client: RouteAvailableClient): Promise<void> {
		const result = await this.run(client.id_client, this.routes.assignClient(this.route().id_route, client.id_client));
		if (!result.ok) return;
		this.clients.update((clients) => sortRouteClients([...(clients ?? []), result.data]));
		this.searchTick.update((tick) => tick + 1); // ya no está disponible
		this.changed.emit();
	}

	// ----- Quitar -----
	protected askRemove(client: RouteClient): void {
		this.confirmRemove.set(client.id_client);
	}

	protected cancelRemove(): void {
		this.confirmRemove.set(null);
	}

	protected async remove(client: RouteClient): Promise<void> {
		const result = await this.run(client.id_client, this.routes.unassignClient(this.route().id_route, client.id_client));
		this.confirmRemove.set(null);
		if (!result.ok) return;
		this.clients.update((clients) => removeRouteClient(clients ?? [], client.id_client));
		if (this.adding()) this.searchTick.update((tick) => tick + 1); // vuelve a estar disponible
		this.changed.emit();
	}

	// ----- Interno -----
	protected retry(): void {
		void this.load(this.route().id_route);
	}

	private async load(idRoute: number): Promise<void> {
		this.clients.set(undefined);
		this.errors.set([]);
		try {
			this.clients.set(sortRouteClients(await firstValueFrom(this.routes.getClients(idRoute))));
		} catch (error) {
			this.clients.set(null);
			this.errors.set(describeApiError(await parseApiErrorAsync(error)));
		}
	}

	// Una petición a la vez; el error se muestra en línea
	private async run<T>(idClient: number, request: Observable<T>): Promise<Result<T>> {
		this.busy.set(idClient);
		this.errors.set([]);
		try {
			// defaultValue: el DELETE (204) puede completar sin emitir
			return { ok: true, data: await firstValueFrom(request, { defaultValue: undefined as T }) };
		} catch (error) {
			this.errors.set(describeApiError(await parseApiErrorAsync(error)));
			return { ok: false };
		} finally {
			this.busy.set(null);
		}
	}
}
