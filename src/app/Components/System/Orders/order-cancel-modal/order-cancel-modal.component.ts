// ==================================================
// Componente: <app-order-cancel-modal>
// ==================================================
// Cancela un pedido PENDING o DISPATCHED (POST /orders/{id}/cancel) con un motivo de la lista
// fija y una nota opcional. Se abre cuando `order` trae un pedido; avisa con `(closed)` para
// que quien lo usa lo vuelva a dejar en null y con `(done)` cuando la API lo canceló.
// Lo usan el tablero (botón por fila) y el detalle del pedido.
//
//   <app-order-cancel-modal [order]="cancelling()" (closed)="cancelling.set(null)" (done)="reload()" />
//
// Vive en un <dialog>: los errores van EN LÍNEA, no con SweetAlert.

import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ModalComponent } from '@components/Shared/modal/modal.component';
import { Order } from '@core/Models/CoreModule/order.model';
import { CancelReason } from '@core/Models/Shared/api-types.model';
import { OrderService } from '@core/Service/CoreModule/order.service';
import { describeApiError, parseApiErrorAsync } from '@core/Utils/api-error.utils';
import {
	CANCEL_REASON_OPTIONS,
	CancellableOrder,
	MAX_CANCEL_NOTE_LENGTH,
	cancelNoteError,
	cancelNotice,
	cancelReasonError,
	toCancelRequest,
} from '@core/Utils/order-cancel.utils';

@Component({
	selector: 'app-order-cancel-modal',
	imports: [ModalComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<app-modal [title]="title()" [open]="order() !== null" (openChange)="onOpenChange($event)" maxWidth="max-w-lg">
			@if (order(); as order) {
				<form class="space-y-5" novalidate (submit)="$event.preventDefault(); submit(order)">
					<p class="text-sm text-slate-600">
						<span class="font-semibold text-slate-900">{{ order.client_name }}</span>. {{ notice() }}
					</p>

					<fieldset [disabled]="saving()">
						<legend class="form-label">Motivo</legend>
						<div class="grid gap-2 sm:grid-cols-2">
							@for (option of reasonOptions; track option.value) {
								<label
									class="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition"
									[class]="reason() === option.value ? 'border-brand-600 bg-brand-50 font-semibold text-brand-950' : 'border-slate-300 text-slate-700 hover:bg-slate-50'"
								>
									<input
										type="radio"
										name="cancel-reason"
										class="size-4 accent-brand-700"
										[value]="option.value"
										[checked]="reason() === option.value"
										(change)="reason.set($any(option.value))"
									/>
									{{ option.label }}
								</label>
							}
						</div>
						@if (submitted() && reasonError(); as message) {
							<p class="form-error">{{ message }}</p>
						}
					</fieldset>

					<div>
						<label for="cancel-note" class="form-label">Nota (opcional)</label>
						<textarea
							id="cancel-note"
							rows="2"
							class="form-input resize-y"
							placeholder="Detalle de lo que pasó"
							[maxLength]="maxNote"
							[value]="note()"
							[disabled]="saving()"
							[attr.aria-invalid]="noteError() ? 'true' : null"
							(input)="note.set($any($event.target).value)"
						></textarea>
						<p class="mt-1 text-right text-xs tabular-nums text-slate-400">{{ note().length }}/{{ maxNote }}</p>
						@if (noteError(); as message) {
							<p class="form-error">{{ message }}</p>
						}
					</div>

					<div class="flex flex-wrap items-start justify-between gap-3 border-t border-slate-200 pt-4">
						<div class="min-h-5 text-sm font-semibold text-danger-700" role="alert">
							@for (message of serverErrors(); track $index) {
								<p>{{ message }}</p>
							}
						</div>
						<div class="flex gap-3">
							<button type="button" class="btn-secondary" [disabled]="saving()" (click)="onOpenChange(false)">Volver</button>
							<button type="submit" class="btn-danger" [disabled]="saving()">
								{{ saving() ? 'Cancelando…' : 'Cancelar pedido' }}
							</button>
						</div>
					</div>
				</form>
			}
		</app-modal>
	`,
})
export class OrderCancelModalComponent {
	private readonly orders = inject(OrderService);

	// null = cerrado
	readonly order = input<CancellableOrder | null>(null);
	readonly closed = output<void>();
	readonly done = output<Order>();

	protected readonly reasonOptions = CANCEL_REASON_OPTIONS;
	protected readonly maxNote = MAX_CANCEL_NOTE_LENGTH;

	// El formulario arranca en blanco con cada pedido
	protected readonly reason = linkedSignal<CancellableOrder | null, CancelReason | null>({
		source: this.order,
		computation: () => null,
	});
	protected readonly note = linkedSignal({ source: this.order, computation: () => '' });
	protected readonly submitted = linkedSignal({ source: this.order, computation: () => false });
	protected readonly serverErrors = linkedSignal<CancellableOrder | null, string[]>({
		source: this.order,
		computation: () => [],
	});
	protected readonly saving = signal(false);

	protected readonly reasonError = computed(() => cancelReasonError(this.reason()));
	protected readonly noteError = computed(() => cancelNoteError(this.note()));
	protected readonly notice = computed(() => {
		const order = this.order();
		return order ? cancelNotice(order.state) : '';
	});

	protected title(): string {
		const order = this.order();
		return order ? `Cancelar pedido ${order.purchase_order}` : 'Cancelar pedido';
	}

	protected onOpenChange(open: boolean): void {
		if (!open && !this.saving()) this.closed.emit();
	}

	protected async submit(order: CancellableOrder): Promise<void> {
		this.submitted.set(true);
		const reason = this.reason();
		if (this.saving() || reason === null || this.noteError() !== null) return;

		this.saving.set(true);
		this.serverErrors.set([]);
		try {
			const cancelled = await firstValueFrom(this.orders.cancel(order.id_order, toCancelRequest(reason, this.note())));
			this.done.emit(cancelled);
			this.closed.emit();
		} catch (error) {
			this.serverErrors.set(describeApiError(await parseApiErrorAsync(error)));
		} finally {
			this.saving.set(false);
		}
	}
}
