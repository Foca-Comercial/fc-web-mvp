import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { Product, ProductCreate, ProductUpdate } from '@core/Models/CoreModule/catalog.model';
import { GenericService } from '../generic.service';

// CRUD de productos (/products). El catálogo con precio resuelto
// (/products/catalog?id_client=) se agrega al construir la vista de Pedidos.
@Injectable({ providedIn: 'root' })
export class ProductService extends GenericService<Product, ProductCreate, ProductUpdate> {
	constructor() {
		super(API_ENDPOINTS.products);
	}
}
