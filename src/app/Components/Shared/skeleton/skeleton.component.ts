// ==================================================
// Componente: <app-skeleton>
// ==================================================
// Bloque gris que "respira" mientras llegan los datos. El tamaño y la forma los pone
// quien lo usa con clases (se anima solo si el usuario no pidió reducir movimiento):
//
//   <app-skeleton class="h-4 w-32 rounded-md" />
//   <app-skeleton class="size-10 rounded-full" />

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'app-skeleton',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'block bg-slate-200 motion-safe:animate-pulse', 'aria-hidden': 'true' },
	template: '',
})
export class SkeletonComponent {}
