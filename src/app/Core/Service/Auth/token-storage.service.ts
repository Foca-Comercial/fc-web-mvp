// ===== ALMACENAMIENTO DE TOKENS =====
// Dónde vive cada token (ver docs/ARQUITECTURA.md del backend, sección 8):
// - Access token: SOLO en memoria. Se pierde al recargar y se recupera con el refresh.
// - Refresh token: PROVISIONAL en localStorage, porque hoy la API lo devuelve en el
//   body. Cuando el backend lo mueva a cookie httpOnly, este servicio deja de
//   guardarlo y el navegador lo enviará solo.

import { Injectable } from '@angular/core';
import { STORAGE_KEYS } from '@core/Constants/storage-keys';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
	private accessToken: string | null = null;

	// ----- Access token (memoria) -----
	getAccessToken(): string | null {
		return this.accessToken;
	}

	setAccessToken(token: string | null): void {
		this.accessToken = token;
	}

	// ----- Refresh token (localStorage, provisional) -----
	getRefreshToken(): string | null {
		return this.read(STORAGE_KEYS.REFRESH_TOKEN);
	}

	setRefreshToken(token: string): void {
		this.write(STORAGE_KEYS.REFRESH_TOKEN, token);
	}

	// ----- Usuario (el JWT solo trae el id, no el nombre de usuario) -----
	getUsername(): string | null {
		return this.read(STORAGE_KEYS.USERNAME);
	}

	setUsername(username: string): void {
		this.write(STORAGE_KEYS.USERNAME, username);
	}

	clear(): void {
		this.accessToken = null;
		this.remove(STORAGE_KEYS.REFRESH_TOKEN);
		this.remove(STORAGE_KEYS.USERNAME);
	}

	// localStorage puede lanzar en modo privado o con almacenamiento bloqueado
	private read(key: string): string | null {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	}

	private write(key: string, value: string): void {
		try {
			localStorage.setItem(key, value);
		} catch {
			// Sin almacenamiento: la sesión dura hasta recargar la página
		}
	}

	private remove(key: string): void {
		try {
			localStorage.removeItem(key);
		} catch {
			// Nada que limpiar
		}
	}
}
