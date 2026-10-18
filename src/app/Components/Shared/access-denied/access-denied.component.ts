import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_ROUTES } from '@core/Constants/app-routes';
import { LogoutButtonDirective } from '@core/Directives/logout-button.directive';
import { AuthService } from '@core/Service/Auth/auth.service';
import { RoleRedirectService } from '@core/Service/Auth/role-redirect.service';

// 403 del frontend: el usuario tiene sesión pero su rol no permite la ruta.
@Component({
	selector: 'app-access-denied',
	imports: [RouterLink, LogoutButtonDirective],
	template: `
		<main class="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
			<p class="text-6xl font-bold text-brand-600">403</p>
			<h1 class="text-xl font-semibold">Acceso denegado</h1>
			<p class="max-w-md text-sm text-slate-500">
				Tu usuario no tiene permisos para ver esta sección. Si crees que es un error, contacta al administrador.
			</p>
			<div class="flex gap-3">
				@if (home(); as home) {
					<a [routerLink]="home" class="btn-primary">Ir a mi inicio</a>
				}
				<button type="button" class="btn-secondary" appLogoutButton>Cerrar sesión</button>
			</div>
		</main>
	`,
})
export class AccessDeniedComponent {
	private readonly auth = inject(AuthService);
	private readonly redirect = inject(RoleRedirectService);

	// Sin un inicio válido para su rol, solo se ofrece cerrar sesión
	readonly home = computed(() => {
		const target = this.redirect.homeFor(this.auth.roles());
		return target === APP_ROUTES.ACCESS_DENIED ? null : target;
	});
}
