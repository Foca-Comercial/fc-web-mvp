import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import {
	Client,
	ClientAdminCreate,
	ClientAdminFilters,
	ClientAdminRow,
	ClientAdminUpdate,
	ClientCreate,
	ClientSpecialPrice,
	ClientSpecialPriceSet,
	ClientUpdate,
} from '@core/Models/CoreModule/catalog.model';
import { Page, PageRequest } from '@core/Models/Shared/api-types.model';
import { toHttpParams } from '@core/Utils/http-params.utils';
import { GenericService } from '../generic.service';

// CRUD de clientes (/clients), búsqueda para tomar pedidos y panel de administración
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

	// ----- Panel de administración (solo ADMINISTRADOR): clientes registrados -----

	// Una página del listado, por nombre (A-Z). Los filtros vacíos no se envían.
	getAdminPage(query: ClientAdminFilters & PageRequest): Observable<Page<ClientAdminRow>> {
		return this.http.get<Page<ClientAdminRow>>(`${this.baseUrl}/admin`, { params: toHttpParams(query) });
	}

	createAdmin(payload: ClientAdminCreate): Observable<ClientAdminRow> {
		return this.http.post<ClientAdminRow>(`${this.baseUrl}/admin`, payload);
	}

	// Editar, desactivar ({ active: false }) o reactivar ({ active: true })
	updateAdmin(id: number, changes: ClientAdminUpdate): Observable<ClientAdminRow> {
		return this.http.patch<ClientAdminRow>(`${this.baseUrl}/admin/${id}`, changes);
	}

	// ----- Precios especiales del cliente (uno por producto) -----

	// Todos sus precios, por código de producto (incluye productos inactivos)
	getSpecialPrices(idClient: number): Observable<ClientSpecialPrice[]> {
		return this.http.get<ClientSpecialPrice[]>(`${this.baseUrl}/admin/${idClient}/special-prices`);
	}

	// Asigna o cambia el precio pactado del producto (la API hace upsert)
	setSpecialPrice(idClient: number, idProduct: number, agreedPrice: number): Observable<ClientSpecialPrice> {
		const body: ClientSpecialPriceSet = { agreed_price: agreedPrice };
		return this.http.put<ClientSpecialPrice>(`${this.baseUrl}/admin/${idClient}/special-prices/${idProduct}`, body);
	}

	removeSpecialPrice(idClient: number, idProduct: number): Observable<void> {
		return this.http.delete<void>(`${this.baseUrl}/admin/${idClient}/special-prices/${idProduct}`);
	}
}
