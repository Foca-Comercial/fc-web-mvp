// ==================================================
// Rutas de la app autenticada
// ==================================================
// Todas cuelgan del layout (SystemShell). Cada vista declara los roles que la
// ven, los mismos que exige su endpoint en la API (ADMINISTRADOR siempre pasa).
// PROVISIONAL: ComingSoonComponent ocupa el lugar de cada vista hasta construirla;
// entonces se cambia por `loadComponent` o `loadChildren` de su carpeta.

import { Routes } from '@angular/router';
import { ComingSoonComponent } from '@components/Shared/coming-soon/coming-soon.component';
import { roleGuard } from '@core/Guards/role.guard';
import { ROLES } from '@core/Constants/roles';
import { SystemShellComponent } from './system-shell/system-shell.component';

const MANAGER = [ROLES.COMMERCIAL_MANAGER];

export const SYSTEM_ROUTES: Routes = [
	{
		path: '',
		component: SystemShellComponent,
		children: [
			{
				path: 'pedidos',
				title: 'Pedidos · Foca Comercial',
				component: ComingSoonComponent,
				canActivate: [roleGuard],
				data: { roles: MANAGER, title: 'Pedidos' },
			},
			{
				path: 'rutas',
				title: 'Rutas · Foca Comercial',
				component: ComingSoonComponent,
				canActivate: [roleGuard],
				data: { roles: MANAGER, title: 'Rutas' },
			},
			{
				path: 'historico',
				title: 'Histórico · Foca Comercial',
				component: ComingSoonComponent,
				canActivate: [roleGuard],
				data: { roles: MANAGER, title: 'Histórico' },
			},
			{
				path: 'cierre',
				title: 'Cierre · Foca Comercial',
				component: ComingSoonComponent,
				canActivate: [roleGuard],
				data: { roles: MANAGER, title: 'Cierre del día' },
			},
			{
				// Sin roles declarados → solo ADMINISTRADOR (seguro por defecto)
				path: 'administracion',
				title: 'Administración · Foca Comercial',
				component: ComingSoonComponent,
				canActivate: [roleGuard],
				data: { title: 'Administración' },
			},
			{ path: '', pathMatch: 'full', redirectTo: 'pedidos' },
		],
	},
];
