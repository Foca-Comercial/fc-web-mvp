import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { User, UserCreate, UserUpdate } from '@core/Models/SecurityModule/security.model';
import { GenericService } from '../generic.service';

// CRUD de usuarios (/users) — solo ADMINISTRADOR. La contraseña se hashea en la API.
@Injectable({ providedIn: 'root' })
export class UserService extends GenericService<User, UserCreate, UserUpdate> {
	constructor() {
		super(API_ENDPOINTS.users);
	}
}
