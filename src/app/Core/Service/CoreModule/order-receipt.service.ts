import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { parseApiErrorAsync } from '@core/Utils/api-error.utils';
import { OrderService } from './order.service';

export type ReceiptResult = { ok: true } | { ok: false; message: string };

// Impresión del comprobante de despacho (CD): lo abre en una pestaña nueva, ya con el
// visor de PDF del navegador listo para imprimir.
//
// No muestra alertas: quien lo llama decide cómo avisar del error (el modal de detalle
// lo hace en línea porque SweetAlert no se puede usar encima de un <dialog>).
@Injectable({ providedIn: 'root' })
export class OrderReceiptService {
	private readonly orders = inject(OrderService);

	// Debe llamarse directo desde un clic (o justo después de una alerta confirmada): la
	// pestaña se abre ANTES de pedir el PDF porque, si se abriera al llegar la respuesta,
	// el navegador la tomaría por una ventana emergente no pedida y la bloquearía.
	async print(idOrder: number): Promise<ReceiptResult> {
		const tab = window.open('', '_blank');
		if (!tab) {
			return {
				ok: false,
				message: 'El navegador bloqueó la pestaña del comprobante. Permite las ventanas emergentes de este sitio e inténtalo de nuevo.',
			};
		}

		try {
			const pdf = await firstValueFrom(this.orders.getReceipt(idOrder));
			const url = URL.createObjectURL(pdf);
			tab.location.href = url;
			// Se libera cuando la pestaña ya alcanzó a cargarlo
			setTimeout(() => URL.revokeObjectURL(url), 60_000);
			return { ok: true };
		} catch (error) {
			tab.close();
			return { ok: false, message: (await parseApiErrorAsync(error)).message };
		}
	}
}
