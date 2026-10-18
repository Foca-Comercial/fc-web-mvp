import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { Neighborhood, NeighborhoodCreate, NeighborhoodUpdate } from '@core/Models/ParametersModule/parameters.model';
import { GenericService } from '../generic.service';

// CRUD de barrios (/neighborhoods). El selector del formulario de pedido
// (NeighborhoodDropdown) se agrega al construir esa vista.
@Injectable({ providedIn: 'root' })
export class NeighborhoodService extends GenericService<Neighborhood, NeighborhoodCreate, NeighborhoodUpdate> {
	constructor() {
		super(API_ENDPOINTS.neighborhoods);
	}
}
