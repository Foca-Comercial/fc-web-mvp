import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { Role, RoleCreate, RoleUpdate } from '@core/Models/SecurityModule/security.model';
import { GenericService } from '../generic.service';

// CRUD de roles (/roles) — solo ADMINISTRADOR
@Injectable({ providedIn: 'root' })
export class RoleService extends GenericService<Role, RoleCreate, RoleUpdate> {
	constructor() {
		super(API_ENDPOINTS.roles);
	}
}
