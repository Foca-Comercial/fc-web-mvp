import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { ClientRoute, ClientRouteCreate, ClientRouteUpdate } from '@core/Models/CoreModule/catalog.model';
import { GenericService } from '../generic.service';

// CRUD genérico de asignaciones cliente-ruta (/client_routes) — solo ADMINISTRADOR.
// La vista de Rutas usa los endpoints anidados /routes/{id}/clients.
@Injectable({ providedIn: 'root' })
export class ClientRouteService extends GenericService<ClientRoute, ClientRouteCreate, ClientRouteUpdate> {
	constructor() {
		super(API_ENDPOINTS.clientRoutes);
	}
}
