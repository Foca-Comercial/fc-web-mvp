// ==================================================
// Pipe: cop
// ==================================================
// Formatea dinero en pesos colombianos. Acepta el texto que manda la API ("12500.00").
//   {{ order.order_total | cop }}      → $ 12.500
//   {{ product.base_price | cop: 2 }}  → $ 12.500,00

import { Pipe, PipeTransform } from '@angular/core';
import { Money } from '@core/Models/Shared/api-types.model';
import { formatCop } from '@core/Utils/money.utils';

@Pipe({ name: 'cop' })
export class CopCurrencyPipe implements PipeTransform {
	transform(value: Money | number | null | undefined, decimals = 0): string {
		if (value === null || value === undefined || value === '') return '';
		return formatCop(value, decimals);
	}
}
