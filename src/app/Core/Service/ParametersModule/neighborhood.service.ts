import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import {
	Neighborhood,
	NeighborhoodCreate,
	NeighborhoodDropdown,
	NeighborhoodUpdate,
} from '@core/Models/ParametersModule/parameters.model';
import { GenericService } from '../generic.service';

// CRUD de barrios (/neighborhoods) y el selector con su zona para el formulario de pedido
@Injectable({ providedIn: 'root' })
export class NeighborhoodService extends GenericService<Neighborhood, NeighborhoodCreate, NeighborhoodUpdate> {
	constructor() {
		super(API_ENDPOINTS.neighborhoods);
	}

	getDropdown(): Observable<NeighborhoodDropdown[]> {
		return this.http.get<NeighborhoodDropdown[]>(`${this.baseUrl}/dropdown`);
	}
}
