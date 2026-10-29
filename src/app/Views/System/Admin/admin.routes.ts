// ==================================================
// Rutas del panel de administración (/administracion/…)
// ==================================================
// Solo ADMINISTRADOR. La protección está en la ruta padre de system.routes.ts
// (canMatch: roleMatchGuard, sin `data.roles`): un GESTOR_COMERCIAL no descarga este
// chunk, así que las hijas no repiten el guard.
// Cada subsección se carga por separado (loadComponent) al construirla; mientras
// tanto ComingSoonComponent ocupa su lugar. El menú las lista en NavigationService.

import { Routes } from '@angular/router';
import { ComingSoonComponent } from '@components/Shared/coming-soon/coming-soon.component';
import { ADMIN_PATHS } from '@core/Constants/app-routes';

const pageTitle = (section: string): string => `${section} · Administración · Foca Comercial`;

export const ADMIN_ROUTES: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: ADMIN_PATHS.CLIENTS },
	{
		path: ADMIN_PATHS.CLIENTS,
		title: pageTitle('Clientes'),
		loadComponent: () =>
			import('./Clients/clients-admin/clients-admin.component').then((m) => m.ClientsAdminComponent),
	},
	{
		path: ADMIN_PATHS.PRODUCTS,
		title: pageTitle('Productos'),
		loadComponent: () =>
			import('./Products/products-admin/products-admin.component').then((m) => m.ProductsAdminComponent),
	},
	{
		path: ADMIN_PATHS.DRIVERS,
		title: pageTitle('Domiciliarios'),
		component: ComingSoonComponent,
		data: { title: 'Domiciliarios' },
	},
	{
		path: ADMIN_PATHS.VEHICLES,
		title: pageTitle('Vehículos'),
		component: ComingSoonComponent,
		data: { title: 'Vehículos' },
	},
	{
		path: ADMIN_PATHS.ROUTES,
		title: pageTitle('Rutas'),
		component: ComingSoonComponent,
		data: { title: 'Rutas' },
	},
	{
		path: ADMIN_PATHS.ARCHIVE,
		title: pageTitle('Archivo mensual'),
		component: ComingSoonComponent,
		data: { title: 'Archivo mensual' },
	},
];
