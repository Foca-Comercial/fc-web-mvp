// ==================================================
// Interceptor: authInterceptor
// ==================================================
// 1. Agrega `Authorization: Bearer <access token>` a las peticiones a la API.
// 2. Ante un 401, renueva el token UNA vez (refresh compartido entre peticiones
//    simultáneas, ver AuthService) y reintenta la petición original.
// 3. Si el refresh falla, la sesión terminó: limpia y manda al login.
//
// Los endpoints de auth (login, refresh, logout) nunca llevan Bearer ni disparan
// el refresh, para no entrar en un ciclo.

import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { PUBLIC_AUTH_ENDPOINTS } from '@core/Constants/api-endpoints';
import { AuthService } from '@core/Service/Auth/auth.service';
import { environment } from '@env/environment';

function withToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
	return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function isApiRequest(url: string): boolean {
	return url.startsWith(environment.apiUrl);
}

function isPublicAuthEndpoint(url: string): boolean {
	return PUBLIC_AUTH_ENDPOINTS.some((endpoint) => url.startsWith(endpoint));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
	// Peticiones a otros orígenes (fuentes, CDNs) y endpoints públicos de auth: tal cual
	if (!isApiRequest(req.url) || isPublicAuthEndpoint(req.url)) {
		return next(req);
	}

	const auth = inject(AuthService);
	const token = auth.getAccessToken();
	const request = token ? withToken(req, token) : req;

	return next(request).pipe(
		catchError((error: unknown) => {
			const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;
			if (!isUnauthorized || !auth.hasRefreshToken()) {
				return throwError(() => error);
			}

			return auth.refresh().pipe(
				switchMap((newToken) => next(withToken(req, newToken))),
				catchError((refreshError: unknown) => {
					auth.expireSession();
					return throwError(() => refreshError);
				})
			);
		})
	);
};
