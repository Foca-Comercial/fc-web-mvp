import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import {
	SpecialCustomerPrice,
	SpecialCustomerPriceCreate,
	SpecialCustomerPriceUpdate,
} from '@core/Models/CoreModule/catalog.model';
import { GenericService } from '../generic.service';

// Precios pactados por cliente (/specials_customers_prices)
@Injectable({ providedIn: 'root' })
export class SpecialCustomerPriceService extends GenericService<
	SpecialCustomerPrice,
	SpecialCustomerPriceCreate,
	SpecialCustomerPriceUpdate
> {
	constructor() {
		super(API_ENDPOINTS.specialCustomerPrices);
	}
}
