// ==================================================
// Mensajes de validación de Pydantic en español
// ==================================================
// FastAPI responde los 422 de schema con mensajes de Pydantic en inglés. Aquí se
// traducen según su `type` (estable entre versiones) y su `ctx` (límites).
// Los `value_error` llevan el mensaje que escribimos en el backend (ya en español).

import { ValidationErrorItem } from '@core/Models/Api/api-error.model';

type Translator = (ctx: Record<string, unknown>, item: ValidationErrorItem) => string;

const TRANSLATIONS: Record<string, Translator> = {
	missing: () => 'Es obligatorio.',
	json_invalid: () => 'La información enviada no tiene un formato válido.',

	// Texto
	string_type: () => 'Debe ser un texto.',
	string_too_short: (ctx) =>
		Number(ctx['min_length']) <= 1 ? 'No puede estar vacío.' : `Debe tener al menos ${ctx['min_length']} caracteres.`,
	string_too_long: (ctx) => `No puede superar ${ctx['max_length']} caracteres.`,
	string_pattern_mismatch: () => 'El formato no es válido.',

	// Números
	int_type: () => 'Debe ser un número entero.',
	int_parsing: () => 'Debe ser un número entero.',
	int_from_float: () => 'Debe ser un número entero, sin decimales.',
	float_type: () => 'Debe ser un número.',
	float_parsing: () => 'Debe ser un número.',
	decimal_type: () => 'Debe ser un valor numérico.',
	decimal_parsing: () => 'Debe ser un valor numérico.',
	decimal_max_digits: (ctx) => `No puede tener más de ${ctx['max_digits']} dígitos.`,
	decimal_max_places: (ctx) => `No puede tener más de ${ctx['decimal_places']} decimales.`,
	decimal_whole_digits: (ctx) => `No puede tener más de ${ctx['whole_digits']} dígitos enteros.`,
	greater_than: (ctx) => `Debe ser mayor que ${ctx['gt']}.`,
	greater_than_equal: (ctx) => `Debe ser mayor o igual a ${ctx['ge']}.`,
	less_than: (ctx) => `Debe ser menor que ${ctx['lt']}.`,
	less_than_equal: (ctx) => `Debe ser menor o igual a ${ctx['le']}.`,

	// Booleanos, listas y enums
	bool_type: () => 'Debe ser sí o no.',
	bool_parsing: () => 'Debe ser sí o no.',
	list_type: () => 'Debe ser una lista.',
	too_short: (ctx) => `Debe tener al menos ${ctx['min_length']} elemento(s).`,
	too_long: (ctx) => `No puede tener más de ${ctx['max_length']} elemento(s).`,
	enum: (ctx) => `Valor no permitido. Opciones válidas: ${ctx['expected']}.`,
	literal_error: (ctx) => `Valor no permitido. Opciones válidas: ${ctx['expected']}.`,

	// Fechas y horas
	date_type: () => 'La fecha no es válida (AAAA-MM-DD).',
	date_parsing: () => 'La fecha no es válida (AAAA-MM-DD).',
	date_from_datetime_parsing: () => 'La fecha no es válida (AAAA-MM-DD).',
	time_type: () => 'La hora no es válida (HH:MM).',
	time_parsing: () => 'La hora no es válida (HH:MM).',
	datetime_parsing: () => 'La fecha y hora no son válidas.',

	// Errores escritos en los validadores del backend: "Value error, <mensaje>"
	value_error: (_ctx, item) => {
		if (/email/i.test(item.msg)) return 'El correo electrónico no es válido.';
		return item.msg.replace(/^Value error,\s*/i, '');
	},
	assertion_error: (_ctx, item) => item.msg.replace(/^Assertion failed,\s*/i, ''),
};

export function translateValidationMessage(item: ValidationErrorItem): string {
	const translator = TRANSLATIONS[item.type];
	return translator ? translator(item.ctx ?? {}, item) : item.msg;
}

// Respuestas por defecto de FastAPI/Starlette que llegan con `detail` en inglés
// y sin `code` (no pasan por el handler de BusinessError).
export const DEFAULT_HTTP_MESSAGES: Record<string, string> = {
	'Not authenticated': 'Debes iniciar sesión para continuar.',
	'Not Found': 'El recurso solicitado no existe.',
	'Method Not Allowed': 'La operación no está permitida.',
	'Internal Server Error': 'Ocurrió un error en el servidor.',
};
