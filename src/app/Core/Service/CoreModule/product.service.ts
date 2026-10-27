import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { Product, ProductCatalogItem, ProductCreate, ProductUpdate } from '@core/Models/CoreModule/catalog.model';
import { GenericService } from '../generic.service';

// CRUD de productos (/products) y catálogo con el precio que aplica a cada cliente
@Injectable({ providedIn: 'root' })
export class ProductService extends GenericService<Product, ProductCreate, ProductUpdate> {
	constructor() {
		super(API_ENDPOINTS.products);
	}

	// Todos los productos activos. Con `idClient`, cada uno trae su precio pactado (si lo tiene)
	// y `effective_price` ya resuelto; sin él, solo el precio base.
	getCatalog(idClient?: number): Observable<ProductCatalogItem[]> {
		const params: Record<string, number> = {};
		if (idClient !== undefined) {
			params['id_client'] = idClient;
		}
		return this.http.get<ProductCatalogItem[]>(`${this.baseUrl}/catalog`, { params });
	}
}
