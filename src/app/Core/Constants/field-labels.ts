// ==================================================
// Etiquetas de campos de la API
// ==================================================
// Traduce el nombre técnico de un campo (el `loc` de un 422 de Pydantic o el
// `field` de un BusinessError) a una etiqueta legible para el usuario.
// Si un campo no está aquí, se muestra su nombre técnico tal cual.

export const FIELD_LABELS: Record<string, string> = {
	// Auth / seguridad
	username: 'Usuario',
	password: 'Contraseña',
	refresh_token: 'Sesión',
	name: 'Nombre',
	last_name: 'Apellido',
	phone: 'Teléfono',
	email: 'Correo',
	description: 'Descripción',
	active: 'Estado',
	id_person: 'Persona',
	id_user: 'Usuario',
	id_role: 'Rol',
	id_user_role: 'Usuario y rol',

	// Parámetros
	commune_code: 'Código de comuna',
	id_zone: 'Zona',
	id_neighborhood: 'Barrio',
	id_route: 'Ruta',
	days_week: 'Días de la semana',
	departure_time: 'Hora de salida',
	id_vehicle: 'Vehículo',

	// Clientes y productos
	client: 'Cliente',
	id_client: 'Cliente',
	address: 'Dirección',
	is_registered: 'Cliente registrado',
	id_product: 'Producto',
	code: 'Código',
	base_price: 'Precio base',
	agreed_price: 'Precio pactado',

	// Pedidos
	items: 'Productos',
	orders: 'Pedidos',
	cant: 'Cantidad',
	unit_price: 'Precio unitario',
	estimated_delivery: 'Hora estimada de entrega',
	id_user_vehicle: 'Conductor',
	id_order_detail: 'Renglón del pedido',
	target_date: 'Fecha',
	date_from: 'Fecha inicial',
	date_to: 'Fecha final',
	state: 'Estado',
	search: 'Búsqueda',
	page: 'Página',
	page_size: 'Tamaño de página',

	// Archivado
	spreadsheet: 'Spreadsheet de Google',
};

// Campos que contienen listas: el índice del `loc` se muestra como "renglón N"
export const LIST_FIELD_ITEM_LABEL: Record<string, string> = {
	items: 'renglón',
	orders: 'pedido',
	days_week: 'día',
};
