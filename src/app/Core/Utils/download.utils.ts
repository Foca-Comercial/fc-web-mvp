// ==================================================
// Descarga de archivos generados por la API
// ==================================================
// Para el Excel del cierre (cierre_AAAA-MM-DD.xlsx) y el PDF del comprobante.
// El nombre sale del header Content-Disposition; en producción con dominios
// distintos, el backend debe exponerlo vía CORS (expose_headers).

import { HttpResponse } from '@angular/common/http';

export function fileNameFromResponse(response: HttpResponse<Blob>, fallback: string): string {
	const disposition = response.headers.get('Content-Disposition') ?? '';
	// filename*=UTF-8''nombre.xlsx  |  filename="nombre.xlsx"  |  filename=nombre.xlsx
	const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
	if (encoded) return decodeURIComponent(encoded[1]);
	const plain = /filename="?([^";]+)"?/i.exec(disposition);
	return plain ? plain[1] : fallback;
}

// Descarga el blob en el navegador
export function saveBlob(blob: Blob, fileName: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

export function saveBlobResponse(response: HttpResponse<Blob>, fallbackName: string): void {
	if (!response.body) return;
	saveBlob(response.body, fileNameFromResponse(response, fallbackName));
}

// Abre el blob en una pestaña nueva (útil para imprimir el PDF del comprobante)
export function openBlob(blob: Blob): void {
	const url = URL.createObjectURL(blob);
	window.open(url, '_blank');
	// Se libera después de que la pestaña alcance a cargarlo
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
