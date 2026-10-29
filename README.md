# FC Web MVP

Frontend de **Foca Comercial** (toma de pedidos y facturación), construido con
**Angular 20 + Tailwind CSS v4 + SweetAlert2**. Consume la API
[`fc-api-mvp`](https://github.com/Foca-Comercial/fc-api-mvp) (FastAPI).

## Requisitos

- Node.js 20.19+ o 22.12+
- La API corriendo en `http://localhost:8000` (`uvicorn app.main:app --reload`)

## Comandos

Instalar dependencias
```bash
npm install
```

Levantar en desarrollo (http://localhost:4200)
```bash
npm start
```

Compilar para producción (`dist/fc-web-mvp`)
```bash
npm run build
```

### Conexión con la API en desarrollo

`ng serve` redirige todo lo que empiece por `/api` a `http://localhost:8000`
(`proxy.conf.json`). Por eso `environment.ts` usa la ruta relativa `/api/v1` y **no hace
falta CORS** en desarrollo. Si la API corre en otro puerto, se cambia solo en
`proxy.conf.json`.

En producción, `environment.production.ts` define la URL de la API. Si frontend y API
quedan en dominios distintos, el backend debe configurar CORS (y exponer
`Content-Disposition` para las descargas).

## Estructura

```
src/app/
├── Components/                 # Componentes reutilizables (no son páginas)
│   ├── Layout/                 # app-header, app-sidebar
│   ├── Shared/                 # Piezas genéricas, sin lógica de negocio: icon, modal, tabs,
│   │                           #   data-table, pagination, search-input, filter-select,
│   │                           #   icon-button, status-badge, skeleton, empty-state,
│   │                           #   item-picker, loader, 403, 404, coming-soon (provisional)
│   └── System/<Vista>/         # Componentes propios de cada vista (cards, modales de detalle…)
├── Core/
│   ├── Constants/              # roles, rutas, endpoints, etiquetas y mensajes de validación
│   ├── Directives/             # appNumericInput, appLogoutButton
│   ├── Guards/                 # authGuard / authMatchGuard, roleGuard / roleMatchGuard, guestGuard
│   ├── Interceptors/           # authInterceptor (Bearer + refresh automático)
│   ├── Models/                 # Interfaces espejo de los schemas de la API
│   │   ├── Api/                #   formatos de error
│   │   ├── Auth/
│   │   ├── Shared/             #   tipos y enums compartidos (OrderState, DayWeek…)
│   │   ├── SecurityModule/
│   │   ├── ParametersModule/
│   │   └── CoreModule/
│   ├── Pipes/                  # bogotaDate, cop, apiTime, orderState, daysWeek
│   ├── State/                  # Estado reutilizable con signals (ServerTable: tablas paginadas en la API)
│   ├── Service/
│   │   ├── generic.service.ts  # ReadOnlyService / GenericService (CRUD de la API)
│   │   ├── Alerts/             # AlertService (SweetAlert2) y ApiAlertService (errores API)
│   │   ├── Auth/               # AuthService, TokenStorageService, RoleRedirectService
│   │   ├── Navigation/         # menú lateral filtrado por rol
│   │   └── <Módulo>/           # un servicio por entidad
│   └── Utils/                  # errores de API, fechas Bogotá, dinero, texto, query params,
│                               #   descargas y la lógica pura de cada vista (*-board.utils)
├── Views/                      # Páginas (las que aparecen en el ruteo)
│   ├── Auth/login/
│   └── System/                 # system-shell (layout) + system.routes.ts
│       ├── Orders/orders-board/    # Tablero de despachos (construido)
│       ├── Routes/routes-board/    # Rutas del día y de la semana (construido)
│       ├── Closure/closure-board/  # Cierre y reportes del día (construido)
│       ├── Admin/admin.routes.ts   # Panel de administración: subsecciones (en construcción)
│       └── History/                # vista por construir
├── app.config.ts               # providers: router, http + interceptor, locale es-CO, restaurar sesión
└── app.routes.ts
```

Alias de imports (`tsconfig.json`): `@core/*`, `@components/*`, `@views/*`, `@env/*`.

## Convenciones

### Modelos
Mismo nombre que el schema del backend, sin sufijo para la respuesta:
`Zone` (ZoneResponse), `ZoneCreate` (POST) y `ZoneUpdate` (PATCH, todo opcional).
Los tipos de la API se respetan tal como llegan en el JSON:

| Backend | Frontend | Ejemplo |
|---|---|---|
| `Decimal` | `Money` (texto) | `"12500.00"` → se muestra con el pipe `cop` |
| `date` | `IsoDate` | `"2026-10-17"` |
| `time` | `TimeString` | `"14:05:00"` → pipe `apiTime` |
| `datetime` | `IsoDateTime` | → pipe `bogotaDate` |

### Servicios
Cada entidad hereda de `GenericService<TRead, TCreate, TUpdate>` (o de `ReadOnlyService`
si la API no permite escribir) y solo declara su endpoint. Los endpoints especiales de
cada vista (`/orders/dashboard-summary`, `/routes/cards`, `/shifts_closures/summary`…)
se agregan como métodos del servicio de su entidad al construir la vista.

### Errores de la API y alertas
La API responde errores en **dos formatos**, y cada uno tiene su manejador en
`ApiAlertService`:

| Formato | Cuándo | Manejador |
|---|---|---|
| `{ detail, code, field }` | Reglas de negocio, 404, 409, 403, 401, 502 | `showBusinessError` |
| `{ detail: [{ loc, msg, type }] }` | 422 de validación de Pydantic | `showValidationErrors` |

`handleError(err)` detecta el formato y elige el manejador; los mensajes de Pydantic se
traducen al español (`Core/Constants/validation-messages.ts`) y los campos se muestran con
su etiqueta (`field-labels.ts`), p. ej. *Productos (renglón 2) › Cantidad: Debe ser mayor que 0.*

Patrón para una acción en un componente:
```ts
const res = await this.apiAlert.run(this.orders.dispatch(id), { successToast: 'Pedido despachado' });
if (res.ok) this.reload();
```

### Autenticación
- `POST /auth/login` recibe un formulario OAuth2 (`x-www-form-urlencoded`), no JSON.
- Los roles salen del JWT (no hay endpoint `/me`).
- El access token vive **solo en memoria**; al recargar, `restoreSession()` lo recupera con
  el refresh token antes del primer ruteo.
- El refresh token viaja en una cookie `httpOnly` (ruta `/api/v1/auth`) que pone y borra la
  API; el front no la ve. Solo se guarda el nombre de usuario (`fc.username`) como pista de
  que hubo sesión, para decidir si vale la pena intentar el refresh al cargar.
- Un solo refresh en vuelo a la vez (la API trata dos refresh con el mismo token como robo y
  cierra todas las sesiones).

### Roles y rutas
`roleGuard` replica la regla de la API: `ADMINISTRADOR` siempre pasa y una ruta sin
`data.roles` queda solo para `ADMINISTRADOR`. El menú (`NavigationService`) declara los
mismos roles que su ruta.

Para un módulo lazy con `loadChildren` se usa `roleMatchGuard` (`canMatch`) en la ruta
padre: si el usuario no tiene el rol, el chunk ni siquiera se descarga y las rutas hijas
no necesitan repetir el guard.

### Panel de administración (`/administracion`, solo ADMINISTRADOR)
El ADMINISTRADOR ve todas las vistas del GESTOR_COMERCIAL y, además, el panel de
administración: un módulo aparte (`Views/System/Admin/admin.routes.ts`, cargado con
`loadChildren` y protegido con `roleMatchGuard`), para que las vistas operativas —las de
alto volumen— no carguen código ni peticiones de administración.

- **Subsecciones** (`ADMIN_PATHS` en `app-routes.ts`): Clientes, Productos, Domiciliarios,
  Vehículos, Rutas y Archivo mensual. `/administracion` redirige a Clientes.
- **Menú:** «Configuración» es un grupo desplegable (`NavigationItem.children`) con una
  entrada por subsección. Se abre solo al entrar a una de sus páginas
  (`NavigationService.openGroup`) y el usuario puede abrirlo o cerrarlo.
- Cada subsección nueva: su ruta en `admin.routes.ts` (con `loadComponent`), su entrada en
  `children` del ítem `admin` de `NavigationService` y su constante en `ADMIN_PATHS`.
- Lo compartido entre subsecciones (filtro de estado activo/inactivo y la traducción de los
  `<select>` a filtros de la API) vive en `Core/Utils/admin-filters.utils.ts`.

Subsecciones construidas:

| Subsección | Ruta | Datos | Notas |
|---|---|---|---|
| Clientes | `/administracion/clientes` | `GET /clients/admin` (paginado en la API), `POST /clients/admin`, `PATCH /clients/admin/{id}` | Solo clientes **registrados** (los temporales los borra la purga). `ServerTable` con búsqueda por nombre o inicio del teléfono, filtro de zona (sale del selector de barrios, que se carga una sola vez para el filtro y el formulario) y de estado (activos por defecto). Crear y editar en un modal (`<app-client-form>`, mismas reglas que el cliente nuevo del pedido; al editar solo envía lo que cambió y sin cambios no deja guardar). Desactivar / reactivar con confirmación (`PATCH { active }`): el desactivado deja de aparecer al tomar pedidos y en las rutas; no hay borrado físico. Lógica pura en `admin-clients.utils`. **Precios especiales** (botón de etiqueta en cada fila → modal `<app-client-prices>`): `GET/PUT/DELETE /clients/admin/{id}/special-prices[/{id_product}]`. Lista por código con el precio base y la diferencia (−17 %, +5 %); el precio se edita en línea (Enter o Guardar, con Deshacer); agregar elige un producto activo del catálogo (`GET /products/catalog`) y entra con su precio base; quitar confirma en línea (vive en un `<dialog>`, sin SweetAlert). Cada cambio recarga la tabla para refrescar el conteo. Lógica pura en `client-prices.utils`. |
| Productos | `/administracion/productos` | `GET /products/admin` (paginado en la API), `POST /products/admin`, `PATCH /products/admin/{id}` | `ServerTable` con búsqueda por inicio del código o nombre y filtro de estado (activos por defecto). Crear y editar en un modal (`<app-product-form>`): código de 3 dígitos (único), nombre, descripción opcional y precio base; si el producto ya tiene pedidos (`in_use`) el código queda bloqueado (lo usan el cierre, Siigo y el archivado). Desactivar / reactivar con confirmación: el desactivado deja de ofrecerse al tomar pedidos y en las rutas. Lógica pura en `admin-products.utils`. |
| Domiciliarios | `/administracion/domiciliarios` | `GET/POST /drivers/admin`, `PATCH /drivers/admin/{id_user}`, `…/assignments` (`GET/POST`, `PATCH/DELETE /{id_user_vehicle}`) y `GET /drivers/admin/next-code` | Un domiciliario es persona + usuario + rol VENDEDOR; cada **asignación** es un vehículo con su propio código de vendedor (el de Siigo y el selector del pedido): un domiciliario tiene un código por vehículo. `ServerTable` con búsqueda por nombre o código y filtro de estado; la columna Códigos muestra los de sus asignaciones activas. Crear y editar la persona en un modal (`<app-driver-form>`; la API arma el usuario `nombre.apellido` con la contraseña inicial); al crear se abren sus asignaciones. Asignaciones en otro modal (`<app-driver-assignments>`, todo en línea): agregar (vehículo que aún no tenga + código, se sugiere el siguiente libre), cambiar código o vehículo y borrar **solo si nunca se usó**; con pedidos o cierres solo se activa / desactiva. El vendedor por defecto y los usuarios con otro rol salen como «Protegido» y no se desactivan. Lógica pura en `admin-drivers.utils`. |
| Vehículos | `/administracion/vehiculos` | `GET/POST /vehicles/admin`, `PATCH /vehicles/admin/{id}` | `ServerTable` con búsqueda por nombre y filtro de estado; cada fila trae cuántas asignaciones activas (domiciliario + código) lo usan. Crear y editar el nombre en un modal (`<app-vehicle-form>`, nombre único). Desactivar confirma cuántas asignaciones dejan de ofrecerse al asignar pedidos (los pedidos que ya las tienen las conservan). Lógica pura en `admin-vehicles.utils`. |
| Rutas | `/administracion/rutas` | `GET /routes/admin` (paginado), `POST /routes/`, `PATCH /routes/{id}`, `GET /routes/{id}/clients`, `GET /routes/{id}/available-clients`, `POST /routes/{id}/clients`, `DELETE /routes/{id}/clients/{id_client}` | `ServerTable` con búsqueda por nombre y filtros de día de la semana y estado (activas por defecto); cada fila trae días, hora de salida y clientes activos. Crear y editar en un modal (`<app-route-form>`: nombre, días con botones de lunes a domingo y hora de salida); al crear se abren sus clientes. Clientes en otro modal (`<app-route-clients>`): asignados (inactivos marcados y aviso «Sin precios especiales»: aparecen en la plantilla pero no se les puede generar pedido), agregar con búsqueda en la API (registrados, activos y aún no asignados; hasta 20 resultados) y quitar con confirmación en línea. Desactivar saca la ruta de «Rutas del día». Lógica pura en `admin-routes.utils`. |
| Archivo mensual | `/administracion/archivo` | `GET /archive/months`, `GET /archive/spreadsheets`, `PUT /archive/spreadsheets/{año}`, `POST /archive/{AAAA-MM}/export` y `/purge` | La API dice qué se puede hacer (`can_export`, `can_purge`, días sin cierre) y lo vuelve a validar al ejecutar. **Google Sheets por año**: lista con enlace y formulario para registrar o cambiar (ID o URL; avisa si reemplaza). **Meses** (del más reciente al más antiguo, hasta el vigente): pedidos y ventas en la BD, estado de la copia (sin copiar, copiado, copia desactualizada si cambió la cantidad de pedidos, purgado) y acciones: copiar / volver a copiar (confirmación) y purgar (hay que **escribir el mes** para confirmar; al terminar muestra cuántos pedidos y clientes temporales se borraron). Si no se puede purgar dice por qué (retención, falta el spreadsheet o días sin cierre exportado). Lógica pura en `admin-archive.utils`. |

### Listados paginados en el servidor (`ServerTable`)
Los catálogos de administración crecen sin límite, así que **no** se traen completos para
filtrar en el cliente (como el tablero, que trae solo un día): la API filtra, ordena y
pagina en SQL y responde `Page<T>` (`{ page, page_size, total, pages, items }`).
`ServerTable` (`Core/State/server-table.state.ts`) conecta eso a signals:

```ts
protected readonly table = new ServerTable({
	load: (query) => this.clients.getAdminPage(query), // query = filtros + page + page_size
	filters: { search: '', active: null as boolean | null },
});
```

- Una sola petición en vuelo (`switchMap`): cambiar un filtro cancela la anterior.
- Cambiar filtros o tamaño de página vuelve a la página 1; si la página pedida quedó más
  allá del final (p. ej. tras eliminar), salta a la última.
- `loading` (primera carga, esqueleto) vs. `refreshing` (recargas, sin parpadeo);
  `failed` solo si nunca se cargó nada. Tras crear, editar o eliminar: `table.reload()`.
- Se crea en un inicializador de campo del componente (necesita contexto de inyección).

### Fechas
Todo "hoy" se calcula en hora de Bogotá con `todayBogota()` (`Core/Utils/date.utils.ts`),
nunca con `new Date().toISOString()` (UTC).

### Estilos
Tailwind v4 se configura en `src/styles.css` (`@theme`): paleta de marca (`brand`, `success`,
`warning`, `danger`, neutros `slate`), fuente Inter y los estilos de login/vidrio.

- Se usan los **tokens y la escala de Tailwind** (`rounded-2xl`, `p-4`, `bg-slate-200`, `size-12`).
  Nada de colores en hexadecimal ni de medidas en píxeles entre corchetes (`bg-[#b3b3b3]`,
  `px-[25px]`): si falta una medida, se usa la más cercana de la escala o se agrega un token.
  Los valores entre corchetes solo se aceptan para estructura (`grid-cols-[…]`, `max-h-[90dvh]`).
- Las clases de componente de `styles.css` (`.btn-primary`, `.form-input`, `.glass`…) no se
  pueden sobrescribir con utilidades; los componentes compartidos usan `:where()` dentro
  de `@layer components` para que las utilidades sí los pisen.
- Los iconos son Heroicons (outline) con `<app-icon>`; para sumar uno se pega su `d` en
  `Components/Shared/icon/icons.ts`.

## Vistas construidas

Todas cuelgan de `system.routes.ts` con `loadComponent` y `roleGuard` (el panel de
administración, con `loadChildren` y `roleMatchGuard`). La lógica de buscar,
filtrar, paginar y agrupar vive en funciones puras de `Core/Utils/*-board.utils.ts` (reciben
`now` o los datos, sin tocar el reloj ni la red) y los componentes solo las conectan a signals.

| Vista | Ruta | Datos | Notas |
|---|---|---|---|
| Tablero de despachos | `/pedidos` | `GET /orders/dashboard-summary` y `/dispatched-summary` (día completo) | Filtros y paginación en el cliente (selector «Mostrar N por página»: 10 por defecto, 25, 50, 100 o 200; `PAGE_SIZE_OPTIONS`); barra superior en dos filas (búsqueda + refrescar + Nuevo pedido, y debajo los tres filtros); se refresca cada minuto. "Próximo" y "Retrasado" se calculan en el front con `estimated_delivery` (`delivery-status.utils`). Las columnas PO, Hora, Cliente y Domiciliario (por código) se ordenan con clic en el encabezado (ascendente → descendente → orden original; ver `sortOrders`). Al registrar un pedido se ofrece registrar otro. **Pedidos programados:** el selector de día de la barra superior va de hoy a +60 días (`schedule.utils`); un día futuro muestra los pedidos con `delivery_date` de ese día («Programado», sin Próximo/Retrasado) y no se pueden despachar hasta su día (`orderCapabilities(state, scheduled)`; la API responde 422 `ORDER_SCHEDULED`). «Nuevo pedido» lleva el campo «Fecha de entrega» (hoy por defecto, o el día que se está viendo; `POST …` con `delivery_date`) y «Editar pedido» permite cambiarla en PENDING (`PATCH` con `delivery_date`; el pedido recibe un PO nuevo del día de destino). El detalle muestra la fecha de entrega. Acciones por fila según el estado (`order-actions.utils`): despachar (`POST /orders/{id}/dispatch`, con o sin domiciliario) y luego ofrece imprimir el CD; entregar (`POST /orders/{id}/deliver`). El detalle cambia el domiciliario (`PATCH /orders/{id}`) y reimprime el CD (`GET /orders/{id}/receipt`, se abre en otra pestaña con `OrderReceiptService`). "Editar pedido" (solo PENDING, dentro del detalle): hora estimada (`PATCH`) y productos (`PUT /orders/{id}/items-order`) con `<app-order-items-editor>`; el catálogo sale de `GET /products/catalog?id_client=` y cada producto entra con el precio pactado del cliente, editable. "Nuevo pedido" (`new-order-modal` → `new-order-form`): dos formularios, **cliente existente** (busca entre registrados con `GET /clients/search?name=` → `POST /orders/existing-client`, catálogo con SUS precios) y **cliente nuevo** (nombre, teléfono de 10 dígitos, dirección y barrio de `GET /neighborhoods/dropdown` → `POST /orders/new-client`, queda como temporal y entra con precios base). Ambos: hora estimada y domiciliario opcionales; los errores de la API salen en línea. |
| Cierre y reportes | `/cierre` | `GET /shifts_closures/summary?target_date=` y `POST /shifts_closures/{fecha}/export` (descarga el .xlsx para Siigo) | Hoy por defecto, con selector para días anteriores (no futuros). Cards: fecha y estado de la exportación, total de pedidos (completados = despachados + entregados, pendientes, cancelados), vendedores del día e ingresos. Tabla por vendedor con búsqueda, orden por columna y paginación en el cliente con el mismo selector de tamaño de página (`closure-board.utils`). Exportar confirma, avisa si hay pendientes (no se facturan) y se vuelve "Reexportar" cuando ya se exportó. |
| Rutas | `/rutas` | `GET /orders/routes-of-day` y `GET /routes/cards` (ya con nombres y zonas de clientes) | "Vista principal" crea los pedidos del día de la ruta (`POST /orders/routes/{id}`); el precio lo pone la API (el pactado del cliente). El detalle pide `GET /routes/{id}/clients` al abrirse. |

### Componentes compartidos con reglas propias
- **`<app-modal>`**: `<dialog>` nativo; se controla con `[(open)]`. Con contenido que hace
  peticiones, envolverlo en `@if` o resolver la carga dentro del componente del modal
  (ver `order-detail-modal`). Si encima se muestra una alerta de SweetAlert, hay que
  ocultar el modal mientras tanto (ver `route-orders-modal`): un `<dialog>` modal vuelve
  inerte todo lo demás. Cuando el modal mismo ejecuta acciones (`order-detail-modal`), los
  avisos van en línea y no con SweetAlert.
- **`<app-order-items-editor>`**: lista editable de productos de un pedido (cantidad, precio, quitar,
  agregar del catálogo). Un renglón cuyo producto se desactivó después de tomar el pedido se marca «Producto
  inactivo»: se conserva y se puede editar o quitar, pero si se quita no se puede volver a agregar. Su lógica está en `Core/Utils/order-items.utils.ts` y se reutilizará al
  registrar pedidos nuevos.
- **`<app-client-search>`**: elige un cliente registrado por nombre (mínimo 2 letras) y muestra su
  tarjeta con "Cambiar cliente".
- **`<app-tabs>`**: variante `default` (pestañas blancas del tablero) y `slate` (Rutas).
- **`<app-item-picker>`**: buscador desplegable para agregar elementos a una lista.
- **`<app-data-table>` + `tbody[app-table-skeleton]`**: tabla con el estilo de la marca y su
  estado de carga.
