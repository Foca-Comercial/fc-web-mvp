import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import {
	DriverVehicleDropdown,
	UserVehicle,
	UserVehicleCreate,
	UserVehicleUpdate,
} from '@core/Models/CoreModule/catalog.model';
import { GenericService } from '../generic.service';

// Vendedores / conductores (/users_vehicles)
@Injectable({ providedIn: 'root' })
export class UserVehicleService extends GenericService<UserVehicle, UserVehicleCreate, UserVehicleUpdate> {
	constructor() {
		super(API_ENDPOINTS.usersVehicles);
	}

	// Selector de domiciliario de los pedidos, ordenado por nombre del conductor
	getDriversDropdown(): Observable<DriverVehicleDropdown[]> {
		return this.http.get<DriverVehicleDropdown[]>(`${this.baseUrl}/dropdown`);
	}
}
