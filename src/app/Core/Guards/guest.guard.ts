// ==================================================
// Guard: guestGuard
// ==================================================
// Para el login: si ya hay sesión, lleva al inicio que corresponde a su rol.

import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '@core/Service/Auth/auth.service';
import { RoleRedirectService } from '@core/Service/Auth/role-redirect.service';

export const guestGuard: CanActivateFn = () => {
	const auth = inject(AuthService);
	const redirect = inject(RoleRedirectService);

	return auth.isAuthenticated() ? redirect.homeUrlTree(auth.roles()) : true;
};
