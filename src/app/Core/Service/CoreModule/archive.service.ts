import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '@core/Constants/api-endpoints';
import {
	ArchiveOverview,
	ArchiveSpreadsheet,
	ArchiveSpreadsheetSet,
	MonthlyArchive,
	PurgeResult,
} from '@core/Models/CoreModule/closure.model';

// Archivado mensual (/archive, solo ADMINISTRADOR): copia de cada mes a Google Sheets y
// purga de los meses fuera de la retención. La API escribe con una cuenta de servicio;
// el spreadsheet de cada año debe estar compartido con ella como Editor.
@Injectable({ providedIn: 'root' })
export class ArchiveService {
	private readonly http = inject(HttpClient);
	private readonly baseUrl = API_ENDPOINTS.archive;

	// Meses hasta el vigente, con lo que se puede copiar o purgar
	getOverview(): Observable<ArchiveOverview> {
		return this.http.get<ArchiveOverview>(`${this.baseUrl}/months`);
	}

	getSpreadsheets(): Observable<ArchiveSpreadsheet[]> {
		return this.http.get<ArchiveSpreadsheet[]>(`${this.baseUrl}/spreadsheets`);
	}

	// Registra o cambia el spreadsheet del año; acepta el ID o la URL completa
	setSpreadsheet(year: number, spreadsheet: string): Observable<ArchiveSpreadsheet> {
		const body: ArchiveSpreadsheetSet = { spreadsheet };
		return this.http.put<ArchiveSpreadsheet>(`${this.baseUrl}/spreadsheets/${year}`, body);
	}

	// Escribe (o reescribe) la pestaña del mes en Sheets. No borra pedidos.
	exportMonth(period: string): Observable<MonthlyArchive> {
		return this.http.post<MonthlyArchive>(`${this.baseUrl}/${period}/export`, null);
	}

	// Vuelve a copiar el mes, lo verifica y lo BORRA de la BD (irreversible en la BD)
	purgeMonth(period: string): Observable<PurgeResult> {
		return this.http.post<PurgeResult>(`${this.baseUrl}/${period}/purge`, null);
	}
}
