// ==================================================
// Vista: Login
// ==================================================
// Funcional desde ya; el diseño definitivo llega con la identidad visual.
// - Valida en el cliente lo mismo que la API (usuario y contraseña obligatorios).
// - Credenciales inválidas → 401 de la API con BusinessError: se muestra en línea,
//   sin alerta, porque es el caso más común.
// - Cualquier otro error (red, servidor) → ApiAlertService.

import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ApiAlertService } from '@core/Service/Alerts/api-alert.service';
import { AuthService } from '@core/Service/Auth/auth.service';
import { RoleRedirectService } from '@core/Service/Auth/role-redirect.service';
import { parseApiError } from '@core/Utils/api-error.utils';

@Component({
	selector: 'app-login',
	imports: [ReactiveFormsModule],
	templateUrl: './login.component.html',
})
export class LoginComponent {
	private readonly fb = inject(FormBuilder);
	private readonly auth = inject(AuthService);
	private readonly redirect = inject(RoleRedirectService);
	private readonly apiAlert = inject(ApiAlertService);

	// Query params (withComponentInputBinding): ?returnUrl=/cierre&expired=1
	readonly returnUrl = input<string | null>(null);
	readonly expired = input<string | null>(null);
	protected readonly sessionExpired = computed(() => this.expired() === '1');

	protected readonly submitting = signal(false);
	protected readonly showPassword = signal(false);
	protected readonly loginError = signal<string | null>(null);

	protected readonly form = this.fb.nonNullable.group({
		username: ['', [Validators.required, Validators.maxLength(100)]],
		password: ['', [Validators.required]],
	});

	protected invalid(control: 'username' | 'password'): boolean {
		const c = this.form.controls[control];
		return c.invalid && (c.touched || c.dirty);
	}

	async submit(): Promise<void> {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}

		this.submitting.set(true);
		this.loginError.set(null);

		try {
			const user = await firstValueFrom(this.auth.login(this.form.getRawValue()));
			await this.redirect.redirect(user.roles, this.returnUrl());
		} catch (error) {
			const apiError = parseApiError(error);
			if (apiError.kind === 'unauthorized') {
				this.loginError.set(apiError.message);
			} else {
				await this.apiAlert.handleError(error, 'No fue posible iniciar sesión');
			}
		} finally {
			this.submitting.set(false);
		}
	}
}
