// ==================================================
// Componente: <app-new-order-modal>
// ==================================================
// Ventana "Nuevo pedido". El formulario se monta solo mientras está abierta, así cada vez
// empieza en blanco. Avisa con `(created)` cuando la API registró el pedido.
//
//   <app-new-order-modal [(open)]="newOrderOpen" (created)="onCreated($event)" />

import { ChangeDetectionStrategy, Component, model, output } from '@angular/core';

import { ModalComponent } from '@components/Shared/modal/modal.component';
import { NewOrderFormComponent } from '@components/System/Orders/new-order-form/new-order-form.component';
import { OrderWithDetails } from '@core/Models/CoreModule/order.model';

@Component({
	selector: 'app-new-order-modal',
	imports: [ModalComponent, NewOrderFormComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<app-modal title="Nuevo pedido" [(open)]="open" maxWidth="max-w-4xl">
			@if (open()) {
				<app-new-order-form (created)="onCreated($event)" (cancelled)="open.set(false)" />
			}
		</app-modal>
	`,
})
export class NewOrderModalComponent {
	readonly open = model(false);
	readonly created = output<OrderWithDetails>();

	protected onCreated(order: OrderWithDetails): void {
		this.open.set(false);
		this.created.emit(order);
	}
}
