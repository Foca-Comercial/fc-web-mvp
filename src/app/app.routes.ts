import { Routes } from '@angular/router';
import { AccessDeniedComponent } from '@components/Shared/access-denied/access-denied.component';
import { PageNotFoundComponent } from '@components/Shared/page-not-found/page-not-found.component';
import { authMatchGuard } from '@core/Guards/auth.guard';
import { guestGuard } from '@core/Guards/guest.guard';

export const routes: Routes = [
	// -----------------------
	// Públicas
	// -----------------------
	{
		path: 'login',
		title: 'Iniciar sesión · Foca Comercial',
		canActivate: [guestGuard],
		loadComponent: () => import('@views/Auth/login/login.component').then((m) => m.LoginComponent),
	},
	{ path: 'acceso-denegado', title: 'Acceso denegado · Foca Comercial', component: AccessDeniedComponent },

	// -----------------------
	// App autenticada (layout + vistas por rol)
	// -----------------------
	{
		path: '',
		canMatch: [authMatchGuard],
		loadChildren: () => import('@views/System/system.routes').then((m) => m.SYSTEM_ROUTES),
	},

	// -----------------------
	// 404
	// -----------------------
	{ path: '**', title: 'Página no encontrada · Foca Comercial', component: PageNotFoundComponent },
];
