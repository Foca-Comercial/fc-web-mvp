// ==================================================
// Modelos: clientes, productos, precios especiales y vendedores
// ==================================================
// Espejo de client_schema, product_schema, special_customer_price_schema,
// user_vehicle_schema y client_route_schema (app/schemas/coreModule).

import { Money, MoneyInput } from '../Shared/api-types.model';

// ----- Client -----
export interface ClientCreate {
	name: string; // máx. 200, MAYÚSCULAS
	phone?: string | null; // 10 dígitos
	address?: string | null; // máx. 200
	id_neighborhood: number;
	is_registered?: boolean; // false = temporal (creado desde un pedido)
	active?: boolean;
}
export type ClientUpdate = Partial<ClientCreate>;
export interface Client extends Required<ClientCreate> {
	id_client: number;
}

// Cliente que se crea dentro del pedido (POST /orders/new-client)
export interface NewClientInput {
	name: string;
	phone?: string | null;
	address?: string | null;
	id_neighborhood: number;
}

// ----- Product -----
export interface ProductCreate {
	code: string; // 3 dígitos
	name: string; // máx. 50
	description?: string | null; // máx. 200
	base_price: MoneyInput;
	active?: boolean;
}
export type ProductUpdate = Partial<ProductCreate>;
export interface Product {
	id_product: number;
	code: string;
	name: string;
	description: string | null;
	base_price: Money;
	active: boolean;
}

// GET /products/catalog?id_client= : precio que aplica a cada producto
export interface ProductCatalogItem {
	id_product: number;
	code: string;
	name: string;
	base_price: Money;
	agreed_price: Money | null;
	effective_price: Money; // agreed_price si existe, si no base_price
}

// ----- SpecialCustomerPrice -----
export interface SpecialCustomerPriceCreate {
	id_client: number;
	id_product: number;
	agreed_price: MoneyInput;
}
export type SpecialCustomerPriceUpdate = Partial<SpecialCustomerPriceCreate>;
export interface SpecialCustomerPrice {
	id_client_price: number;
	id_client: number;
	id_product: number;
	agreed_price: Money;
}

// ----- UserVehicle (vendedor / conductor) -----
export interface UserVehicleCreate {
	code: string; // 2 dígitos: Siigo lo recibe como número ("01" → 1)
	id_user_role: number;
	id_vehicle: number;
}
export type UserVehicleUpdate = Partial<UserVehicleCreate>;
export interface UserVehicle extends UserVehicleCreate {
	id_user_vehicle: number;
}

// Selector de conductor en los pedidos
export interface DriverVehicleDropdown {
	id_user_vehicle: number;
	code: string;
	driver_name: string;
	vehicle_name: string;
}

// ----- ClientRoute (CRUD de ADMINISTRADOR; la vista usa /routes/{id}/clients) -----
export interface ClientRouteCreate {
	id_client: number;
	id_route: number;
}
export type ClientRouteUpdate = Partial<ClientRouteCreate>;
export interface ClientRoute extends ClientRouteCreate {
	id_client_route: number;
}
