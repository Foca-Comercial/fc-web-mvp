import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { IconComponent } from '@components/Shared/icon/icon.component';
import { AlertService } from '@core/Service/Alerts/alert.service';
import { NavigationService } from '@core/Service/Navigation/navigation.service';

// Menú lateral agrupado por secciones (Operación, Trazabilidad, Soporte). Los ítems ya
// vienen filtrados por rol desde NavigationService. Se puede ocultar con el botón del
// header; en móvil es un panel flotante con fondo oscurecido.
@Component({
	selector: 'app-sidebar',
	imports: [RouterLink, RouterLinkActive, IconComponent],
	templateUrl: './app-sidebar.component.html',
})
export class AppSidebarComponent {
	protected readonly nav = inject(NavigationService);
	private readonly alert = inject(AlertService);

	// "Ayuda" aún no tiene pantalla propia
	protected openHelp(): void {
		void this.alert.info('Ayuda', 'Muy pronto encontrarás aquí la guía de uso del sistema.');
	}
}
