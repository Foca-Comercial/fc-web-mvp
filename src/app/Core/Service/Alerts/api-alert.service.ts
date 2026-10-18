// ===== MANEJO DE RESPUESTAS DE LA API CON ALERTAS =====
// Un manejador por cada formato de error de la API (ver api-error.model.ts):
//
//   showBusinessError()   → { detail, code, field }   reglas de negocio, 404, 409, 403, 502
//   showValidationErrors() → { detail: [ {loc, msg, type} ] }   422 de Pydantic
//
// `handleError()` detecta el formato y elige el manejador. `run()` envuelve una
// petición con loader + mensaje de éxito + manejo de error, para no repetir ese
// patrón en cada componente.

import { inject, Injectable } from '@angular/core';
import { firstValueFrom, isObservable, Observable } from 'rxjs';

import { ApiError } from '@core/Models/Api/api-error.model';
import { fieldLabel, parseApiErrorAsync } from '@core/Utils/api-error.utils';
import { AlertService, ConfirmOptions } from './alert.service';

export interface RunOptions {
	loadingTitle?: string;
	loadingText?: string;
	successTitle?: string; // sin título de éxito no se muestra alerta de éxito
	successText?: string;
	successToast?: string; // alternativa ligera: toast en vez de alerta
	errorTitle?: string;
}

export type RunResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

// Título de la alerta según el status del BusinessError
const BUSINESS_TITLES: Record<number, string> = {
	400: 'Operación no permitida',
	403: 'Acceso denegado',
	404: 'No encontrado',
	409: 'Conflicto con datos existentes',
	422: 'No se pudo completar la operación',
	502: 'Servicio externo no disponible',
};

@Injectable({ providedIn: 'root' })
export class ApiAlertService {
	private readonly alert = inject(AlertService);

	// ----- FORMATO 1: BusinessError -----
	showBusinessError(error: ApiError, title?: string): Promise<unknown> {
		const field = error.field ? `Campo: ${fieldLabel(error.field)}` : '';
		return this.alert.custom({
			icon: error.status >= 500 ? 'error' : 'warning',
			title: title ?? BUSINESS_TITLES[error.status] ?? 'Ocurrió un error',
			text: error.message,
			// El código ayuda a soporte a ubicar la regla exacta en el backend
			footer: [field, error.code ? `Código: ${error.code}` : ''].filter(Boolean).join(' · ') || undefined,
		});
	}

	// ----- FORMATO 2: 422 de Pydantic -----
	showValidationErrors(error: ApiError, title = 'Revisa los datos ingresados'): Promise<unknown> {
		const items = error.fieldErrors
			.map((e) => `<li><strong>${escapeHtml(e.label || 'Dato')}:</strong> ${escapeHtml(e.message)}</li>`)
			.join('');

		return this.alert.custom({
			icon: 'warning',
			title,
			html: `<ul style="text-align:left;margin:0;padding-left:1.25rem;line-height:1.6">${items}</ul>`,
		});
	}

	// ----- Despachador -----
	// Normaliza el error (incluidos los de descargas en Blob), muestra la alerta que
	// corresponde y devuelve el ApiError para que el componente marque campos si quiere.
	async handleError(error: unknown, title?: string): Promise<ApiError> {
		const apiError = await parseApiErrorAsync(error);

		switch (apiError.kind) {
			case 'validation':
				await this.showValidationErrors(apiError, title);
				break;
			case 'business':
				await this.showBusinessError(apiError, title);
				break;
			case 'unauthorized':
				// El interceptor ya intentó renovar la sesión y, si no pudo, mandó al login
				this.alert.toast(apiError.message, 'warning');
				break;
			case 'network':
				await this.alert.error('Sin conexión', apiError.message);
				break;
			default:
				await this.alert.error(title ?? 'Ocurrió un error', apiError.message);
		}

		return apiError;
	}

	// ----- Ejecución con loader -----
	// El error ya se mostró cuando ok = false; `error` sirve para marcar campos.
	//   const res = await this.apiAlert.run(this.orders.dispatch(id), { successToast: 'Pedido despachado' });
	//   if (res.ok) { ... res.data ... }
	async run<T>(source: Observable<T> | Promise<T>, options: RunOptions = {}): Promise<RunResult<T>> {
		this.alert.showLoading(options.loadingTitle ?? 'Procesando...', options.loadingText);
		try {
			// defaultValue: un 204 sin cuerpo no emite valor y se toma como undefined
			const data = isObservable(source)
				? await firstValueFrom(source, { defaultValue: undefined as T })
				: await source;
			this.alert.close();

			if (options.successTitle) {
				await this.alert.success(options.successTitle, options.successText);
			} else if (options.successToast) {
				this.alert.toast(options.successToast);
			}
			return { ok: true, data };
		} catch (error) {
			this.alert.close();
			return { ok: false, error: await this.handleError(error, options.errorTitle) };
		}
	}

	// Confirma y luego ejecuta con loader. `cancelled` si el usuario no confirmó.
	async confirmAndRun<T>(
		confirm: ConfirmOptions,
		source: () => Observable<T> | Promise<T>,
		options: RunOptions = {}
	): Promise<RunResult<T> | { ok: false; cancelled: true }> {
		const confirmed = await this.alert.confirm(confirm);
		return confirmed ? this.run(source(), options) : { ok: false, cancelled: true };
	}
}

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}
