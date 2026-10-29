// ==================================================
// Componente: <app-client-form>
// ==================================================
// Formulario de cliente registrado del panel de administración: crea
// (POST /clients/admin) o edita (PATCH /clients/admin/{id}, solo lo que cambió).
// Mismas reglas que el cliente nuevo del pedido (new-order.utils): nombre obligatorio,
// teléfono de 10 dígitos, dirección opcional y barrio.
//
// Se monta solo mientras el modal está abierto, así cada vez arranca con los datos del
// cliente (o en blanco). Los barrios llegan desde la vista (se cargan una sola vez).
// Los errores de la API van en línea porque esto vive dentro de un <dialog> modal.
//
//   @if (formOpen()) {
//     <app-client-form [client]="editing()" [neighborhoods]="neighborhoods()" (saved)="onSaved($event)" (cancelled)="…" />
//   }

import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { NumericInputDirective } from '@core/Directives/numeric-input.directive';
import { ClientAdminRow } from '@core/Models/CoreModule/catalog.model';
import { NeighborhoodDropdown } from '@core/Models/ParametersModule/parameters.model';
import { ClientService } from '@core/Service/CoreModule/client.service';
import { clientChanges, draftFromClient, hasChanges, neighborhoodChoices, toClientAdminCreate } from '@core/Utils/admin-clients.utils';
import { describeApiError, parseApiErrorAsync } from '@core/Utils/api-error.utils';
import {
	MAX_CLIENT_ADDRESS_LENGTH,
	MAX_CLIENT_NAME_LENGTH,
	NewClientDraft,
	PHONE_DIGITS,
	hasErrors,
	neighborhoodLabel,
	newClientErrors,
} from '@core/Utils/new-order.utils';

@Component({
	selector: 'app-client-form',
	imports: [NumericInputDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './client-form.component.html',
})
export class ClientFormComponent {
	private readonly clients = inject(ClientService);

	// null = cliente nuevo
	readonly client = input<ClientAdminRow | null>(null);
	// undefined = cargando, null = no se pudo cargar
	readonly neighborhoods = input<readonly NeighborhoodDropdown[] | null | undefined>(undefined);
	readonly saved = output<ClientAdminRow>();
	readonly cancelled = output<void>();

	protected readonly phoneDigits = PHONE_DIGITS;
	protected readonly maxName = MAX_CLIENT_NAME_LENGTH;
	protected readonly maxAddress = MAX_CLIENT_ADDRESS_LENGTH;
	protected readonly neighborhoodLabel = neighborhoodLabel;

	protected readonly isEdit = computed(() => this.client() !== null);
	protected readonly draft = linkedSignal<NewClientDraft>(() => draftFromClient(this.client()));
	protected readonly errors = computed(() => newClientErrors(this.draft()));
	protected readonly choices = computed(() => {
		const list = this.neighborhoods();
		return list ? neighborhoodChoices(list, this.client()) : list;
	});

	// En edición solo se envía lo que cambió; sin cambios no hay nada que guardar
	private readonly changes = computed(() => {
		const client = this.client();
		return client ? clientChanges(client, this.draft()) : null;
	});
	protected readonly unchanged = computed(() => {
		const changes = this.changes();
		return changes !== null && !hasChanges(changes);
	});

	protected readonly submitted = signal(false); // tras el primer intento, se muestran los errores
	protected readonly saving = signal(false);
	protected readonly serverErrors = signal<string[]>([]);

	protected patchDraft(patch: Partial<NewClientDraft>): void {
		this.draft.update((draft) => ({ ...draft, ...patch }));
	}

	protected setNeighborhood(value: string): void {
		this.patchDraft({ idNeighborhood: value ? Number(value) : null });
	}

	protected async submit(): Promise<void> {
		this.submitted.set(true);
		if (this.saving() || hasErrors(this.errors()) || this.unchanged()) return;

		const client = this.client();
		const changes = this.changes();
		this.saving.set(true);
		this.serverErrors.set([]);
		try {
			const row = await firstValueFrom(
				client && changes
					? this.clients.updateAdmin(client.id_client, changes)
					: this.clients.createAdmin(toClientAdminCreate(this.draft()))
			);
			this.saved.emit(row);
		} catch (error) {
			this.serverErrors.set(describeApiError(await parseApiErrorAsync(error)));
		} finally {
			this.saving.set(false);
		}
	}
}
