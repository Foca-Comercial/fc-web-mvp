// ===== SERVICIOS GENÉRICOS PARA CRUD =====
// Espejo del CRUD estándar que expone cada router del backend (BaseService):
//
//   GET    /xxx/?skip=&limit=   → getAll
//   GET    /xxx/{id}            → getById
//   POST   /xxx/                → create
//   PATCH  /xxx/{id}            → update (parcial: solo lo enviado)
//   DELETE /xxx/{id}?strategy=  → delete (SOFT por defecto)
//
// Ojo con la barra final en las colecciones: FastAPI declara "/" y sin ella
// responde un redirect 307.
//
// Dos bases, porque algunas entidades son de solo lectura en la API
// (orders_details, shifts_closures):
//   ReadOnlyService<TRead>
//   GenericService<TRead, TCreate, TUpdate>

import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

import { DeletionType, ListQuery } from '@core/Models/Shared/api-types.model';
import { toHttpParams } from '@core/Utils/http-params.utils';

export abstract class ReadOnlyService<TRead> {
	protected readonly http = inject(HttpClient);

	// URL de la colección sin barra final, p. ej. API_ENDPOINTS.zones
	protected constructor(protected readonly baseUrl: string) {}

	getAll(query: ListQuery = {}): Observable<TRead[]> {
		return this.http.get<TRead[]>(`${this.baseUrl}/`, { params: toHttpParams(query) });
	}

	getById(id: number): Observable<TRead> {
		return this.http.get<TRead>(`${this.baseUrl}/${id}`);
	}
}

export abstract class GenericService<TRead, TCreate, TUpdate = Partial<TCreate>> extends ReadOnlyService<TRead> {
	create(payload: TCreate): Observable<TRead> {
		return this.http.post<TRead>(`${this.baseUrl}/`, payload);
	}

	update(id: number, changes: TUpdate): Observable<TRead> {
		return this.http.patch<TRead>(`${this.baseUrl}/${id}`, changes);
	}

	// SOFT: active = false. HARD: borrado físico (solo si la regla de negocio lo permite)
	delete(id: number, strategy: DeletionType = DeletionType.SOFT): Observable<void> {
		return this.http.delete<void>(`${this.baseUrl}/${id}`, { params: toHttpParams({ strategy }) });
	}
}
