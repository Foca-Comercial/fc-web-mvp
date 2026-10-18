import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { UserRole, UserRoleCreate, UserRoleUpdate } from '@core/Models/SecurityModule/security.model';
import { GenericService } from '../generic.service';

// Asignación de roles a usuarios (/users_roles) — solo ADMINISTRADOR
@Injectable({ providedIn: 'root' })
export class UserRoleService extends GenericService<UserRole, UserRoleCreate, UserRoleUpdate> {
	constructor() {
		super(API_ENDPOINTS.usersRoles);
	}
}
