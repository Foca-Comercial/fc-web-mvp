// ==================================================
// Buscador de <app-item-picker>: qué opciones mostrar y en qué orden
// ==================================================
// Busca por código o por nombre, sin tildes ni mayúsculas. El código pesa más: si se
// escribe "001" exacto, esa opción queda primera y Enter la elige de una vez.

import { normalizeText } from '@core/Utils/text.utils';

export interface PickerOption {
	id: number;
	code: string; // "001"
	label: string; // "Bolsa 6L"
	meta?: string; // texto a la derecha, p. ej. el precio
}

// 0 = código exacto · 1 = código que empieza igual · 2 = nombre que empieza igual · 3 = contiene
function rank(option: PickerOption, needle: string): number | null {
	const code = normalizeText(option.code);
	const label = normalizeText(option.label);
	if (code === needle) return 0;
	if (code.startsWith(needle)) return 1;
	if (label.startsWith(needle)) return 2;
	if (label.includes(needle) || code.includes(needle)) return 3;
	return null;
}

export function filterPickerOptions(options: readonly PickerOption[], query: string): PickerOption[] {
	const needle = normalizeText(query);
	if (!needle) return [...options];
	return options
		.map((option, index) => ({ option, index, rank: rank(option, needle) }))
		.filter((entry): entry is { option: PickerOption; index: number; rank: number } => entry.rank !== null)
		.sort((a, b) => a.rank - b.rank || a.index - b.index)
		.map((entry) => entry.option);
}
