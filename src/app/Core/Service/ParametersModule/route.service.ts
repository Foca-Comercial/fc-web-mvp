import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import {
	Route,
	RouteAdminFilters,
	RouteAdminRow,
	RouteAvailableClient,
	RouteCard,
	RouteClient,
	RouteClientAssign,
	RouteCreate,
	RouteUpdate,
} from '@core/Models/ParametersModule/parameters.model';
import { Page, PageRequest } from '@core/Models/Shared/api-types.model';
import { toHttpParams } from '@core/Utils/http-params.utils';
import { GenericService } from '../generic.service';

// CRUD de rutas (/routes) y lo que lee la vista de Rutas: cards y clientes de cada ruta.
// Crear, editar, desactivar y asignar o quitar clientes es solo del panel de
// administración (ADMINISTRADOR).
@Injectable({ providedIn: 'root' })
export class RouteService extends GenericService<Route, RouteCreate, RouteUpdate> {
	constructor() {
		super(API_ENDPOINTS.routes);
	}

	// Todas las rutas con su N.° de clientes activos (incluye inactivas salvo onlyActive)
	getCards(onlyActive = false): Observable<RouteCard[]> {
		return this.http.get<RouteCard[]>(`${this.baseUrl}/cards`, { params: toHttpParams({ only_active: onlyActive }) });
	}

	// Clientes asignados a la ruta, con barrio, zona, estado y sus precios especiales
	getClients(id: number): Observable<RouteClient[]> {
		return this.http.get<RouteClient[]>(`${this.baseUrl}/${id}/clients`);
	}

	// ----- Panel de administración (solo ADMINISTRADOR) -----

	// Una página del listado, por nombre. Los filtros vacíos no se envían.
	getAdminPage(query: RouteAdminFilters & PageRequest): Observable<Page<RouteAdminRow>> {
		return this.http.get<Page<RouteAdminRow>>(`${this.baseUrl}/admin`, { params: toHttpParams(query) });
	}

	// Clientes que se pueden asignar (registrados, activos y aún no en la ruta), por nombre.
	// `name` (mínimo 2 letras) filtra; la API devuelve como máximo `limit`.
	getAvailableClients(id: number, name = '', limit = 20): Observable<RouteAvailableClient[]> {
		let params = new HttpParams().set('limit', limit);
		if (name.trim().length >= 2) params = params.set('name', name.trim());
		return this.http.get<RouteAvailableClient[]>(`${this.baseUrl}/${id}/available-clients`, { params });
	}

	assignClient(id: number, idClient: number): Observable<RouteClient> {
		const body: RouteClientAssign = { id_client: idClient };
		return this.http.post<RouteClient>(`${this.baseUrl}/${id}/clients`, body);
	}

	// Quita la asignación; el cliente no se toca
	unassignClient(id: number, idClient: number): Observable<void> {
		return this.http.delete<void>(`${this.baseUrl}/${id}/clients/${idClient}`);
	}
}
