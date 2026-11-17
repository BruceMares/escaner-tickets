export const CATEGORIAS = [
  'Alimentos',
  'Bebidas',
  'Limpieza',
  'Higiene personal',
  'Hogar',
  'Farmacia',
  'Ropa',
  'Electrónica',
  'Mascotas',
  'Otros',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export interface Producto {
  nombre: string;
  cantidad: number;
  precio: number; // precio total de la línea (cantidad × precio unitario)
  categoria: Categoria;
}

export interface Ticket {
  id: string;
  tienda: string;
  fecha: string; // AAAA-MM-DD
  total: number;
  productos: Producto[];
  imagenUrl?: string | null; // foto del ticket en Cloudinary (si se subió)
  creadoEn: string; // ISO
}

export type Pestana = 'escanear' | 'historial' | 'gastos' | 'graficas';
