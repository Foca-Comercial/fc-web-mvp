// ==================================================
// HTML
// ==================================================
// Para armar el `html` de una alerta de SweetAlert con datos que vienen de la API
// (nombres de clientes, mensajes): siempre escapados, nunca interpolados tal cual.

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (char) => ENTITIES[char] ?? char);
}
