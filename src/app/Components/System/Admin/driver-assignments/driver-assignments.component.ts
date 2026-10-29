// ==================================================
// Componente: <app-driver-assignments>
// ==================================================
// Asignaciones de un domiciliario: cada una es un vehículo con su código de vendedor
// (2 dígitos, el que ve Siigo y el selector de domiciliarios del pedido).
//   - Agregar: vehículo activo que aún no tenga + código (se sugiere el siguiente libre).
//   - Cambiar código o vehículo y borrar: solo si la asignación nunca se usó. Con pedidos
//     o cierres solo se activa / desactiva (el cierre y Siigo usan el código actual).
//   - La del vendedor por defecto del cierre está protegida.
//
// Vive dentro de un <dialog> modal: confirmaciones y errores en línea. Avisa con
// (changed) tras cada cambio para que la vista refresque los códigos de su tabla.

import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, firstValueFrom, map, Observable, of } from 'rxjs';

import { IconButtonComponent } from '@components/Shared/icon-button/icon-button.component';
import { SkeletonComponent } from '@components/Shared/skeleton/skeleton.component';
import { StatusBadgeComponent } from '@components/Shared/status-badge/status-badge.component';
import { NumericInputDirective } from '@core/Directives/numeric-input.directive';
import { DriverAdminRow, DriverAssignment, DriverAssignmentUpdate } from '@core/Models/CoreModule/driver.model';
import { DriverService } from '@core/Service/CoreModule/driver.service';
import { VehicleService } from '@core/Service/ParametersModule/vehicle.service';
import {
	SELLER_CODE_DIGITS,
	availableVehicles,
	driverFullName,
	isEditableAssignment,
	isSellerCode,
	removeAssignment,
	upsertAssignment,
} from '@core/Utils/admin-drivers.utils';
import { describeApiError, parseApiErrorAsync } from '@core/Utils/api-error.utils';

type Result<T> = { ok: true; data: T } | { ok: false };

// Asignación nueva o en edición: vehículo y código escritos
interface AssignmentDraft {
	idVehicle: number | null;
	code: string;
}

// Clave de la petición en vuelo: id de la asignación o 'new' al agregar
type BusyKey = number | 'new';

@Component({
	selector: 'app-driver-assignments',
	imports: [IconButtonComponent, NumericInputDirective, SkeletonComponent, StatusBadgeComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './driver-assignments.component.html',
})
export class DriverAssignmentsComponent {
	private readonly drivers = inject(DriverService);
	private readonly vehicleService = inject(VehicleService);

	readonly driver = input.required<DriverAdminRow>();
	readonly changed = output<void>();
	readonly closed = output<void>();

	protected readonly codeDigits = SELLER_CODE_DIGITS;
	protected readonly fullName = computed(() => driverFullName(this.driver()));
	protected readonly isEditable = isEditableAssignment;
	protected readonly isSellerCode = isSellerCode;

	// ----- Datos. undefined = cargando, null = no se pudo cargar -----
	protected readonly rows = signal<DriverAssignment[] | null | undefined>(undefined);
	// Vehículos activos (GET /vehicles/ ya filtra los inactivos)
	protected readonly vehicles = toSignal(
		this.vehicleService.getAll({ limit: 100 }).pipe(catchError(() => of(null))),
		{ initialValue: undefined }
	);
	// Vehículos que se pueden agregar (los que aún no tiene)
	protected readonly addableVehicles = computed(() => availableVehicles(this.vehicles() ?? [], this.rows() ?? []));

	// ----- Edición -----
	protected readonly adding = signal<AssignmentDraft | null>(null);
	protected readonly editing = signal<(AssignmentDraft & { id: number }) | null>(null);
	protected readonly confirmDelete = signal<number | null>(null);
	protected readonly busy = signal<BusyKey | null>(null);
	protected readonly errors = signal<string[]>([]);

	constructor() {
		// Carga las asignaciones al montarse (el modal lo monta al abrirse)
		effect(() => {
			const idUser = this.driver().id_user;
			untracked(() => void this.load(idUser));
		});
	}

	// Opciones de vehículo al editar: los que no tiene más el actual
	protected editVehicles(row: DriverAssignment) {
		return availableVehicles(this.vehicles() ?? [], this.rows() ?? [], row.id_vehicle);
	}

	// ----- Agregar -----
	protected async startAdd(): Promise<void> {
		this.errors.set([]);
		this.editing.set(null);
		const first = this.addableVehicles()[0]?.id_vehicle ?? null;
		this.adding.set({ idVehicle: first, code: '' });
		// Sugiere el siguiente código libre (si falla, se escribe a mano)
		const next = await firstValueFrom(
			this.drivers.getNextCode().pipe(
				map((result) => result.code),
				catchError(() => of(null))
			)
		);
		this.adding.update((draft) => (draft && !draft.code && next ? { ...draft, code: next } : draft));
	}

	protected patchAdding(patch: Partial<AssignmentDraft>): void {
		this.adding.update((draft) => (draft ? { ...draft, ...patch } : draft));
	}

	protected cancelAdd(): void {
		this.adding.set(null);
	}

	protected canSave(draft: AssignmentDraft): boolean {
		return draft.idVehicle !== null && isSellerCode(draft.code) && this.busy() === null;
	}

	protected async confirmAdd(): Promise<void> {
		const draft = this.adding();
		if (!draft || !this.canSave(draft)) return;
		const result = await this.run(
			'new',
			this.drivers.createAssignment(this.driver().id_user, { id_vehicle: draft.idVehicle as number, code: draft.code })
		);
		if (!result.ok) return;
		this.rows.update((rows) => upsertAssignment(rows ?? [], result.data));
		this.adding.set(null);
		this.changed.emit();
	}

	// ----- Cambiar código / vehículo (solo sin uso) -----
	protected startEdit(row: DriverAssignment): void {
		this.errors.set([]);
		this.adding.set(null);
		this.confirmDelete.set(null);
		this.editing.set({ id: row.id_user_vehicle, idVehicle: row.id_vehicle, code: row.code });
	}

	protected patchEditing(patch: Partial<AssignmentDraft>): void {
		this.editing.update((draft) => (draft ? { ...draft, ...patch } : draft));
	}

	protected cancelEdit(): void {
		this.editing.set(null);
	}

	protected async saveEdit(row: DriverAssignment): Promise<void> {
		const draft = this.editing();
		if (!draft || draft.id !== row.id_user_vehicle || !this.canSave(draft)) return;
		const changes: DriverAssignmentUpdate = {};
		if (draft.code !== row.code) changes.code = draft.code;
		if (draft.idVehicle !== row.id_vehicle) changes.id_vehicle = draft.idVehicle as number;
		if (Object.keys(changes).length === 0) {
			this.editing.set(null);
			return;
		}
		const ok = await this.update(row, changes);
		if (ok) this.editing.set(null);
	}

	// ----- Activar / desactivar -----
	protected async toggleActive(row: DriverAssignment): Promise<void> {
		await this.update(row, { active: !row.active });
	}

	// ----- Borrar (solo sin uso) -----
	protected askDelete(row: DriverAssignment): void {
		this.editing.set(null);
		this.confirmDelete.set(row.id_user_vehicle);
	}

	protected cancelDelete(): void {
		this.confirmDelete.set(null);
	}

	protected async remove(row: DriverAssignment): Promise<void> {
		const result = await this.run(row.id_user_vehicle, this.drivers.deleteAssignment(this.driver().id_user, row.id_user_vehicle));
		this.confirmDelete.set(null);
		if (!result.ok) return;
		this.rows.update((rows) => removeAssignment(rows ?? [], row.id_user_vehicle));
		this.changed.emit();
	}

	// ----- Interno -----
	protected retry(): void {
		void this.load(this.driver().id_user);
	}

	private async update(row: DriverAssignment, changes: DriverAssignmentUpdate): Promise<boolean> {
		const result = await this.run(
			row.id_user_vehicle,
			this.drivers.updateAssignment(this.driver().id_user, row.id_user_vehicle, changes)
		);
		if (!result.ok) return false;
		this.rows.update((rows) => upsertAssignment(rows ?? [], result.data));
		this.changed.emit();
		return true;
	}

	private async load(idUser: number): Promise<void> {
		this.rows.set(undefined);
		this.errors.set([]);
		try {
			this.rows.set(await firstValueFrom(this.drivers.getAssignments(idUser)));
		} catch (error) {
			this.rows.set(null);
			this.errors.set(describeApiError(await parseApiErrorAsync(error)));
		}
	}

	// Una petición a la vez; el error se muestra en línea
	private async run<T>(key: BusyKey, request: Observable<T>): Promise<Result<T>> {
		this.busy.set(key);
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
