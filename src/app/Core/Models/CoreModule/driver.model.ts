// ==================================================
// Modelos: domiciliarios y sus asignaciones (/drivers/admin)
// ==================================================
// Espejo de app/schemas/coreModule/driver_schema.py.
// Un domiciliario es persona + usuario + rol VENDEDOR. Cada asignación es la pareja
// domiciliario + vehículo con su propio código de 2 dígitos (el vendedor en Siigo).

// ----- Domiciliario -----
// El usuario (nombre.apellido) y la contraseña inicial los pone la API
export interface DriverCreate {
	name: string; // máx. 100, MAYÚSCULAS
	last_name: string; // máx. 100, MAYÚSCULAS
	phone?: string | null; // 10 dígitos
	email?: string | null;
}

// PATCH parcial. { active: false } desactiva, { active: true } reactiva
export interface DriverUpdate extends Partial<DriverCreate> {
	active?: boolean;
}

export interface DriverAdminFilters {
	search: string; // nombre o apellido (contiene) o código (empieza por); '' = sin filtro
	active: boolean | null; // null = activos e inactivos
}

// Fila del listado; también es la respuesta de crear y editar
export interface DriverAdminRow {
	id_user: number;
	id_person: number;
	name: string;
	last_name: string;
	phone: string | null;
	email: string | null;
	username: string;
	active: boolean;
	codes: string[]; // de sus asignaciones activas, en orden
	assignments_count: number; // asignaciones activas
	protected: boolean; // tiene otro rol o es el vendedor por defecto: no se desactiva
}

// ----- Asignación (domiciliario + vehículo + código) -----
export interface DriverAssignmentCreate {
	id_vehicle: number;
	code: string; // 2 dígitos, único
}

// PATCH parcial. Con pedidos o cierres (in_use) solo cambia `active`
export interface DriverAssignmentUpdate extends Partial<DriverAssignmentCreate> {
	active?: boolean;
}

export interface DriverAssignment {
	id_user_vehicle: number;
	code: string;
	active: boolean;
	id_vehicle: number;
	vehicle_name: string;
	vehicle_active: boolean;
	in_use: boolean; // tiene pedidos o cierres: código y vehículo fijos, no se borra
	is_default: boolean; // vendedor por defecto del cierre: protegido
}

export interface NextSellerCode {
	code: string | null; // null si ya no quedan códigos libres (01–99)
}
