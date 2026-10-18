// ===== SERVICIO DE NAVEGACIÓN =====
// Menú lateral de la app. Cada ítem declara qué roles lo ven (mismos roles que
// protegen la ruta en el router), así el menú y los guards no se contradicen.
// El estado abierto/cerrado del sidebar en móvil también vive aquí.

import { computed, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { APP_ROUTES } from '@core/Constants/app-routes';
import { ROLES } from '@core/Constants/roles';
import { AuthService } from '@core/Service/Auth/auth.service';

export interface NavigationItem {
	id: string;
	label: string;
	route: string;
	icon: string; // nombre del ícono; la librería se define con la identidad visual
	roles: readonly string[]; // vacío = solo ADMINISTRADOR
}

const NAVIGATION: readonly NavigationItem[] = [
	{ id: 'orders', label: 'Pedidos', route: APP_ROUTES.ORDERS, icon: 'orders', roles: [ROLES.COMMERCIAL_MANAGER] },
	{ id: 'routes', label: 'Rutas', route: APP_ROUTES.ROUTES, icon: 'routes', roles: [ROLES.COMMERCIAL_MANAGER] },
	{ id: 'history', label: 'Histórico', route: APP_ROUTES.HISTORY, icon: 'history', roles: [ROLES.COMMERCIAL_MANAGER] },
	{ id: 'closure', label: 'Cierre', route: APP_ROUTES.CLOSURE, icon: 'closure', roles: [ROLES.COMMERCIAL_MANAGER] },
	{ id: 'admin', label: 'Administración', route: APP_ROUTES.ADMIN, icon: 'admin', roles: [] },
];

@Injectable({ providedIn: 'root' })
export class NavigationService {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);

	// Ítems visibles para el usuario actual (se recalcula si cambian sus roles)
	readonly items = computed(() => {
		this.auth.roles(); // dependencia explícita del signal
		return NAVIGATION.filter((item) => this.auth.hasAnyRole(item.roles));
	});

	// Sidebar en pantallas pequeñas
	readonly sidebarOpen = signal(false);

	constructor() {
		// Al navegar, se cierra el sidebar móvil
		this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => this.sidebarOpen.set(false));
	}

	toggleSidebar(): void {
		this.sidebarOpen.update((open) => !open);
	}

	closeSidebar(): void {
		this.sidebarOpen.set(false);
	}
}
