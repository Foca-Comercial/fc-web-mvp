import { Component, input } from '@angular/core';

// PROVISIONAL: ocupa el lugar de cada vista mientras se construye.
// El título llega desde `data.title` de la ruta (withComponentInputBinding).
@Component({
	selector: 'app-coming-soon',
	template: `
		<section class="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white p-12 text-center shadow-card">
			<h1 class="text-xl font-bold text-brand-950">{{ title() }}</h1>
			<p class="text-sm text-slate-500">Vista en construcción.</p>
		</section>
	`,
})
export class ComingSoonComponent {
	readonly title = input('Próximamente');
}
