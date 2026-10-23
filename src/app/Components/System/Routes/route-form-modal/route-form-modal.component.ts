// ==================================================
// Componente: <app-route-form-modal>
// ==================================================
// Crear ("Nueva ruta") o editar una ruta en dos pasos, como lo permite la API:
//   1. Datos de la ruta: nombre, días y hora de salida → POST /routes/ (o PATCH si ya existe).
//   2. Clientes de la ruta: se buscan los clientes disponibles (registrados y activos,
//      GET /routes/{id}/available-clients) y cada uno se asigna al elegirlo
//      (POST /routes/{id}/clients) o se quita (DELETE /routes/{id}/clients/{id_client}).
// Lo que lleva cada cliente no se guarda aquí: en "Vista principal" se le precargan los
// productos que tiene con precio pactado (los registra el administrador). Por eso en el
// paso 2 se marca a quien no tiene precios pactados: no podrá generar pedido desde la ruta
// (se consulta con GET /orders/routes/{id}/template).
//
//   <app-route-form-modal [open]="formOpen()" [route]="formRoute()" (closed)="onFormClosed($event)" />
//   route = null → nueva ruta · route = la ruta → editarla
//
// `(closed)` avisa si algo cambió en el servidor, para recargar las rutas.
// Todo el feedback es en línea: SweetAlert no se puede usar sobre el <dialog> modal.

import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	input,
	output,
	signal,
	untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, firstValueFrom, forkJoin, map, of, Subject, switchMap } from 'rxjs';

import { IconComponent } from '@components/Shared/icon/icon.component';
import { ItemPickerComponent } from '@components/Shared/item-picker/item-picker.component';
import { PickerOption } from '@components/Shared/item-picker/item-picker.utils';
import { ModalComponent } from '@components/Shared/modal/modal.component';
import { SkeletonComponent } from '@components/Shared/skeleton/skeleton.component';
import { RouteAvailableClient, RouteClient } from '@core/Models/ParametersModule/parameters.model';
import { DAY_WEEK_LABELS, DayWeek } from '@core/Models/Shared/api-types.model';
import { OrderService } from '@core/Service/CoreModule/order.service';
import { RouteService } from '@core/Service/ParametersModule/route.service';
import { parseApiError } from '@core/Utils/api-error.utils';
import { toApiTime } from '@core/Utils/date.utils';
import { RouteBasics } from '@core/Utils/route-board.utils';
import { ALL_DAYS, DAY_PRESETS, sameDays, toggleDay } from '@core/Utils/route-form.utils';

type Step = 'details' | 'clients';

const NAME_MAX_LENGTH = 50;

@Component({
	selector: 'app-route-form-modal',
	imports: [ReactiveFormsModule, ModalComponent, SkeletonComponent, IconComponent, ItemPickerComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './route-form-modal.component.html',
})
export class RouteFormModalComponent {
	private readonly fb = inject(FormBuilder);
	private readonly routes = inject(RouteService);
	private readonly orders = inject(OrderService);

	readonly open = input(false);
	readonly route = input<RouteBasics | null>(null);
	// true si algo cambió en el servidor (la ruta o sus clientes)
	readonly closed = output<boolean>();

	// ----- Estado general -----
	protected readonly step = signal<Step>('details');
	protected readonly routeId = signal<number | null>(null);
	protected readonly routeName = signal('');
	protected readonly title = computed(() => {
		if (this.routeId() !== null && this.routeName()) return `Ruta ${this.routeName()}`;
		return this.route() ? 'Editar ruta' : 'Nueva ruta';
	});
	private changed = false;

	// ----- Paso 1: datos de la ruta -----
	protected readonly form = this.fb.nonNullable.group({
		name: ['', [Validators.required, Validators.maxLength(NAME_MAX_LENGTH)]],
		departure: ['', [Validators.required]],
	});
	protected readonly days = signal<number[]>([]);
	protected readonly daysTouched = signal(false);
	protected readonly nameError = signal<string | null>(null);
	protected readonly detailsError = signal<string | null>(null);
	protected readonly savingDetails = signal(false);
	// Lo último guardado, para no repetir el PATCH si no hubo cambios
	private savedDetails = { name: '', departure: '', days: [] as number[] };

	// ----- Paso 2: clientes de la ruta -----
	protected readonly clients = signal<RouteClient[]>([]);
	// Clientes sin precios pactados: no podrán generar pedido desde la ruta
	protected readonly withoutPrices = signal<ReadonlySet<number>>(new Set());
	protected readonly loadingClients = signal(false);
	protected readonly clientsError = signal<string | null>(null);
	private clientsLoadedFor: number | null = null;

	private readonly available = signal<RouteAvailableClient[]>([]);
	protected readonly searching = signal(false);
	protected readonly assigning = signal(false);
	protected readonly busyClient = signal<number | null>(null);
	protected readonly confirmRemoveId = signal<number | null>(null);
	protected readonly actionError = signal<string | null>(null);
	private readonly search$ = new Subject<string>();
	private lastQuery = '';

	// ----- Constantes para la plantilla -----
	protected readonly allDays = ALL_DAYS;
	protected readonly dayPresets = DAY_PRESETS;
	protected readonly nameMaxLength = NAME_MAX_LENGTH;

	protected readonly availableOptions = computed<PickerOption[]>(() =>
		this.available().map((client) => ({
			id: client.id_client,
			label: client.name,
			meta: `${client.neighborhood_name} · ${client.zone_name}`,
		}))
	);

	constructor() {
		// Cada vez que se abre, arranca desde los datos de la ruta (o vacío si es nueva)
		effect(() => {
			if (this.open()) {
				const route = this.route();
				untracked(() => this.reset(route));
			}
		});

		// Búsqueda de clientes disponibles: la última búsqueda cancela la anterior
		this.search$
			.pipe(
				switchMap((query) => {
					const id = this.routeId();
					if (id === null) return of(null);
					this.searching.set(true);
					return this.routes
						.getAvailableClients(id, query.length >= 2 ? query : null)
						.pipe(catchError(() => of<RouteAvailableClient[]>([])));
				}),
				takeUntilDestroyed()
			)
			.subscribe((list) => {
				this.searching.set(false);
				if (list) this.available.set(list);
			});
	}

	// ==================================================
	// Paso 1: datos de la ruta
	// ==================================================
	protected invalid(control: 'name' | 'departure'): boolean {
		const c = this.form.controls[control];
		return c.invalid && (c.touched || c.dirty);
	}

	protected toggleDay(day: number): void {
		this.days.update((days) => toggleDay(days, day));
		this.daysTouched.set(true);
	}

	protected applyPreset(days: readonly number[]): void {
		this.days.set([...days]);
		this.daysTouched.set(true);
	}

	protected isDaySelected(day: number): boolean {
		return this.days().includes(day);
	}

	protected dayLabel(day: DayWeek): { short: string; long: string } {
		return DAY_WEEK_LABELS[day];
	}

	protected async continue(): Promise<void> {
		this.form.markAllAsTouched();
		this.daysTouched.set(true);
		if (this.form.invalid || this.days().length === 0) return;

		const name = this.form.controls.name.value.trim();
		const departure = this.form.controls.departure.value;
		const days = this.days();
		const id = this.routeId();

		// Ruta ya guardada y sin cambios: directo a los clientes
		const unchanged =
			name.toUpperCase() === this.savedDetails.name.toUpperCase() &&
			departure === this.savedDetails.departure &&
			sameDays(days, this.savedDetails.days);
		if (id !== null && unchanged) {
			this.goToClients();
			return;
		}

		this.savingDetails.set(true);
		this.nameError.set(null);
		this.detailsError.set(null);
		try {
			const body = { name, days_week: days, departure_time: toApiTime(departure) ?? departure };
			const saved = await firstValueFrom(
				id === null ? this.routes.create({ ...body, active: true }) : this.routes.update(id, body)
			);
			this.routeId.set(saved.id_route);
			this.routeName.set(saved.name);
			this.savedDetails = { name: saved.name, departure, days };
			this.changed = true;
			this.goToClients();
		} catch (error) {
			const apiError = parseApiError(error);
			if (apiError.status === 409 || apiError.field === 'name') {
				this.nameError.set(apiError.message);
			} else if (apiError.fieldErrors.length > 0) {
				this.detailsError.set(apiError.fieldErrors.map((e) => `${e.label}: ${e.message}`).join(' · '));
			} else {
				this.detailsError.set(apiError.message);
			}
		} finally {
			this.savingDetails.set(false);
		}
	}

	protected backToDetails(): void {
		this.step.set('details');
	}

	// ==================================================
	// Paso 2: clientes de la ruta
	// ==================================================
	private goToClients(): void {
		this.step.set('clients');
		const id = this.routeId();
		if (id !== null && this.clientsLoadedFor !== id) void this.loadClients(id);
	}

	protected retryClients(): void {
		const id = this.routeId();
		if (id !== null) void this.loadClients(id);
	}

	private async loadClients(id: number): Promise<void> {
		this.loadingClients.set(true);
		this.clientsError.set(null);
		try {
			const result = await firstValueFrom(
				forkJoin({ clients: this.routes.getClients(id), withoutPrices: this.clientsWithoutPrices(id) })
			);
			this.clients.set(result.clients);
			this.withoutPrices.set(result.withoutPrices);
			this.clientsLoadedFor = id;
			this.search$.next(this.lastQuery);
		} catch (error) {
			this.clientsError.set(parseApiError(error).message);
		} finally {
			this.loadingClients.set(false);
		}
	}

	// IDs de los clientes de la ruta sin productos con precio pactado (si falla, ninguno)
	private clientsWithoutPrices(id: number) {
		return this.orders.getRouteTemplate(id).pipe(
			map((template) => new Set(template.clients.filter((c) => c.products.length === 0).map((c) => c.id_client))),
			catchError(() => of(new Set<number>()))
		);
	}

	private async refreshWithoutPrices(): Promise<void> {
		const id = this.routeId();
		if (id !== null) this.withoutPrices.set(await firstValueFrom(this.clientsWithoutPrices(id)));
	}

	protected hasNoPrices(client: RouteClient): boolean {
		return this.withoutPrices().has(client.id_client);
	}

	protected onClientQuery(query: string): void {
		this.lastQuery = query;
		// La API busca desde 2 letras; con 1 se espera la siguiente
		if (query.length !== 1) this.search$.next(query);
	}

	protected async assign(idClient: number): Promise<void> {
		const id = this.routeId();
		if (id === null) return;
		this.assigning.set(true);
		this.actionError.set(null);
		try {
			const assigned = await firstValueFrom(this.routes.assignClient(id, idClient));
			// Al final de la lista: así se ve cada cliente que se va agregando
			this.clients.update((list) => [...list, assigned]);
			this.changed = true;
			void this.refreshWithoutPrices();
		} catch (error) {
			this.actionError.set(parseApiError(error).message);
		} finally {
			this.assigning.set(false);
			this.search$.next(this.lastQuery);
		}
	}

	protected requestRemove(client: RouteClient): void {
		this.confirmRemoveId.set(client.id_client);
	}

	protected cancelRemove(): void {
		this.confirmRemoveId.set(null);
	}

	protected async remove(client: RouteClient): Promise<void> {
		const id = this.routeId();
		if (id === null) return;
		this.busyClient.set(client.id_client);
		this.actionError.set(null);
		try {
			await firstValueFrom(this.routes.unassignClient(id, client.id_client), { defaultValue: undefined });
			this.clients.update((list) => list.filter((c) => c.id_client !== client.id_client));
			this.changed = true;
		} catch (error) {
			this.actionError.set(parseApiError(error).message);
		} finally {
			this.busyClient.set(null);
			this.confirmRemoveId.set(null);
			this.search$.next(this.lastQuery);
		}
	}

	// ==================================================
	// Cierre (Finalizar, X, Escape o Cancelar)
	// ==================================================
	protected close(): void {
		this.closed.emit(this.changed);
	}

	protected onOpenChange(open: boolean): void {
		if (!open) this.close();
	}

	private reset(route: RouteBasics | null): void {
		this.changed = false;
		this.step.set('details');
		this.routeId.set(route?.id_route ?? null);
		this.routeName.set(route?.name ?? '');

		const departure = route?.departure_time.slice(0, 5) ?? '';
		this.form.reset({ name: route?.name ?? '', departure });
		this.days.set(route ? [...route.days_week] : []);
		this.daysTouched.set(false);
		this.savedDetails = { name: route?.name ?? '', departure, days: route ? [...route.days_week] : [] };
		this.nameError.set(null);
		this.detailsError.set(null);

		this.clients.set([]);
		this.withoutPrices.set(new Set());
		this.available.set([]);
		this.clientsLoadedFor = null;
		this.clientsError.set(null);
		this.actionError.set(null);
		this.confirmRemoveId.set(null);
		this.lastQuery = '';
	}
}
