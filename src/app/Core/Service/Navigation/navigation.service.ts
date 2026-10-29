// ===== SERVICIO DE NAVEGACIÓN =====
// Menú lateral de la app. Cada ítem declara qué roles lo ven (mismos roles que
// protegen la ruta en el router), así el menú y los guards no se contradicen.
// Un ítem con `children` es un grupo desplegable (p. ej. Configuración → subsecciones
// del panel de administración): se abre solo al entrar a una de sus páginas y el
// usuario puede abrirlo o cerrarlo con un clic.
// También guarda si el sidebar está visible:
// - Escritorio: abierto por defecto; el usuario lo oculta para dar más espacio al
//   contenido y su elección se recuerda (localStorage).
// - Móvil: siempre arranca oculto y se cierra solo al navegar.

import { computed, inject, Injectable, linkedSignal, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { IconName } from '@components/Shared/icon/icons';
import { APP_ROUTES } from '@core/Constants/app-routes';
import { ROLES } from '@core/Constants/roles';
import { STORAGE_KEYS } from '@core/Constants/storage-keys';
import { AuthService } from '@core/Service/Auth/auth.service';

export type NavigationSectionId = 'operation' | 'traceability' | 'support';

// Enlace dentro de un grupo desplegable
export interface NavigationChild {
	id: string;
	label: string;
	icon: IconName;
	route: string;
	roles: readonly string[]; // vacío = solo ADMINISTRADOR
}

export interface NavigationItem {
	id: string;
	label: string;
	icon: IconName;
	section: NavigationSectionId;
	// null = no navega: es una acción (p. ej. Ayuda). En un grupo es el prefijo de sus
	// páginas, para saber cuándo abrirlo y marcarlo como activo.
	route: string | null;
	roles: readonly string[]; // vacío = solo ADMINISTRADOR
	children?: readonly NavigationChild[]; // con hijos = grupo desplegable
}

export interface NavigationSection {
	id: NavigationSectionId;
	label: string;
	items: NavigationItem[];
}

const SECTIONS: readonly { id: NavigationSectionId; label: string }[] = [
	{ id: 'operation', label: 'Operación' },
	{ id: 'traceability', label: 'Trazabilidad' },
	{ id: 'support', label: 'Administración' },
];

const MANAGER = [ROLES.COMMERCIAL_MANAGER];
const ADMIN_ONLY: readonly string[] = [];

const NAVIGATION: readonly NavigationItem[] = [
	{ id: 'orders', label: 'Tablero de Despachos', icon: 'truck', section: 'operation', route: APP_ROUTES.ORDERS, roles: MANAGER },
	{ id: 'routes', label: 'Rutas Constantes', icon: 'map-pin', section: 'operation', route: APP_ROUTES.ROUTES, roles: MANAGER },
	{ id: 'closure', label: 'Cierres y Reportes', icon: 'clipboard-document-check', section: 'traceability', route: APP_ROUTES.CLOSURE, roles: MANAGER },
	{ id: 'history', label: 'Histórico de pedidos', icon: 'circle-stack', section: 'traceability', route: APP_ROUTES.HISTORY, roles: MANAGER },
	// Panel de administración (/administracion, solo ADMINISTRADOR); en el menú se llama Gestion.
	// Las subsecciones son las mismas de Views/System/Admin/admin.routes.ts.
	{
		id: 'admin',
		label: 'Gestión',
		icon: 'cog-6-tooth',
		section: 'support',
		route: APP_ROUTES.ADMIN,
		roles: ADMIN_ONLY,
		children: [
			{ id: 'admin-clients', label: 'Clientes', icon: 'building-storefront', route: APP_ROUTES.ADMIN_CLIENTS, roles: ADMIN_ONLY },
			{ id: 'admin-products', label: 'Productos', icon: 'cube', route: APP_ROUTES.ADMIN_PRODUCTS, roles: ADMIN_ONLY },
			{ id: 'admin-drivers', label: 'Domiciliarios', icon: 'user-group', route: APP_ROUTES.ADMIN_DRIVERS, roles: ADMIN_ONLY },
			{ id: 'admin-vehicles', label: 'Vehículos', icon: 'truck', route: APP_ROUTES.ADMIN_VEHICLES, roles: ADMIN_ONLY },
			{ id: 'admin-routes', label: 'Rutas', icon: 'map', route: APP_ROUTES.ADMIN_ROUTES, roles: ADMIN_ONLY },
			{ id: 'admin-archive', label: 'Archivo mensual', icon: 'archive-box', route: APP_ROUTES.ADMIN_ARCHIVE, roles: ADMIN_ONLY },
		],
	},
];

// ¿La URL (sin query ni fragmento) es `route` o una página debajo de ella?
function isWithin(url: string, route: string): boolean {
	const path = url.split(/[?#]/)[0];
	return path === route || path.startsWith(`${route}/`);
}

// Mismo punto de corte que `lg` de Tailwind
const DESKTOP_QUERY = '(min-width: 1024px)';

@Injectable({ providedIn: 'root' })
export class NavigationService {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);

	private readonly desktop = typeof window !== 'undefined' ? window.matchMedia(DESKTOP_QUERY) : null;

	// Ítems visibles para el usuario actual (se recalcula si cambian sus roles). En los
	// grupos se filtran también los hijos, y un grupo sin hijos visibles no se muestra.
	readonly items = computed<NavigationItem[]>(() => {
		this.auth.roles(); // dependencia explícita del signal
		return NAVIGATION.filter((item) => this.auth.hasAnyRole(item.roles))
			.map((item) =>
				item.children ? { ...item, children: item.children.filter((child) => this.auth.hasAnyRole(child.roles)) } : item
			)
			.filter((item) => !item.children || item.children.length > 0);
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

	// URL actual (se actualiza en cada NavigationEnd)
	private readonly url = signal(this.router.url);

	// Grupo desplegado (id) o null. Al navegar se abre el grupo de la página actual; si
	// la página no es de ningún grupo, se respeta lo que el usuario tenía abierto.
	readonly openGroup = linkedSignal<string, string | null>({
		source: this.url,
		computation: (url, previous) => this.groupOf(url) ?? previous?.value ?? null,
	});

	constructor() {
		this.router.events
			.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
			.subscribe((event) => {
				this.url.set(event.urlAfterRedirects);
				// En móvil el menú es un panel flotante: al navegar se cierra
				if (!this.isDesktop()) this.sidebarOpen.set(false);
			});
	}

	// ----- Grupos desplegables -----
	toggleGroup(id: string): void {
		this.openGroup.update((current) => (current === id ? null : id));
	}

	// El grupo se marca como activo cuando la página actual es una de las suyas
	isGroupActive(item: NavigationItem): boolean {
		return item.route !== null && isWithin(this.url(), item.route);
	}

	private groupOf(url: string): string | null {
		return NAVIGATION.find((item) => item.children && item.route && isWithin(url, item.route))?.id ?? null;
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
