import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { Zone, ZoneCreate, ZoneUpdate } from '@core/Models/ParametersModule/parameters.model';
import { GenericService } from '../generic.service';

// CRUD de zonas (/zones)
@Injectable({ providedIn: 'root' })
export class ZoneService extends GenericService<Zone, ZoneCreate, ZoneUpdate> {
	constructor() {
		super(API_ENDPOINTS.zones);
	}
}
