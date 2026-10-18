// ==================================================
// Guard: authGuard
// ==================================================
// Protege las rutas que requieren sesión. No necesita llamar al backend: el
// APP_INITIALIZER ya intentó recuperar la sesión antes del primer ruteo.
// Sin sesión → al login, recordando a dónde quería ir.

import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { APP_ROUTES } from '@core/Constants/app-routes';
import { AuthService } from '@core/Service/Auth/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
	const auth = inject(AuthService);
	const router = inject(Router);

	if (auth.isAuthenticated()) return true;

	return router.createUrlTree([APP_ROUTES.LOGIN], { queryParams: { returnUrl: state.url } });
};

// Variante para rutas lazy: evita incluso descargar el chunk si no hay sesión
export const authMatchGuard: CanMatchFn = (_route, segments) => {
	const auth = inject(AuthService);
	const router = inject(Router);

	if (auth.isAuthenticated()) return true;

	const returnUrl = '/' + segments.map((s) => s.path).join('/');
	return router.createUrlTree([APP_ROUTES.LOGIN], { queryParams: { returnUrl } });
};
