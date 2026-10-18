// ==================================================
// Componente: app-loader
// ==================================================
// Estado de carga / error en línea para una sección (el loader bloqueante de
// pantalla completa es SweetAlert, ver AlertService.showLoading).
//   <app-loader [loading]="loading()" [error]="error()" (retry)="load()" />

import { Component, input, output } from '@angular/core';

@Component({
	selector: 'app-loader',
	template: `
		@if (loading()) {
			<div class="flex flex-col items-center justify-center gap-3 py-10 text-slate-500" role="status">
				<span class="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600"></span>
				@if (message()) {
					<p class="text-sm">{{ message() }}</p>
				}
			</div>
		} @else if (error()) {
			<div class="flex flex-col items-center justify-center gap-3 py-10 text-center" role="alert">
				<p class="text-sm text-red-600">{{ error() }}</p>
				@if (showRetry()) {
					<button type="button" class="btn-secondary" (click)="retry.emit()">Reintentar</button>
				}
			</div>
		}
	`,
})
export class LoaderComponent {
	readonly loading = input(false);
	readonly message = input('Cargando...');
	readonly error = input<string | null>(null);
	readonly showRetry = input(true);

	readonly retry = output<void>();
}
