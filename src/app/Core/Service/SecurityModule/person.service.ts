import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import { Person, PersonCreate, PersonUpdate } from '@core/Models/SecurityModule/security.model';
import { GenericService } from '../generic.service';

// CRUD de personas (/persons) — solo ADMINISTRADOR
@Injectable({ providedIn: 'root' })
export class PersonService extends GenericService<Person, PersonCreate, PersonUpdate> {
	constructor() {
		super(API_ENDPOINTS.persons);
	}
}
