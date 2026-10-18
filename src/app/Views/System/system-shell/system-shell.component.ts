import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeaderComponent } from '@components/Layout/app-header/app-header.component';
import { AppSidebarComponent } from '@components/Layout/app-sidebar/app-sidebar.component';

// Layout de la app autenticada: header + sidebar + contenido de cada vista.
@Component({
	selector: 'app-system-shell',
	imports: [RouterOutlet, AppHeaderComponent, AppSidebarComponent],
	template: `
		<app-header />
		<app-sidebar />
		<main class="min-h-screen pt-header lg:pl-sidebar">
			<div class="mx-auto max-w-7xl p-4 sm:p-6">
				<router-outlet />
			</div>
		</main>
	`,
})
export class SystemShellComponent {}
