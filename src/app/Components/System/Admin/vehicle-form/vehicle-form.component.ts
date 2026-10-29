// ==================================================
// Componente: <app-vehicle-form>
// ==================================================
// Nombre del vehículo (único, se guarda en mayúsculas): crea (POST /vehicles/admin) o
// edita (PATCH /vehicles/admin/{id}). Se monta solo mientras el modal está abierto; los
// errores de la API van en línea.

import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { VehicleAdminRow } from '@core/Models/ParametersModule/parameters.model';
import { VehicleService } from '@core/Service/ParametersModule/vehicle.service';
import { MAX_VEHICLE_NAME_LENGTH, vehicleNameChanged, vehicleNameError } from '@core/Utils/admin-vehicles.utils';
import { describeApiError, parseApiErrorAsync } from '@core/Utils/api-error.utils';

@Component({
	selector: 'app-vehicle-form',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<form class="space-y-5" novalidate (submit)="$event.preventDefault(); submit()">
			<div>
				<label for="vehicle-name" class="form-label">Nombre</label>
				<input
					id="vehicle-name"
					type="text"
					autocomplete="off"
					class="form-input uppercase"
					placeholder="FOTON 059"
					[maxLength]="maxName"
					[value]="name()"
					[disabled]="saving()"
					[attr.aria-invalid]="submitted() && error() ? 'true' : null"
					(input)="name.set($any($event.target).value)"
				/>
				@if (submitted() && error(); as message) {
					<p class="form-error">{{ message }}</p>
				}
				<p class="mt-1.5 text-xs text-slate-500">
					Inclúyele lo que lo identifique (tipo, número o placa). Los domiciliarios lo comparten: a cada uno se le da un
					código propio en sus asignaciones.
				</p>
			</div>

			<div class="flex flex-wrap items-start justify-between gap-3 border-t border-slate-200 pt-4">
				<div class="min-h-5 text-sm font-semibold text-danger-700" role="alert">
					@for (message of serverErrors(); track $index) {
						<p>{{ message }}</p>
					}
				</div>
				<div class="flex gap-3">
					<button type="button" class="btn-secondary" [disabled]="saving()" (click)="cancelled.emit()">Cancelar</button>
					<button type="submit" class="btn-primary" [disabled]="saving() || unchanged()" [title]="unchanged() ? 'No hay cambios para guardar' : ''">
						{{ saving() ? 'Guardando…' : isEdit() ? 'Guardar cambios' : 'Crear vehículo' }}
					</button>
				</div>
			</div>
		</form>
	`,
})
export class VehicleFormComponent {
	private readonly vehicles = inject(VehicleService);

	// null = vehículo nuevo
	readonly vehicle = input<VehicleAdminRow | null>(null);
	readonly saved = output<VehicleAdminRow>();
	readonly cancelled = output<void>();

	protected readonly maxName = MAX_VEHICLE_NAME_LENGTH;
	protected readonly isEdit = computed(() => this.vehicle() !== null);
	protected readonly name = linkedSignal(() => this.vehicle()?.name ?? '');
	protected readonly error = computed(() => vehicleNameError(this.name()));
	protected readonly unchanged = computed(() => !vehicleNameChanged(this.vehicle(), this.name()));

	protected readonly submitted = signal(false);
	protected readonly saving = signal(false);
	protected readonly serverErrors = signal<string[]>([]);

	protected async submit(): Promise<void> {
		this.submitted.set(true);
		if (this.saving() || this.error() !== null || this.unchanged()) return;

		const vehicle = this.vehicle();
		const name = this.name().trim();
		this.saving.set(true);
		this.serverErrors.set([]);
		try {
			const row = await firstValueFrom(
				vehicle ? this.vehicles.updateAdmin(vehicle.id_vehicle, { name }) : this.vehicles.createAdmin({ name })
			);
			this.saved.emit(row);
		} catch (error) {
			this.serverErrors.set(describeApiError(await parseApiErrorAsync(error)));
		} finally {
			this.saving.set(false);
		}
	}
}
