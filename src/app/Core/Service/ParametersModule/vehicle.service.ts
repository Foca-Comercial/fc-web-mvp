import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import {
	Vehicle,
	VehicleAdminFilters,
	VehicleAdminRow,
	VehicleCreate,
	VehicleUpdate,
} from '@core/Models/ParametersModule/parameters.model';
import { Page, PageRequest } from '@core/Models/Shared/api-types.model';
import { toHttpParams } from '@core/Utils/http-params.utils';
import { GenericService } from '../generic.service';

// CRUD de vehículos (/vehicles) y panel de administración
@Injectable({ providedIn: 'root' })
export class VehicleService extends GenericService<Vehicle, VehicleCreate, VehicleUpdate> {
	constructor() {
		super(API_ENDPOINTS.vehicles);
	}

	// ----- Panel de administración (solo ADMINISTRADOR) -----

	// Una página del listado, por nombre. Los filtros vacíos no se envían.
	getAdminPage(query: VehicleAdminFilters & PageRequest): Observable<Page<VehicleAdminRow>> {
		return this.http.get<Page<VehicleAdminRow>>(`${this.baseUrl}/admin`, { params: toHttpParams(query) });
	}

	createAdmin(payload: VehicleCreate): Observable<VehicleAdminRow> {
		return this.http.post<VehicleAdminRow>(`${this.baseUrl}/admin`, payload);
	}

	// Editar, desactivar ({ active: false }) o reactivar ({ active: true })
	updateAdmin(id: number, changes: VehicleUpdate): Observable<VehicleAdminRow> {
		return this.http.patch<VehicleAdminRow>(`${this.baseUrl}/admin/${id}`, changes);
	}
}
