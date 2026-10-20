// ===== SERVICIO DE RELOJ =====
// Un solo `now` compartido que se actualiza cada 30 s. Los estados que dependen de la
// hora (Próximo / Retrasado) lo leen en un `computed` y se refrescan solos, sin que
// cada fila de la tabla cree su propio temporizador.

import { DestroyRef, inject, Injectable, signal } from '@angular/core';

const TICK_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class ClockService {
	private readonly current = signal(new Date());
	readonly now = this.current.asReadonly();

	constructor() {
		const timer = setInterval(() => this.current.set(new Date()), TICK_MS);
		inject(DestroyRef).onDestroy(() => clearInterval(timer));
	}
}
