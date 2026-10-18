// ==================================================
// Dinero
// ==================================================
// El backend usa Decimal (Numeric(12,2)) y Pydantic lo serializa como texto
// ("12500.00"). Se convierte a número SOLO para mostrar o sumar en la UI; el
// cálculo que vale (subtotales, total del pedido) siempre lo hace la API.

import { Money } from '@core/Models/Shared/api-types.model';

export function toNumber(value: Money | number | null | undefined): number {
	if (value === null || value === undefined || value === '') return 0;
	const parsed = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

// 12500 → "$ 12.500"
export function formatCop(value: Money | number | null | undefined, decimals = 0): string {
	return new Intl.NumberFormat('es-CO', {
		style: 'currency',
		currency: 'COP',
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	}).format(toNumber(value));
}
