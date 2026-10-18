import { Component, inject } from '@angular/core';
import { LogoutButtonDirective } from '@core/Directives/logout-button.directive';
import { AuthService } from '@core/Service/Auth/auth.service';
import { NavigationService } from '@core/Service/Navigation/navigation.service';

// Barra superior: botón de menú (móvil), marca y usuario.
// PROVISIONAL en lo visual: se rediseña con la identidad de Foca Comercial.
@Component({
	selector: 'app-header',
	imports: [LogoutButtonDirective],
	templateUrl: './app-header.component.html',
})
export class AppHeaderComponent {
	protected readonly auth = inject(AuthService);
	protected readonly nav = inject(NavigationService);
}
