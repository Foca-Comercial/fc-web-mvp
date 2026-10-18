// ===== SERVICIO DE REDIRECCIÓN POR ROL =====
// Decide la pantalla de inicio según los roles del usuario. Centraliza el mapeo
// para que el login, el guard de invitados y el 403 lleven al mismo lugar.

import { inject, Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { APP_ROUTES } from '@core/Constants/app-routes';
import { ROLES } from '@core/Constants/roles';

@Injectable({ providedIn: 'root' })
export class RoleRedirectService {
	private readonly router = inject(Router);

	// Orden de prioridad: el primer rol que tenga el usuario define su inicio.
	// VENDEDOR (domiciliario) aún no opera en la web: no tiene inicio propio.
	private readonly homeByRole: readonly [string, string][] = [
		[ROLES.ADMIN, APP_ROUTES.ORDERS],
		[ROLES.COMMERCIAL_MANAGER, APP_ROUTES.ORDERS],
	];

	homeFor(roles: readonly string[]): string {
		const match = this.homeByRole.find(([role]) => roles.includes(role));
		return match ? match[1] : APP_ROUTES.ACCESS_DENIED;
	}

	homeUrlTree(roles: readonly string[]): UrlTree {
		return this.router.parseUrl(this.homeFor(roles));
	}

	redirect(roles: readonly string[], returnUrl?: string | null): Promise<boolean> {
		// Solo se respeta un returnUrl interno (evita redirecciones abiertas)
		if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') && returnUrl !== APP_ROUTES.LOGIN) {
			return this.router.navigateByUrl(returnUrl);
		}
		return this.router.navigateByUrl(this.homeFor(roles));
	}
}
