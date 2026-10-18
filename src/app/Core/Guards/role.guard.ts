// ==================================================
// Guard: roleGuard
// ==================================================
// Permite el acceso si el usuario tiene alguno de los roles de `data.roles`.
// Igual que en la API: ADMINISTRADOR siempre pasa, y una ruta sin `data.roles`
// queda solo para ADMINISTRADOR (seguro por defecto).
//
//   { path: 'cierre', canActivate: [roleGuard], data: { roles: [ROLES.COMMERCIAL_MANAGER] } }

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { APP_ROUTES } from '@core/Constants/app-routes';
import { AuthService } from '@core/Service/Auth/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
	const auth = inject(AuthService);
	const router = inject(Router);

	if (!auth.isAuthenticated()) {
		return router.createUrlTree([APP_ROUTES.LOGIN], { queryParams: { returnUrl: state.url } });
	}

	const allowed = (route.data['roles'] as string[] | undefined) ?? [];
	return auth.hasAnyRole(allowed) ? true : router.createUrlTree([APP_ROUTES.ACCESS_DENIED]);
};
