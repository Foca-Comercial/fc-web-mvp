import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppHeaderComponent } from '@components/Layout/app-header/app-header.component';
import { AppSidebarComponent } from '@components/Layout/app-sidebar/app-sidebar.component';
import { NavigationService } from '@core/Service/Navigation/navigation.service';

// Layout de la app autenticada, en tres zonas: header, sidebar y sección principal.
// La sección principal es el lienzo azul claro (bg-canvas) donde cada vista pone sus
// tarjetas blancas; cuando el sidebar se oculta en escritorio, ocupa todo el ancho.
@Component({
	selector: 'app-system-shell',
	imports: [RouterOutlet, AppHeaderComponent, AppSidebarComponent],
	template: `
		<app-header />
		<app-sidebar />
		<main
			class="min-h-dvh bg-canvas pt-header transition-[padding] duration-300 ease-out"
			[class]="nav.sidebarOpen() ? 'lg:pl-sidebar' : 'lg:pl-0'"
		>
			<div class="mx-auto max-w-[100rem] p-4 sm:p-6 lg:p-8">
				<router-outlet />
			</div>
		</main>
	`,
})
export class SystemShellComponent {
	protected readonly nav = inject(NavigationService);
}
