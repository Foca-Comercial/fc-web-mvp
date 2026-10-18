// ==================================================
// Construcción de query params
// ==================================================
// Omite null, undefined y "" para no mandar filtros vacíos (FastAPI respondería
// 422 al intentar convertir "" a int o a fecha).

import { HttpParams } from '@angular/common/http';

export type QueryValue = string | number | boolean | null | undefined;

export function toHttpParams(query: object = {}): HttpParams {
	let params = new HttpParams();
	for (const [key, value] of Object.entries(query) as [string, QueryValue | QueryValue[]][]) {
		if (Array.isArray(value)) {
			for (const item of value) {
				if (item !== null && item !== undefined && item !== '') params = params.append(key, String(item));
			}
		} else if (value !== null && value !== undefined && value !== '') {
			params = params.set(key, String(value));
		}
	}
	return params;
}
