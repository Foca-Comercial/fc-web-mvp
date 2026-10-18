// ==================================================
// Directiva: appLogoutButton
// ==================================================
// Convierte cualquier elemento en botón de cerrar sesión, con confirmación.
//   <button appLogoutButton>Cerrar sesión</button>

import { Directive, HostListener, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { APP_ROUTES } from '@core/Constants/app-routes';
import { AlertService } from '@core/Service/Alerts/alert.service';
import { AuthService } from '@core/Service/Auth/auth.service';

@Directive({ selector: '[appLogoutButton]' })
export class LogoutButtonDirective {
	private readonly alert = inject(AlertService);
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);

	@HostListener('click')
	async onClick(): Promise<void> {
		if (!(await this.alert.confirmLogout())) return;

		// logout() limpia la sesión local aunque la API falle
		await firstValueFrom(this.auth.logout(), { defaultValue: undefined });
		this.alert.toast('Sesión cerrada correctamente');
		await this.router.navigateByUrl(APP_ROUTES.LOGIN);
	}
}
