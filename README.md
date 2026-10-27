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
│   ├── Guards/                 # authGuard / authMatchGuard, roleGuard, guestGuard
│   ├── Interceptors/           # authInterceptor (Bearer + refresh automático)
│   ├── Models/                 # Interfaces espejo de los schemas de la API
│   │   ├── Api/                #   formatos de error
│   │   ├── Auth/
│   │   ├── Shared/             #   tipos y enums compartidos (OrderState, DayWeek…)
│   │   ├── SecurityModule/
│   │   ├── ParametersModule/
│   │   └── CoreModule/
│   ├── Pipes/                  # bogotaDate, cop, apiTime, orderState, daysWeek
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
│       └── History/ Closure/ Admin/   # vistas por construir
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

Todas cuelgan de `system.routes.ts` con `loadComponent` y `roleGuard`. La lógica de buscar,
filtrar, paginar y agrupar vive en funciones puras de `Core/Utils/*-board.utils.ts` (reciben
`now` o los datos, sin tocar el reloj ni la red) y los componentes solo las conectan a signals.

| Vista | Ruta | Datos | Notas |
|---|---|---|---|
| Tablero de despachos | `/pedidos` | `GET /orders/dashboard-summary` y `/dispatched-summary` (día completo) | Filtros y paginación en el cliente; se refresca cada minuto. "Próximo" y "Retrasado" se calculan en el front con `estimated_delivery` (`delivery-status.utils`). Las columnas PO, Hora, Cliente y Domiciliario (por código) se ordenan con clic en el encabezado (ascendente → descendente → orden original; ver `sortOrders`). Al registrar un pedido se ofrece registrar otro. Acciones por fila según el estado (`order-actions.utils`): despachar (`POST /orders/{id}/dispatch`, con o sin domiciliario) y luego ofrece imprimir el CD; entregar (`POST /orders/{id}/deliver`). El detalle cambia el domiciliario (`PATCH /orders/{id}`) y reimprime el CD (`GET /orders/{id}/receipt`, se abre en otra pestaña con `OrderReceiptService`). "Editar pedido" (solo PENDING, dentro del detalle): hora estimada (`PATCH`) y productos (`PUT /orders/{id}/items-order`) con `<app-order-items-editor>`; el catálogo sale de `GET /products/catalog?id_client=` y cada producto entra con el precio pactado del cliente, editable. "Nuevo pedido" (`new-order-modal` → `new-order-form`): dos formularios, **cliente existente** (busca entre registrados con `GET /clients/search?name=` → `POST /orders/existing-client`, catálogo con SUS precios) y **cliente nuevo** (nombre, teléfono de 10 dígitos, dirección y barrio de `GET /neighborhoods/dropdown` → `POST /orders/new-client`, queda como temporal y entra con precios base). Ambos: hora estimada y domiciliario opcionales; los errores de la API salen en línea. |
| Rutas | `/rutas` | `GET /orders/routes-of-day` y `GET /routes/cards` (ya con nombres y zonas de clientes) | "Vista principal" crea los pedidos del día de la ruta (`POST /orders/routes/{id}`); el precio lo pone la API (el pactado del cliente). El detalle pide `GET /routes/{id}/clients` al abrirse. |

### Componentes compartidos con reglas propias
- **`<app-modal>`**: `<dialog>` nativo; se controla con `[(open)]`. Con contenido que hace
  peticiones, envolverlo en `@if` o resolver la carga dentro del componente del modal
  (ver `order-detail-modal`). Si encima se muestra una alerta de SweetAlert, hay que
  ocultar el modal mientras tanto (ver `route-orders-modal`): un `<dialog>` modal vuelve
  inerte todo lo demás. Cuando el modal mismo ejecuta acciones (`order-detail-modal`), los
  avisos van en línea y no con SweetAlert.
- **`<app-order-items-editor>`**: lista editable de productos de un pedido (cantidad, precio, quitar,
  agregar del catálogo). Su lógica está en `Core/Utils/order-items.utils.ts` y se reutilizará al
  registrar pedidos nuevos.
- **`<app-client-search>`**: elige un cliente registrado por nombre (mínimo 2 letras) y muestra su
  tarjeta con "Cambiar cliente".
- **`<app-tabs>`**: variante `default` (pestañas blancas del tablero) y `slate` (Rutas).
- **`<app-item-picker>`**: buscador desplegable para agregar elementos a una lista.
- **`<app-data-table>` + `tbody[app-table-skeleton]`**: tabla con el estilo de la marca y su
  estado de carga.
