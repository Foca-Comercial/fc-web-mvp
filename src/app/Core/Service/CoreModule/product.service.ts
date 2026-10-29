import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import {
	Product,
	ProductAdminFilters,
	ProductAdminRow,
	ProductCatalogItem,
	ProductCreate,
	ProductUpdate,
} from '@core/Models/CoreModule/catalog.model';
import { Page, PageRequest } from '@core/Models/Shared/api-types.model';
import { toHttpParams } from '@core/Utils/http-params.utils';
import { GenericService } from '../generic.service';

// CRUD de productos (/products), catálogo con el precio que aplica a cada cliente y panel
// de administración
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

	// ----- Panel de administración (solo ADMINISTRADOR) -----

	// Una página del listado, por código. Los filtros vacíos no se envían.
	getAdminPage(query: ProductAdminFilters & PageRequest): Observable<Page<ProductAdminRow>> {
		return this.http.get<Page<ProductAdminRow>>(`${this.baseUrl}/admin`, { params: toHttpParams(query) });
	}

	createAdmin(payload: ProductCreate): Observable<ProductAdminRow> {
		return this.http.post<ProductAdminRow>(`${this.baseUrl}/admin`, payload);
	}

	// Editar, desactivar ({ active: false }) o reactivar ({ active: true })
	updateAdmin(id: number, changes: ProductUpdate): Observable<ProductAdminRow> {
		return this.http.patch<ProductAdminRow>(`${this.baseUrl}/admin/${id}`, changes);
	}
}
