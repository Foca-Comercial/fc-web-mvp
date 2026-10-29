// ==================================================
// Componente: <app-driver-form>
// ==================================================
// Datos de la persona del domiciliario: crea (POST /drivers/admin) o edita
// (PATCH /drivers/admin/{id_user}, solo lo que cambió). Al crear, la API arma el usuario
// (nombre.apellido) con la contraseña inicial y le da el rol VENDEDOR; los vehículos y
// códigos se agregan después en sus asignaciones.
//
// Se monta solo mientras el modal está abierto. Los errores de la API van en línea
// porque esto vive dentro de un <dialog> modal.

import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { NumericInputDirective } from '@core/Directives/numeric-input.directive';
import { DriverAdminRow } from '@core/Models/CoreModule/driver.model';
import { DriverService } from '@core/Service/CoreModule/driver.service';
import {
	DRIVER_PHONE_DIGITS,
	DriverDraft,
	MAX_DRIVER_NAME_LENGTH,
	draftFromDriver,
	driverChanges,
	driverErrors,
	hasDriverChanges,
	hasDriverErrors,
	toDriverCreate,
} from '@core/Utils/admin-drivers.utils';
import { describeApiError, parseApiErrorAsync } from '@core/Utils/api-error.utils';

@Component({
	selector: 'app-driver-form',
	imports: [NumericInputDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './driver-form.component.html',
})
export class DriverFormComponent {
	private readonly drivers = inject(DriverService);

	// null = domiciliario nuevo
	readonly driver = input<DriverAdminRow | null>(null);
	readonly saved = output<DriverAdminRow>();
	readonly cancelled = output<void>();

	protected readonly phoneDigits = DRIVER_PHONE_DIGITS;
	protected readonly maxName = MAX_DRIVER_NAME_LENGTH;

	protected readonly isEdit = computed(() => this.driver() !== null);
	protected readonly draft = linkedSignal<DriverDraft>(() => draftFromDriver(this.driver()));
	protected readonly errors = computed(() => driverErrors(this.draft()));

	private readonly changes = computed(() => {
		const driver = this.driver();
		return driver ? driverChanges(driver, this.draft()) : null;
	});
	protected readonly unchanged = computed(() => {
		const changes = this.changes();
		return changes !== null && !hasDriverChanges(changes);
	});

	protected readonly submitted = signal(false);
	protected readonly saving = signal(false);
	protected readonly serverErrors = signal<string[]>([]);

	protected patchDraft(patch: Partial<DriverDraft>): void {
		this.draft.update((draft) => ({ ...draft, ...patch }));
	}

	protected async submit(): Promise<void> {
		this.submitted.set(true);
		if (this.saving() || hasDriverErrors(this.errors()) || this.unchanged()) return;

		const driver = this.driver();
		const changes = this.changes();
		this.saving.set(true);
		this.serverErrors.set([]);
		try {
			const row = await firstValueFrom(
				driver && changes ? this.drivers.update(driver.id_user, changes) : this.drivers.create(toDriverCreate(this.draft()))
			);
			this.saved.emit(row);
		} catch (error) {
			this.serverErrors.set(describeApiError(await parseApiErrorAsync(error)));
		} finally {
			this.saving.set(false);
		}
	}
}
