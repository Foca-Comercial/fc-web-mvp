import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// 404 del frontend (ruta inexistente). Diseño definitivo con la identidad visual.
@Component({
	selector: 'app-page-not-found',
	imports: [RouterLink],
	template: `
		<main class="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
			<p class="text-6xl font-bold text-brand-600">404</p>
			<h1 class="text-xl font-semibold">Página no encontrada</h1>
			<p class="text-sm text-slate-500">La dirección que buscas no existe o fue movida.</p>
			<a routerLink="/" class="btn-primary">Ir al inicio</a>
		</main>
	`,
})
export class PageNotFoundComponent {}
