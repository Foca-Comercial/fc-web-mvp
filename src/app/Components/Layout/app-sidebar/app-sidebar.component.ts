import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavigationService } from '@core/Service/Navigation/navigation.service';

// Menú lateral: fijo en escritorio, deslizable en móvil. Los ítems ya vienen
// filtrados por rol desde NavigationService.
@Component({
	selector: 'app-sidebar',
	imports: [RouterLink, RouterLinkActive],
	templateUrl: './app-sidebar.component.html',
})
export class AppSidebarComponent {
	protected readonly nav = inject(NavigationService);
}
