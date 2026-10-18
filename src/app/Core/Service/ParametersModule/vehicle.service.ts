import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { Vehicle, VehicleCreate, VehicleUpdate } from '@core/Models/ParametersModule/parameters.model';
import { GenericService } from '../generic.service';

// CRUD de vehículos (/vehicles)
@Injectable({ providedIn: 'root' })
export class VehicleService extends GenericService<Vehicle, VehicleCreate, VehicleUpdate> {
	constructor() {
		super(API_ENDPOINTS.vehicles);
	}
}
