// ==================================================
// Rutas de la app autenticada
// ==================================================
// Todas cuelgan del layout (SystemShell). Cada vista declara los roles que la
// ven, los mismos que exige su endpoint en la API (ADMINISTRADOR siempre pasa).
// Cada vista se carga bajo demanda (`loadComponent` / `loadChildren` de su carpeta).

import { Routes } from '@angular/router';
import { roleGuard, roleMatchGuard } from '@core/Guards/role.guard';
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
				title: 'Tablero de despachos · Foca Comercial',
				loadComponent: () =>
					import('./Orders/orders-board/orders-board.component').then((m) => m.OrdersBoardComponent),
				canActivate: [roleGuard],
				data: { roles: MANAGER, title: 'Pedidos' },
			},
			{
				path: 'rutas',
				title: 'Rutas constantes · Foca Comercial',
				loadComponent: () =>
					import('./Routes/routes-board/routes-board.component').then((m) => m.RoutesBoardComponent),
				canActivate: [roleGuard],
				data: { roles: MANAGER, title: 'Rutas' },
			},
			{
				path: 'historico',
				title: 'Histórico de pedidos · Foca Comercial',
				loadComponent: () =>
					import('./History/history-board/history-board.component').then((m) => m.HistoryBoardComponent),
				canActivate: [roleGuard],
				data: { roles: MANAGER, title: 'Histórico' },
			},
			{
				path: 'cierre',
				title: 'Cierre y reportes · Foca Comercial',
				loadComponent: () =>
					import('./Closure/closure-board/closure-board.component').then((m) => m.ClosureBoardComponent),
				canActivate: [roleGuard],
				data: { roles: MANAGER, title: 'Cierre del día' },
			},
			{
				// Panel de administración. Sin roles declarados → solo ADMINISTRADOR (seguro
				// por defecto). canMatch en vez de canActivate: si no tiene el rol, el chunk
				// del panel ni se descarga. Las subsecciones viven en Admin/admin.routes.ts.
				path: 'administracion',
				canMatch: [roleMatchGuard],
				loadChildren: () => import('./Admin/admin.routes').then((m) => m.ADMIN_ROUTES),
			},
			{ path: '', pathMatch: 'full', redirectTo: 'pedidos' },
		],
	},
];
