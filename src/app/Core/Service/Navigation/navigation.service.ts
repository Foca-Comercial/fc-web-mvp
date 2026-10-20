// ===== SERVICIO DE NAVEGACIÓN =====
// Menú lateral de la app. Cada ítem declara qué roles lo ven (mismos roles que
// protegen la ruta en el router), así el menú y los guards no se contradicen.
// También guarda si el sidebar está visible:
// - Escritorio: abierto por defecto; el usuario lo oculta para dar más espacio al
//   contenido y su elección se recuerda (localStorage).
// - Móvil: siempre arranca oculto y se cierra solo al navegar.

import { computed, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { IconName } from '@components/Shared/icon/icons';
import { APP_ROUTES } from '@core/Constants/app-routes';
import { ROLES } from '@core/Constants/roles';
import { STORAGE_KEYS } from '@core/Constants/storage-keys';
import { AuthService } from '@core/Service/Auth/auth.service';

export type NavigationSectionId = 'operation' | 'traceability' | 'support';

export interface NavigationItem {
	id: string;
	label: string;
	icon: IconName;
	section: NavigationSectionId;
	route: string | null; // null = no navega: es una acción (p. ej. Ayuda)
	roles: readonly string[]; // vacío = solo ADMINISTRADOR
}

export interface NavigationSection {
	id: NavigationSectionId;
	label: string;
	items: NavigationItem[];
}

const SECTIONS: readonly { id: NavigationSectionId; label: string }[] = [
	{ id: 'operation', label: 'Operación' },
	{ id: 'traceability', label: 'Trazabilidad' },
	{ id: 'support', label: 'Soporte' },
];

const MANAGER = [ROLES.COMMERCIAL_MANAGER];

const NAVIGATION: readonly NavigationItem[] = [
	{ id: 'orders', label: 'Tablero de Despachos', icon: 'truck', section: 'operation', route: APP_ROUTES.ORDERS, roles: MANAGER },
	{ id: 'routes', label: 'Rutas Constantes', icon: 'map-pin', section: 'operation', route: APP_ROUTES.ROUTES, roles: MANAGER },
	{ id: 'closure', label: 'Cierres y Reportes', icon: 'clipboard-document-check', section: 'traceability', route: APP_ROUTES.CLOSURE, roles: MANAGER },
	{ id: 'history', label: 'Histórico de pedidos', icon: 'circle-stack', section: 'traceability', route: APP_ROUTES.HISTORY, roles: MANAGER },
	// La ruta es /administracion (solo ADMINISTRADOR); en el menú se llama Configuración
	{ id: 'admin', label: 'Configuración', icon: 'cog-6-tooth', section: 'support', route: APP_ROUTES.ADMIN, roles: [] },];

// Mismo punto de corte que `lg` de Tailwind
const DESKTOP_QUERY = '(min-width: 1024px)';

@Injectable({ providedIn: 'root' })
export class NavigationService {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);

	private readonly desktop = typeof window !== 'undefined' ? window.matchMedia(DESKTOP_QUERY) : null;

	// Ítems visibles para el usuario actual (se recalcula si cambian sus roles)
	readonly items = computed(() => {
		this.auth.roles(); // dependencia explícita del signal
		return NAVIGATION.filter((item) => this.auth.hasAnyRole(item.roles));
	});

	// Los mismos ítems agrupados por sección; las secciones vacías no se muestran
	public readonly sections = computed<NavigationSection[]>(() => {
		const visible = this.items();
		return SECTIONS.map((section) => ({ ...section, items: visible.filter((item) => item.section === section.id) })).filter(
			(section) => section.items.length > 0
		);
	});

	// ¿Sidebar visible? Debe declararse después de `desktop`
	readonly sidebarOpen = signal(this.initialSidebarState());

	constructor() {
		// En móvil el menú es un panel flotante: al navegar se cierra
		this.router.events
			.pipe(filter((event) => event instanceof NavigationEnd))
			.subscribe(() => {
				if (!this.isDesktop()) this.sidebarOpen.set(false);
			});
	}

	toggleSidebar(): void {
		const open = !this.sidebarOpen();
		this.sidebarOpen.set(open);
		if (this.isDesktop()) this.saveSidebarPreference(open);
	}

	closeSidebar(): void {
		this.sidebarOpen.set(false);
	}

	private isDesktop(): boolean {
		return this.desktop?.matches ?? true;
	}

	private initialSidebarState(): boolean {
		if (!this.isDesktop()) return false;
		try {
			return localStorage.getItem(STORAGE_KEYS.SIDEBAR) !== 'closed';
		} catch {
			return true;
		}
	}

	private saveSidebarPreference(open: boolean): void {
		try {
			localStorage.setItem(STORAGE_KEYS.SIDEBAR, open ? 'open' : 'closed');
		} catch {
			// Sin almacenamiento: la preferencia dura hasta recargar
		}
	}
}
