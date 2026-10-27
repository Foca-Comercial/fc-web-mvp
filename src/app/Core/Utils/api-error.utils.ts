// ==================================================
// Normalización de errores de la API
// ==================================================
// Convierte cualquier error HTTP en un `ApiError` con un mensaje en español,
// distinguiendo los dos formatos de la API (BusinessError y 422 de Pydantic).

import { HttpErrorResponse } from '@angular/common/http';
import { FIELD_LABELS, LIST_FIELD_ITEM_LABEL } from '@core/Constants/field-labels';
import { DEFAULT_HTTP_MESSAGES, translateValidationMessage } from '@core/Constants/validation-messages';
import {
	ApiError,
	BusinessErrorBody,
	FieldError,
	ValidationErrorBody,
	ValidationErrorItem,
} from '@core/Models/Api/api-error.model';

// Primer elemento del `loc` de Pydantic: dónde venía el dato, no el campo
const LOCATIONS = new Set(['body', 'query', 'path', 'header', 'cookie']);

// ----- Detección de formatos -----
export function isBusinessErrorBody(body: unknown): body is BusinessErrorBody {
	return (
		typeof body === 'object' &&
		body !== null &&
		typeof (body as BusinessErrorBody).detail === 'string' &&
		typeof (body as BusinessErrorBody).code === 'string'
	);
}

export function isValidationErrorBody(body: unknown): body is ValidationErrorBody {
	return typeof body === 'object' && body !== null && Array.isArray((body as ValidationErrorBody).detail);
}

// ----- Etiquetas de campos -----
// ["body", "items", 0, "cant"] → { field: "items", path: "items.0.cant",
//                                  label: "Productos (renglón 1) › Cantidad" }
function describeLocation(loc: (string | number)[]): Pick<FieldError, 'field' | 'path' | 'label'> {
	const parts = loc.length > 1 && LOCATIONS.has(String(loc[0])) ? loc.slice(1) : loc;
	if (parts.length === 0) return { field: '', path: '', label: '' };

	const labels: string[] = [];
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		if (typeof part === 'number') {
			const listName = String(parts[i - 1] ?? '');
			const itemLabel = `${LIST_FIELD_ITEM_LABEL[listName] ?? 'elemento'} ${part + 1}`;
			if (labels.length === 0) labels.push(itemLabel);
			else labels[labels.length - 1] = `${labels[labels.length - 1]} (${itemLabel})`;
		} else {
			labels.push(FIELD_LABELS[part] ?? part);
		}
	}

	return { field: String(parts[0]), path: parts.join('.'), label: labels.join(' › ') };
}

export function toFieldErrors(items: ValidationErrorItem[]): FieldError[] {
	return items.map((item) => ({
		...describeLocation(item.loc),
		message: translateValidationMessage(item),
	}));
}

export function fieldLabel(field: string | null | undefined): string {
	return field ? (FIELD_LABELS[field] ?? field) : '';
}

// ----- Normalización principal -----
export function parseApiError(error: unknown): ApiError {
	if (!(error instanceof HttpErrorResponse)) {
		return {
			kind: 'unknown',
			status: 0,
			message: error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
			code: null,
			field: null,
			fieldErrors: [],
			raw: error,
		};
	}

	const base = { status: error.status, code: null, field: null, fieldErrors: [], raw: error };
	const body: unknown = error.error;

	// Sin respuesta: servidor caído, sin red o bloqueado por CORS
	if (error.status === 0) {
		return {
			...base,
			kind: 'network',
			message: 'No fue posible conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.',
		};
	}

	// Formato 2: 422 de Pydantic
	if (isValidationErrorBody(body)) {
		const fieldErrors = toFieldErrors(body.detail);
		return {
			...base,
			kind: 'validation',
			message: 'Hay datos por corregir.',
			fieldErrors,
		};
	}

	// Formato 1: BusinessError
	if (isBusinessErrorBody(body)) {
		return {
			...base,
			kind: error.status === 401 ? 'unauthorized' : 'business',
			message: body.detail,
			code: body.code,
			field: body.field,
		};
	}

	// Respuestas por defecto de FastAPI: {"detail": "Not authenticated"}
	if (typeof body === 'object' && body !== null && typeof (body as { detail?: unknown }).detail === 'string') {
		const detail = (body as { detail: string }).detail;
		return {
			...base,
			kind: error.status === 401 ? 'unauthorized' : 'business',
			message: DEFAULT_HTTP_MESSAGES[detail] ?? detail,
		};
	}

	return {
		...base,
		kind: error.status === 401 ? 'unauthorized' : 'unknown',
		message: defaultMessageForStatus(error.status),
	};
}

// Las descargas (Excel, PDF) piden `responseType: 'blob'`: si fallan, el JSON
// del error también llega como Blob y hay que leerlo antes de normalizarlo.
export async function parseApiErrorAsync(error: unknown): Promise<ApiError> {
	if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
		try {
			const text = await error.error.text();
			const body: unknown = JSON.parse(text);
			return parseApiError(
				new HttpErrorResponse({
					error: body,
					headers: error.headers,
					status: error.status,
					statusText: error.statusText,
					url: error.url ?? undefined,
				})
			);
		} catch {
			// Cuerpo no JSON: se normaliza con lo que haya
		}
	}
	return parseApiError(error);
}

function defaultMessageForStatus(status: number): string {
	switch (status) {
		case 401:
			return 'Tu sesión expiró. Inicia sesión nuevamente.';
		case 403:
			return 'No tienes permisos para realizar esta acción.';
		case 404:
			return 'El recurso solicitado no existe.';
		case 502:
		case 503:
		case 504:
			return 'Un servicio externo no está disponible. Inténtalo más tarde.';
		default:
			return status >= 500 ? 'Ocurrió un error en el servidor.' : 'No se pudo completar la operación.';
	}
}

// Texto(s) para mostrar un error EN LÍNEA (dentro de un modal, donde no se puede usar SweetAlert):
// el mensaje, o uno por cada campo con error si fue una validación de Pydantic.
export function describeApiError(error: ApiError): string[] {
	if (error.kind === 'validation' && error.fieldErrors.length > 0) {
		return error.fieldErrors.map((item) => `${item.label}: ${item.message}`);
	}
	return [error.message];
}
