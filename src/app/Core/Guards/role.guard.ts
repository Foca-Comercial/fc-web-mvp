// ==================================================
// Guards: roleGuard / roleMatchGuard
// ==================================================
// Permiten el acceso si el usuario tiene alguno de los roles de `data.roles`.
// Igual que en la API: ADMINISTRADOR siempre pasa, y una ruta sin `data.roles`
// queda solo para ADMINISTRADOR (seguro por defecto).
//
//   { path: 'cierre', canActivate: [roleGuard], data: { roles: [ROLES.COMMERCIAL_MANAGER] } }
//
// roleMatchGuard es la variante para rutas lazy con `loadChildren` (canMatch): si el
// usuario no tiene el rol, el chunk ni siquiera se descarga. Basta ponerlo en la ruta
// padre; las hijas quedan protegidas.
//
//   { path: 'administracion', canMatch: [roleMatchGuard], loadChildren: … }

import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Data, Router, UrlTree } from '@angular/router';
import { APP_ROUTES } from '@core/Constants/app-routes';
import { AuthService } from '@core/Service/Auth/auth.service';

export const roleGuard: CanActivateFn = (route, state) => checkRoles(route.data, state.url);

export const roleMatchGuard: CanMatchFn = (route, segments) =>
	checkRoles(route.data, '/' + segments.map((segment) => segment.path).join('/'));

function checkRoles(data: Data | undefined, url: string): boolean | UrlTree {
	const auth = inject(AuthService);
	const router = inject(Router);

	if (!auth.isAuthenticated()) {
		return router.createUrlTree([APP_ROUTES.LOGIN], { queryParams: { returnUrl: url } });
	}

	const allowed = (data?.['roles'] as string[] | undefined) ?? [];
	return auth.hasAnyRole(allowed) ? true : router.createUrlTree([APP_ROUTES.ACCESS_DENIED]);
}
