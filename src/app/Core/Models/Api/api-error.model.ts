// ==================================================
// Modelos: respuestas de error de la API
// ==================================================
// La API responde los errores en DOS formatos distintos:
//
// 1) BusinessError (reglas de negocio, 404, 409, 401, 403, 502…) — handler propio:
//      { "detail": "Mensaje en español", "code": "ROUTE_ORDER_EXISTS", "field": null }
//
// 2) Validación de schema de Pydantic/FastAPI (422 nativo):
//      { "detail": [ { "type": "missing", "loc": ["body", "items", 0, "cant"],
//                       "msg": "Field required", "input": {...}, "ctx": {...} } ] }
//
// `parseApiError` (Core/Utils/api-error.utils.ts) normaliza ambos en `ApiError`.

import { HttpErrorResponse } from '@angular/common/http';

// Formato 1: BusinessError
export interface BusinessErrorBody {
	detail: string;
	code: string;
	field: string | null;
}

// Formato 2: un error de validación de Pydantic
export interface ValidationErrorItem {
	type: string;
	loc: (string | number)[];
	msg: string;
	input?: unknown;
	ctx?: Record<string, unknown>;
}

export interface ValidationErrorBody {
	detail: ValidationErrorItem[];
}

// Tipo de error ya clasificado
export type ApiErrorKind =
	| 'business' // BusinessError o respuesta {detail: string} de FastAPI
	| 'validation' // 422 de Pydantic (lista de errores por campo)
	| 'unauthorized' // 401: sesión ausente, vencida o inválida
	| 'network' // sin respuesta del servidor (caído, sin red, CORS)
	| 'unknown';

export interface FieldError {
	// Campo raíz, útil para marcar el control del formulario (p. ej. "items")
	field: string;
	// Ruta completa sin la ubicación: "items.0.cant"
	path: string;
	// Etiqueta legible: "Productos (renglón 1) › Cantidad"
	label: string;
	// Mensaje traducido
	message: string;
}

export interface ApiError {
	kind: ApiErrorKind;
	status: number;
	message: string;
	code: string | null;
	field: string | null;
	fieldErrors: FieldError[];
	raw: HttpErrorResponse | unknown;
}
