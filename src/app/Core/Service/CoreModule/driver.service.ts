import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import {
	DriverAdminFilters,
	DriverAdminRow,
	DriverAssignment,
	DriverAssignmentCreate,
	DriverAssignmentUpdate,
	DriverCreate,
	DriverUpdate,
	NextSellerCode,
} from '@core/Models/CoreModule/driver.model';
import { Page, PageRequest } from '@core/Models/Shared/api-types.model';
import { toHttpParams } from '@core/Utils/http-params.utils';

// Panel de administración: domiciliarios (usuarios VENDEDOR) y sus asignaciones con
// vehículos. Solo ADMINISTRADOR. No hay CRUD genérico: un domiciliario es persona +
// usuario + rol, y la API lo crea en una sola transacción.
@Injectable({ providedIn: 'root' })
export class DriverService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = `${API_ENDPOINTS.drivers}/admin`;

	// ----- Domiciliarios -----
	getAdminPage(query: DriverAdminFilters & PageRequest): Observable<Page<DriverAdminRow>> {
		return this.http.get<Page<DriverAdminRow>>(this.baseUrl, { params: toHttpParams(query) });
	}

	create(payload: DriverCreate): Observable<DriverAdminRow> {
		return this.http.post<DriverAdminRow>(this.baseUrl, payload);
	}

	// Editar, desactivar ({ active: false }) o reactivar ({ active: true })
	update(idUser: number, changes: DriverUpdate): Observable<DriverAdminRow> {
		return this.http.patch<DriverAdminRow>(`${this.baseUrl}/${idUser}`, changes);
	}

	// ----- Asignaciones -----
	getAssignments(idUser: number): Observable<DriverAssignment[]> {
		return this.http.get<DriverAssignment[]>(`${this.baseUrl}/${idUser}/assignments`);
	}

	createAssignment(idUser: number, payload: DriverAssignmentCreate): Observable<DriverAssignment> {
		return this.http.post<DriverAssignment>(`${this.baseUrl}/${idUser}/assignments`, payload);
	}

	// Código, vehículo o estado. Con pedidos o cierres solo cambia el estado.
	updateAssignment(idUser: number, idUserVehicle: number, changes: DriverAssignmentUpdate): Observable<DriverAssignment> {
		return this.http.patch<DriverAssignment>(`${this.baseUrl}/${idUser}/assignments/${idUserVehicle}`, changes);
	}

	// Solo una asignación que nunca se usó
	deleteAssignment(idUser: number, idUserVehicle: number): Observable<void> {
		return this.http.delete<void>(`${this.baseUrl}/${idUser}/assignments/${idUserVehicle}`);
	}

	// Primer código libre de 01 a 99 (sugerencia para una asignación nueva)
	getNextCode(): Observable<NextSellerCode> {
		return this.http.get<NextSellerCode>(`${this.baseUrl}/next-code`);
	}
}
