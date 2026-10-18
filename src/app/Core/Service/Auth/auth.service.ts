// ===== SERVICIO DE AUTENTICACIÓN =====
// Login, refresh con rotación, logout y estado de la sesión, adaptado a la API:
// - /auth/login recibe un formulario OAuth2 (x-www-form-urlencoded), no JSON.
// - Los roles vienen dentro del JWT (claim "roles"); no existe un endpoint /me.
// - Rotación: cada /auth/refresh revoca el refresh token usado y entrega uno nuevo.
//   Si el mismo token se usa dos veces, la API lo trata como robo y cierra TODAS las
//   sesiones del usuario. Por eso solo puede haber UN refresh en vuelo a la vez.

import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { catchError, finalize, map, Observable, of, shareReplay, throwError } from 'rxjs';

import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { APP_ROUTES } from '@core/Constants/app-routes';
import { ROLES } from '@core/Constants/roles';
import { AccessTokenPayload, LoginCredentials, SessionUser, TokenResponse } from '@core/Models/Auth/auth.model';
import { TokenStorageService } from './token-storage.service';

// Margen para renovar el access token antes de que venza
const REFRESH_MARGIN_MS = 60_000;
const MIN_REFRESH_DELAY_MS = 5_000;

@Injectable({ providedIn: 'root' })
export class AuthService {
	private readonly http = inject(HttpClient);
	private readonly storage = inject(TokenStorageService);
	private readonly router = inject(Router);

	// Estado de la sesión
	private readonly session = signal<SessionUser | null>(null);
	readonly currentUser = this.session.asReadonly();
	readonly isAuthenticated = computed(() => this.session() !== null);
	readonly roles = computed(() => this.session()?.roles ?? []);
	readonly isAdmin = computed(() => this.roles().includes(ROLES.ADMIN));

	// Refresh compartido: todas las peticiones con 401 esperan el mismo
	private refreshInFlight$: Observable<string> | null = null;
	private refreshTimer: ReturnType<typeof setTimeout> | null = null;

	// ----- Login / logout -----
	login({ username, password }: LoginCredentials): Observable<SessionUser> {
		const body = new HttpParams().set('username', username.trim()).set('password', password);

		return this.http
			.post<TokenResponse>(API_ENDPOINTS.auth.login, body.toString(), {
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			})
			.pipe(map((tokens) => this.startSession(tokens, username.trim().toLowerCase())));
	}

	// Revoca la sesión actual en la API. Aunque falle (red, token ya revocado),
	// la sesión local se limpia igual.
	logout(): Observable<void> {
		const refreshToken = this.storage.getRefreshToken();
		const request$ = refreshToken
			? this.http.post<void>(API_ENDPOINTS.auth.logout, { refresh_token: refreshToken })
			: of(undefined);

		return request$.pipe(
			catchError(() => of(undefined)),
			map(() => undefined),
			finalize(() => this.clearSession())
		);
	}

	// Cierra la sesión en todos los dispositivos (requiere access token vigente)
	logoutAll(): Observable<void> {
		return this.http.post<void>(API_ENDPOINTS.auth.logoutAll, {}).pipe(finalize(() => this.clearSession()));
	}

	// ----- Refresh -----
	hasRefreshToken(): boolean {
		return this.storage.getRefreshToken() !== null;
	}

	// Devuelve el nuevo access token. Llamadas simultáneas comparten la misma petición.
	refresh(): Observable<string> {
		if (this.refreshInFlight$) return this.refreshInFlight$;

		const refreshToken = this.storage.getRefreshToken();
		if (!refreshToken) {
			return throwError(() => new Error('No hay una sesión para renovar.'));
		}

		this.refreshInFlight$ = this.http
			.post<TokenResponse>(API_ENDPOINTS.auth.refresh, { refresh_token: refreshToken })
			.pipe(
				map((tokens) => {
					this.startSession(tokens, this.storage.getUsername() ?? '');
					return tokens.access_token;
				}),
				catchError((error) => {
					this.clearSession();
					return throwError(() => error);
				}),
				finalize(() => (this.refreshInFlight$ = null)),
				shareReplay({ bufferSize: 1, refCount: false })
			);

		return this.refreshInFlight$;
	}

	// Al arrancar la app (APP_INITIALIZER): recupera la sesión si hay refresh token.
	// Nunca falla: si no se puede, la app arranca sin sesión y los guards mandan al login.
	restoreSession(): Observable<boolean> {
		if (!this.hasRefreshToken()) return of(false);

		return this.refresh().pipe(
			map(() => true),
			catchError(() => of(false))
		);
	}

	// ----- Consultas -----
	getAccessToken(): string | null {
		return this.storage.getAccessToken();
	}

	// ¿Tiene alguno de estos roles? ADMINISTRADOR siempre pasa (igual que la API).
	hasAnyRole(allowed: readonly string[] = []): boolean {
		const roles = this.roles();
		if (roles.includes(ROLES.ADMIN)) return true;
		if (allowed.length === 0) return false;
		return allowed.some((role) => roles.includes(role));
	}

	// ----- Gestión interna de la sesión -----
	private startSession(tokens: TokenResponse, username: string): SessionUser {
		const payload = jwtDecode<AccessTokenPayload>(tokens.access_token);
		const user: SessionUser = {
			userId: Number(payload.sub),
			username,
			roles: payload.roles ?? [],
			expiresAt: payload.exp * 1000,
		};

		this.storage.setAccessToken(tokens.access_token);
		this.storage.setRefreshToken(tokens.refresh_token);
		if (username) this.storage.setUsername(username);

		this.session.set(user);
		this.scheduleRefresh(user.expiresAt);
		return user;
	}

	clearSession(): void {
		this.cancelScheduledRefresh();
		this.storage.clear();
		this.session.set(null);
	}

	// Renovación proactiva un minuto antes de que venza el access token
	private scheduleRefresh(expiresAt: number): void {
		this.cancelScheduledRefresh();
		const delay = Math.max(expiresAt - Date.now() - REFRESH_MARGIN_MS, MIN_REFRESH_DELAY_MS);
		this.refreshTimer = setTimeout(() => {
			this.refresh().subscribe({ error: () => this.expireSession() });
		}, delay);
	}

	// La sesión ya no se puede renovar: limpia y manda al login avisando el motivo
	expireSession(): void {
		this.clearSession();
		this.router.navigate([APP_ROUTES.LOGIN], {
			queryParams: { expired: 1, returnUrl: this.router.url },
		});
	}

	private cancelScheduledRefresh(): void {
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}
	}
}
