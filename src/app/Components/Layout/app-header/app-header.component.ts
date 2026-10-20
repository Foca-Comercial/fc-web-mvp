import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent } from '@components/Shared/icon/icon.component';
import { roleLabel } from '@core/Constants/roles';
import { LogoutButtonDirective } from '@core/Directives/logout-button.directive';
import { AuthService } from '@core/Service/Auth/auth.service';
import { NavigationService } from '@core/Service/Navigation/navigation.service';

// Barra superior: botón para mostrar/ocultar el menú, marca "FOCA - ORDEN DE PEDIDOS"
// y menú del usuario (nombre, rol y cerrar sesión).
@Component({
	selector: 'app-header',
	imports: [RouterLink, LogoutButtonDirective, IconComponent],
	templateUrl: './app-header.component.html',
})
export class AppHeaderComponent {
	protected readonly auth = inject(AuthService);
	protected readonly nav = inject(NavigationService);
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

	protected readonly menuOpen = signal(false);

	// Roles del usuario con su nombre para mostrar: "Gestor comercial, Vendedor"
	protected readonly rolesText = computed(() => (this.auth.currentUser()?.roles ?? []).map(roleLabel).join(', '));

	protected toggleMenu(): void {
		this.menuOpen.update((open) => !open);
	}

	protected closeMenu(): void {
		this.menuOpen.set(false);
	}

	// Clic fuera del menú del usuario → se cierra
	@HostListener('document:click', ['$event'])
	protected onDocumentClick(event: MouseEvent): void {
		if (this.menuOpen() && !this.host.nativeElement.contains(event.target as Node)) this.closeMenu();
	}

	@HostListener('document:keydown.escape')
	protected onEscape(): void {
		this.closeMenu();
	}
}
