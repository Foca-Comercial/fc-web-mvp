// ==================================================
// Estado: tabla paginada en el servidor (vistas de administración)
// ==================================================
// Para listados que crecen sin límite (clientes, productos, domiciliarios…): la API
// filtra, ordena y pagina en SQL y responde Page<T>. A diferencia del tablero de
// despachos (que trae el día completo y filtra en el cliente), aquí cada cambio de
// filtro, página o tamaño pide solo la página visible.
//
// Qué resuelve, para no repetirlo en cada vista:
//   - Una sola petición en vuelo: si cambian los filtros antes de que llegue la
//     respuesta, la anterior se cancela (switchMap).
//   - Volver a la página 1 al cambiar filtros o tamaño de página.
//   - Primera carga (`loading`, para el esqueleto) vs. recargas (`refreshing`, las
//     filas anteriores siguen visibles: sin parpadeo).
//   - Si la página pedida quedó más allá del final (p. ej. se eliminó el último
//     registro de la última página), salta a la última.
//   - Errores con ApiAlertService; `failed` solo si nunca se cargó nada.
//
// Se crea en un inicializador de campo del componente (necesita contexto de
// inyección) y se libera sola al destruirse el componente:
//
//   private readonly clients = inject(ClientService);
//   protected readonly table = new ServerTable({
//   	load: (query) => this.clients.getAdminPage(query),
//   	filters: { search: '', active: null as boolean | null },
//   });
//
//   <app-search-input [value]="table.filters().search" (valueChange)="table.setFilter('search', $event)" />
//   @for (row of table.items(); track row.id_client) { … }
//   <app-page-size-select [options]="pageSizeOptions" [(size)]="table.pageSize" />
//   <app-pagination [totalPages]="table.pages()" [(page)]="table.page" />
//
// Tras crear, editar o eliminar un registro: `table.reload()`.
// La búsqueda ya llega con debounce desde <app-search-input>.

import { computed, inject, linkedSignal, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, map, Observable, of, switchMap } from 'rxjs';

import { Page, PageRequest } from '@core/Models/Shared/api-types.model';
import { ApiAlertService } from '@core/Service/Alerts/api-alert.service';
import { BOARD_PAGE_SIZE } from '@core/Utils/order-board.utils';

export type ServerTableQuery<F extends object> = F & PageRequest;

// P: la respuesta de la API. Por defecto Page<T>; una vista puede usar un tipo que la
// extienda con datos propios (p. ej. el histórico trae el total de ventas del filtro).
export interface ServerTableOptions<F extends object, T, P extends Page<T> = Page<T>> {
	// Pide una página a la API con los filtros actuales (el servicio arma los query params)
	load: (query: ServerTableQuery<F>) => Observable<P>;
	// Filtros iniciales; también son los que restaura resetFilters()
	filters: F;
	pageSize?: number;
	// Título de la alerta si falla la carga
	errorTitle?: string;
}

type LoadResult<P> = { ok: true; data: P } | { ok: false; error: unknown };

export class ServerTable<F extends object, T, P extends Page<T> = Page<T>> {
	private readonly apiAlert = inject(ApiAlertService);
	private readonly options: ServerTableOptions<F, T, P>;

	// ----- Lo que pide la vista -----
	readonly filters: WritableSignal<F>;
	readonly pageSize: WritableSignal<number>;
	// Vuelve a 1 cuando cambian los filtros o el tamaño de página
	readonly page: WritableSignal<number>;

	// ----- Lo que responde la API -----
	readonly data = signal<P | null>(null);
	readonly loading = signal(true); // primera carga: esqueleto
	readonly refreshing = signal(false); // recargas: las filas anteriores siguen visibles
	readonly failed = signal(false); // falló sin haber cargado nunca

	readonly items = computed<T[]>(() => this.data()?.items ?? []);
	readonly total = computed(() => this.data()?.total ?? 0);
	readonly pages = computed(() => this.data()?.pages ?? 0);
	// N.° de la primera fila visible (para numerar 001, 002… entre páginas)
	readonly firstRowNumber = computed(() => ((this.data()?.page ?? 1) - 1) * (this.data()?.page_size ?? this.pageSize()) + 1);
	readonly busy = computed(() => this.loading() || this.refreshing());

	private readonly reloadTick = signal(0);

	constructor(options: ServerTableOptions<F, T, P>) {
		this.options = options;
		this.filters = signal(options.filters);
		this.pageSize = signal(options.pageSize ?? BOARD_PAGE_SIZE);
		this.page = linkedSignal<readonly [F, number], number>({
			source: () => [this.filters(), this.pageSize()] as const,
			computation: () => 1,
		});

		// Cada cambio de filtros, página, tamaño o reload() pide la página otra vez
		const request = computed(() => ({
			query: { ...this.filters(), page: this.page(), page_size: this.pageSize() } as ServerTableQuery<F>,
			tick: this.reloadTick(),
		}));

		toObservable(request)
			.pipe(
				switchMap(({ query }) => {
					this.startLoading();
					return this.options.load(query).pipe(
						map((data): LoadResult<P> => ({ ok: true, data })),
						catchError((error: unknown) => of<LoadResult<P>>({ ok: false, error })),
						map((result) => ({ result, query }))
					);
				}),
				takeUntilDestroyed()
			)
			.subscribe(({ result, query }) => this.finish(result, query));
	}

	// ----- Acciones de la vista -----
	setFilter<K extends keyof F>(key: K, value: F[K]): void {
		if (Object.is(this.filters()[key], value)) return; // sin cambios: no recarga
		this.filters.update((current) => {
			const next = { ...current };
			next[key] = value;
			return next;
		});
	}

	resetFilters(): void {
		this.filters.set(this.options.filters);
	}

	// Vuelve a pedir la página actual (p. ej. tras crear, editar o eliminar)
	reload(): void {
		this.reloadTick.update((tick) => tick + 1);
	}

	// ----- Interno -----
	private startLoading(): void {
		if (this.data() === null) {
			this.loading.set(true);
		} else {
			this.refreshing.set(true);
		}
	}

	private finish(result: LoadResult<P>, query: ServerTableQuery<F>): void {
		this.loading.set(false);
		this.refreshing.set(false);

		if (!result.ok) {
			if (this.data() === null) this.failed.set(true);
			void this.apiAlert.handleError(result.error, this.options.errorTitle ?? 'No se pudo cargar la información');
			return;
		}

		const page = result.data;
		// La página pedida quedó más allá del final: se pide la última (otra petición)
		if (page.items.length === 0 && page.total > 0 && query.page > page.pages) {
			this.page.set(page.pages);
			return;
		}

		this.failed.set(false);
		this.data.set(page);
	}
}
