import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { UserVehicle, UserVehicleCreate, UserVehicleUpdate } from '@core/Models/CoreModule/catalog.model';
import { GenericService } from '../generic.service';

// Vendedores / conductores (/users_vehicles). El selector de conductor de los
// pedidos (DriverVehicleDropdown) se agrega al construir esa vista.
@Injectable({ providedIn: 'root' })
export class UserVehicleService extends GenericService<UserVehicle, UserVehicleCreate, UserVehicleUpdate> {
	constructor() {
		super(API_ENDPOINTS.usersVehicles);
	}
}
