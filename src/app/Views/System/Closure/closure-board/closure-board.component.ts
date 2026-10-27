// ==================================================
// Vista: Cierre y reportes
// ==================================================
// Resumen de un día (hoy por defecto) para cerrarlo: cards con los totales, una fila por
// vendedor con lo que se le factura y el botón que exporta el Excel para Siigo.
//
// Reglas (las aplica la API; aquí solo se muestran):
//   - Se factura lo despachado y entregado del día, una factura global por vendedor.
//     Los pendientes y cancelados solo cuentan en las cards.
//   - Los pedidos sin conductor se suman al vendedor por defecto.
//   - Cerrar el día es exportarlo; se puede reexportar y no se permiten fechas futuras.
// La búsqueda, el orden y la paginación se hacen aquí (ver closure-board.utils).

import { ChangeDetectionStrategy, Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { DataTableComponent } from '@components/Shared/data-table/data-table.component';
import { EmptyStateComponent } from '@components/Shared/empty-state/empty-state.component';
import { IconButtonComponent } from '@components/Shared/icon-button/icon-button.component';
import { IconComponent } from '@components/Shared/icon/icon.component';
import { PaginationComponent } from '@components/Shared/pagination/pagination.component';
import { SearchInputComponent } from '@components/Shared/search-input/search-input.component';
import { TableSkeletonComponent } from '@components/Shared/skeleton/table-skeleton.component';
import { SkeletonComponent } from '@components/Shared/skeleton/skeleton.component';
import { StatusBadgeComponent } from '@components/Shared/status-badge/status-badge.component';
import { ShiftClosureSummary } from '@core/Models/CoreModule/closure.model';
import { BogotaDatePipe } from '@core/Pipes/bogota-date.pipe';
import { CopCurrencyPipe } from '@core/Pipes/cop-currency.pipe';
import { AlertService } from '@core/Service/Alerts/alert.service';
import { ApiAlertService } from '@core/Service/Alerts/api-alert.service';
import { ShiftClosureService } from '@core/Service/CoreModule/shift-closure.service';
import {
	ClosureSort,
	ClosureSortKey,
	ExportState,
	completedOrders,
	exportState,
	filterSellers,
	formatSellerCode,
	isFutureDate,
	lastExportedAt,
	productCodes,
	productDetail,
	sortSellers,
} from '@core/Utils/closure-board.utils';
import { todayBogota } from '@core/Utils/date.utils';
import { saveBlobResponse } from '@core/Utils/download.utils';
import { escapeHtml } from '@core/Utils/html.utils';
import { formatCop } from '@core/Utils/money.utils';
import { BOARD_PAGE_SIZE, nextSort, paginate, totalPages } from '@core/Utils/order-board.utils';

type LoadMode = 'initial' | 'manual';

@Component({
	selector: 'app-closure-board',
	imports: [
		BogotaDatePipe,
		CopCurrencyPipe,
		DataTableComponent,
		EmptyStateComponent,
		IconButtonComponent,
		IconComponent,
		PaginationComponent,
		SearchInputComponent,
		SkeletonComponent,
		StatusBadgeComponent,
		TableSkeletonComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './closure-board.component.html',
})
export class ClosureBoardComponent {
	private readonly closures = inject(ShiftClosureService);
	private readonly apiAlert = inject(ApiAlertService);
	private readonly alert = inject(AlertService);

	// ----- Fecha -----
	protected readonly today = todayBogota();
	protected readonly date = signal(this.today);

	// ----- Datos -----
	protected readonly summary = signal<ShiftClosureSummary | null>(null);
	protected readonly loading = signal(true); // sin datos todavía: muestra el esqueleto
	protected readonly refreshing = signal(false);
	protected readonly loadFailed = signal(false);
	protected readonly exporting = signal(false);
	private requestId = 0; // descarta respuestas de una fecha que ya no es la elegida

	// ----- Búsqueda, orden y página -----
	protected readonly search = signal('');
	protected readonly sort = signal<ClosureSort | null>(null);

	readonly sellers = computed(() => this.summary()?.sellers ?? []);
	private readonly sorted = computed(() => sortSellers(filterSellers(this.sellers(), this.search()), this.sort()));
	protected readonly pages = computed(() => totalPages(this.sorted().length));
	protected readonly page = linkedSignal<{ key: string; pages: number }, number>({
		source: () => ({ key: JSON.stringify([this.date(), this.search(), this.sort()]), pages: this.pages() }),
		computation: (source, previous) =>
			previous && previous.source.key === source.key ? Math.min(previous.value, source.pages) : 1,
	});
	protected readonly visibleRows = computed(() => paginate(this.sorted(), this.page()));
	protected readonly firstRowNumber = computed(() => (this.page() - 1) * BOARD_PAGE_SIZE + 1);
	protected readonly columnCount = 4;

	// ----- Derivados para las cards -----
	protected readonly state = computed<ExportState>(() => {
		const current = this.summary();
		return current ? exportState(current.sellers, current.exported) : 'empty';
	});
	protected readonly lastExport = computed(() => lastExportedAt(this.sellers()));
	protected readonly completed = computed(() => {
		const current = this.summary();
		return current ? completedOrders(current.cards) : 0;
	});
	protected readonly canExport = computed(
		() => !this.loading() && !this.loadFailed() && !this.exporting() && this.sellers().length > 0
	);

	protected readonly dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
	protected readonly longDateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
	protected readonly timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
	protected readonly formatSellerCode = formatSellerCode;
	protected readonly productCodes = productCodes;
	protected readonly productDetail = productDetail;

	constructor() {
		// Cada cambio de fecha vuelve a pedir el resumen
		effect(() => {
			this.date();
			void this.load('initial');
		});
	}

	// ----- Carga -----
	protected refresh(): void {
		void this.load('manual');
	}

	private async load(mode: LoadMode): Promise<void> {
		const requestId = ++this.requestId;
		const date = this.date();
		if (mode === 'initial') {
			this.loading.set(true);
			this.summary.set(null);
			this.loadFailed.set(false);
		} else {
			this.refreshing.set(true);
		}

		try {
			const data = await firstValueFrom(this.closures.getSummary(date));
			if (requestId !== this.requestId) return; // se cambió de fecha mientras llegaba
			this.summary.set(data);
			this.loadFailed.set(false);
		} catch (error) {
			if (requestId !== this.requestId) return;
			if (mode === 'initial') this.loadFailed.set(true);
			await this.apiAlert.handleError(error, 'No se pudo cargar el cierre');
		} finally {
			if (requestId === this.requestId) {
				this.loading.set(false);
				this.refreshing.set(false);
			}
		}
	}

	// ----- Interacción -----
	protected setDate(value: string): void {
		// El <input type="date"> manda '' si se borra; y la API no deja cerrar días futuros
		if (!value || isFutureDate(value, this.today)) return;
		this.date.set(value);
	}

	protected goToday(): void {
		this.date.set(this.today);
	}

	protected toggleSort(key: ClosureSortKey): void {
		this.sort.update((current) => nextSort(current, key));
	}

	protected ariaSort(key: ClosureSortKey): 'ascending' | 'descending' | 'none' {
		const sort = this.sort();
		if (sort?.key !== key) return 'none';
		return sort.direction === 'asc' ? 'ascending' : 'descending';
	}

	protected sortIcon(key: ClosureSortKey): 'chevron-up' | 'chevron-down' | 'chevron-up-down' {
		const state = this.ariaSort(key);
		return state === 'ascending' ? 'chevron-up' : state === 'descending' ? 'chevron-down' : 'chevron-up-down';
	}

	protected retry(): void {
		void this.load('initial');
	}

	// Cierra el día: confirma, descarga el .xlsx y recarga el resumen (ya con el estado exportado)
	protected async exportDay(): Promise<void> {
		const current = this.summary();
		if (!current || !this.canExport()) return;

		const date = this.date();
		const label = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
			new Date(`${date}T12:00:00`)
		);
		const again = this.state() === 'exported' || this.state() === 'outdated';
		const lines = [
			`Se genera el Excel para Siigo con <strong>${current.sellers.length}</strong> ${current.sellers.length === 1 ? 'vendedor' : 'vendedores'} ` +
				`y un total de <strong>${escapeHtml(formatCop(current.cards.total_income))}</strong>.`,
		];
		if (current.cards.pending > 0) {
			const n = current.cards.pending;
			lines.push(
				`<span style="color:#b45309">Hay ${n} ${n === 1 ? 'pedido pendiente' : 'pedidos pendientes'} que no se ${n === 1 ? 'factura' : 'facturan'}.</span>`
			);
		}
		if (again) lines.push('Ya se había exportado: se actualizan los cierres de este día.');

		this.exporting.set(true);
		try {
			const result = await this.apiAlert.confirmAndRun(
				{
					title: `¿${again ? 'Reexportar' : 'Exportar'} el cierre del ${label}?`,
					html: lines.map((line) => `<p style="margin:0.25rem 0">${line}</p>`).join(''),
					icon: current.cards.pending > 0 ? 'warning' : 'question',
					confirmText: again ? 'Sí, reexportar' : 'Sí, exportar',
				},
				() => this.closures.exportDay(date),
				{ loadingTitle: 'Generando el archivo...', errorTitle: 'No se pudo exportar el cierre' }
			);
			if ('cancelled' in result || !result.ok) return;

			saveBlobResponse(result.data, `cierre_${date}.xlsx`);
			this.alert.toast('Cierre exportado');
			await this.load('manual');
		} finally {
			this.exporting.set(false);
		}
	}
}
