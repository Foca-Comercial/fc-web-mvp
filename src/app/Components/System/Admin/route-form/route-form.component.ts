// ==================================================
// Componente: <app-route-form>
// ==================================================
// Ruta del panel de administración: nombre (único), días en que sale y hora de salida.
// Crea (POST /routes/) o edita (PATCH /routes/{id}, solo lo que cambió). Un cambio de días
// u hora aplica de inmediato a «Rutas del día»; los pedidos ya generados no cambian.
//
// Se monta solo mientras el modal está abierto; los errores de la API van en línea.

import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Route, RouteAdminRow } from '@core/Models/ParametersModule/parameters.model';
import { DAY_WEEK_LABELS, DayWeek } from '@core/Models/Shared/api-types.model';
import { RouteService } from '@core/Service/ParametersModule/route.service';
import {
	MAX_ROUTE_NAME_LENGTH,
	RouteDraft,
	WEEK_DAYS,
	draftFromRoute,
	hasRouteChanges,
	hasRouteErrors,
	routeChanges,
	routeErrors,
	toRouteCreate,
	toggleDay,
} from '@core/Utils/admin-routes.utils';
import { describeApiError, parseApiErrorAsync } from '@core/Utils/api-error.utils';

@Component({
	selector: 'app-route-form',
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './route-form.component.html',
})
export class RouteFormComponent {
	private readonly routes = inject(RouteService);

	// null = ruta nueva
	readonly route = input<RouteAdminRow | null>(null);
	readonly saved = output<Route>();
	readonly cancelled = output<void>();

	protected readonly maxName = MAX_ROUTE_NAME_LENGTH;
	protected readonly weekDays = WEEK_DAYS.map((day) => ({ day, ...DAY_WEEK_LABELS[day as DayWeek] }));

	protected readonly isEdit = computed(() => this.route() !== null);
	protected readonly draft = linkedSignal<RouteDraft>(() => draftFromRoute(this.route()));
	protected readonly errors = computed(() => routeErrors(this.draft()));

	private readonly changes = computed(() => {
		const route = this.route();
		return route ? routeChanges(route, this.draft()) : null;
	});
	protected readonly unchanged = computed(() => {
		const changes = this.changes();
		return changes !== null && !hasRouteChanges(changes);
	});

	protected readonly submitted = signal(false);
	protected readonly saving = signal(false);
	protected readonly serverErrors = signal<string[]>([]);

	protected patchDraft(patch: Partial<RouteDraft>): void {
		this.draft.update((draft) => ({ ...draft, ...patch }));
	}

	protected toggle(day: number): void {
		this.draft.update((draft) => ({ ...draft, days: toggleDay(draft.days, day) }));
	}

	protected async submit(): Promise<void> {
		this.submitted.set(true);
		if (this.saving() || hasRouteErrors(this.errors()) || this.unchanged()) return;

		const route = this.route();
		const changes = this.changes();
		this.saving.set(true);
		this.serverErrors.set([]);
		try {
			const saved = await firstValueFrom(
				route && changes ? this.routes.update(route.id_route, changes) : this.routes.create(toRouteCreate(this.draft()))
			);
			this.saved.emit(saved);
		} catch (error) {
			this.serverErrors.set(describeApiError(await parseApiErrorAsync(error)));
		} finally {
			this.saving.set(false);
		}
	}
}
