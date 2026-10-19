// ===== SERVICIO DE ALERTAS (SweetAlert2) =====
// Envoltorio único de SweetAlert2: alertas, confirmaciones, toasts y loader.
// No sabe nada de la API; los errores HTTP los traduce ApiAlertService, que usa este.
// La apariencia (colores, botones) se ajustará en `Alert` con la identidad visual.

import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertOptions, SweetAlertPosition, SweetAlertResult } from 'sweetalert2';

// Opciones comunes a todas las alertas. Se usa Swal.mixin en vez de un objeto con
// spread: SweetAlertOptions es una unión discriminada por `input` y TypeScript no
// acepta el spread de dos uniones como una sola.
const Alert = Swal.mixin({
	confirmButtonText: 'Aceptar',
	cancelButtonText: 'Cancelar',
	reverseButtons: true,
	focusCancel: false,
});

export interface ConfirmOptions {
	title: string;
	text?: string;
	html?: string;
	confirmText?: string;
	cancelText?: string;
	icon?: SweetAlertIcon;
	danger?: boolean; // botón de confirmar en rojo (acciones destructivas)
}

@Injectable({ providedIn: 'root' })
export class AlertService {
	// ----- ALERTAS BÁSICAS -----
	success(title: string, text = ''): Promise<SweetAlertResult> {
		return this.fire({ title, text, icon: 'success' });
	}

	error(title: string, text = ''): Promise<SweetAlertResult> {
		return this.fire({ title, text, icon: 'error' });
	}

	warning(title: string, text = ''): Promise<SweetAlertResult> {
		return this.fire({ title, text, icon: 'warning' });
	}

	info(title: string, text = ''): Promise<SweetAlertResult> {
		return this.fire({ title, text, icon: 'info' });
	}

	// Alerta libre con cualquier opción de SweetAlert2
	custom(options: SweetAlertOptions): Promise<SweetAlertResult> {
		return this.fire(options);
	}

	// ----- CONFIRMACIONES -----
	// Devuelve true solo si el usuario confirmó
	async confirm(options: ConfirmOptions): Promise<boolean> {
		const result = await this.fire({
			title: options.title,
			text: options.text,
			html: options.html,
			icon: options.icon ?? (options.danger ? 'warning' : 'question'),
			showCancelButton: true,
			confirmButtonText: options.confirmText ?? 'Sí, continuar',
			cancelButtonText: options.cancelText ?? 'Cancelar',
			confirmButtonColor: options.danger ? '#dc2626' : undefined,
		});
		return result.isConfirmed;
	}

	confirmDelete(
		text = 'Esta acción no se puede deshacer.',
	): Promise<boolean> {
		return this.confirm({
			title: '¿Estás seguro?',
			text,
			confirmText: 'Sí, eliminar',
			danger: true,
		});
	}

	confirmLogout(): Promise<boolean> {
		return this.confirm({
			title: '¿Deseas cerrar sesión?',
			confirmText: 'Sí, cerrar sesión',
			cancelText: 'No, quedarme',
			icon: 'warning',
			danger: true,
		});
	}

	// ----- ENTRADA DE DATOS -----
	// Pide un texto; devuelve null si se canceló
	async prompt(
		title: string,
		options: {
			text?: string;
			placeholder?: string;
			value?: string;
			validator?: (value: string) => string | null;
		} = {},
	): Promise<string | null> {
		const result = await this.fire({
			title,
			text: options.text,
			input: 'text',
			inputPlaceholder: options.placeholder,
			inputValue: options.value ?? '',
			showCancelButton: true,
			inputValidator: (value: string) =>
				options.validator
					? options.validator(value)
					: value
						? null
						: 'Este campo es obligatorio.',
		});
		return result.isConfirmed ? (result.value as string) : null;
	}

	// ----- LOADER -----
	// Bloquea la pantalla mientras se procesa una acción
	showLoading(
		title = 'Procesando...',
		text = 'Por favor espera un momento',
	): void {
		void Alert.fire({
			title,
			text,
			allowOutsideClick: false,
			allowEscapeKey: false,
			showConfirmButton: false,
			didOpen: () => Swal.showLoading(),
		});
	}

	close(): void {
		Swal.close();
	}

	// ----- TOASTS -----
	// Aviso no intrusivo en una esquina
	toast(
		title: string,
		icon: SweetAlertIcon = 'success',
		position: SweetAlertPosition = 'top-end',
		timer = 3000,
	): void {
		void Swal.fire({
			toast: true,
			title,
			icon,
			position,
			timer,
			timerProgressBar: true,
			showConfirmButton: false,
			didOpen: (toast) => {
				toast.addEventListener('mouseenter', () => Swal.stopTimer());
				toast.addEventListener('mouseleave', () => Swal.resumeTimer());
			},
		});
	}

	private fire(options: SweetAlertOptions): Promise<SweetAlertResult> {
		return Alert.fire(options);
	}
}
