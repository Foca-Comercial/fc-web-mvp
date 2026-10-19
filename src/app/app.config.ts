import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localeEsCo from '@angular/common/locales/es-CO';
import {
	ApplicationConfig,
	inject,
	LOCALE_ID,
	provideAppInitializer,
	provideBrowserGlobalErrorListeners,
	provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { authInterceptor } from '@core/Interceptors/auth.interceptor';
import { AuthService } from '@core/Service/Auth/auth.service';
import { routes } from './app.routes';

// Formatos de fecha, número y moneda de Colombia para los pipes de Angular
registerLocaleData(localeEsCo, 'es-CO');

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideZoneChangeDetection({ eventCoalescing: true }),
		provideRouter(
			routes,
			withComponentInputBinding(),
			withInMemoryScrolling({ scrollPositionRestoration: 'top' })
		),
		provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
		{ provide: LOCALE_ID, useValue: 'es-CO' },

		// Antes del primer ruteo: si hay un refresh token guardado, recupera la sesión.
		provideAppInitializer(() => firstValueFrom(inject(AuthService).restoreSession())),
	],
};
