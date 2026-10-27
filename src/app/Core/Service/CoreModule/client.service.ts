import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { Client, ClientCreate, ClientUpdate } from '@core/Models/CoreModule/catalog.model';
import { GenericService } from '../generic.service';

// CRUD de clientes (/clients) y búsqueda para tomar pedidos
@Injectable({ providedIn: 'root' })
export class ClientService extends GenericService<Client, ClientCreate, ClientUpdate> {
	constructor() {
		super(API_ENDPOINTS.clients);
	}

	// Clientes REGISTRADOS y activos cuyo nombre contiene el texto (mínimo 2 letras; máx. 10
	// resultados, por nombre). Los clientes temporales de pedidos anteriores no aparecen.
	search(name: string): Observable<Client[]> {
		return this.http.get<Client[]>(`${this.baseUrl}/search`, { params: new HttpParams().set('name', name) });
	}
}
