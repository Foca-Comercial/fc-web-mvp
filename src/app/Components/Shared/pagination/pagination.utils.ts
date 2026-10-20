// ==================================================
// Paginación: qué botones mostrar
// ==================================================
// buildPageItems(5, 12) → [1, null, 4, 5, 6, null, 12]   (null = "…")
// Siempre se ven la primera y la última página, la actual y sus vecinas.

export function buildPageItems(current: number, total: number, siblings = 1): (number | null)[] {
	const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, index) => from + index);

	// primera + última + actual ± vecinas + 2 "…"
	if (total <= siblings * 2 + 5) return range(1, total);

	const left = Math.max(current - siblings, 1);
	const right = Math.min(current + siblings, total);
	const showLeftGap = left > 3;
	const showRightGap = right < total - 2;
	const edgeCount = 3 + siblings * 2;

	if (!showLeftGap && showRightGap) return [...range(1, edgeCount), null, total];
	if (showLeftGap && !showRightGap) return [1, null, ...range(total - edgeCount + 1, total)];
	return [1, null, ...range(left, right), null, total];
}
