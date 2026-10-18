import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { Client, ClientCreate, ClientUpdate } from '@core/Models/CoreModule/catalog.model';
import { GenericService } from '../generic.service';

// CRUD de clientes (/clients). La búsqueda del formulario de pedido
// (/clients/search?name=) se agrega al construir esa vista.
@Injectable({ providedIn: 'root' })
export class ClientService extends GenericService<Client, ClientCreate, ClientUpdate> {
	constructor() {
		super(API_ENDPOINTS.clients);
	}
}
