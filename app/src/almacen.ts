// Guarda los tickets en Supabase (tabla "tickets"). Cada ticket lleva el id del usuario y las reglas RLS
// de la base de datos garantizan que cada quien solo vea y modifique los suyos.
import { supabase } from './supabase';
import type { Producto, Ticket } from './tipos';

type Fila = {
  id: string;
  tienda: string;
  fecha: string;
  total: number | string;
  productos: Producto[];
  imagen_url: string | null;
  creado_en: string;
};

function aTicket(f: Fila): Ticket {
  return {
    id: f.id,
    tienda: f.tienda,
    fecha: f.fecha,
    total: Number(f.total),
    productos: Array.isArray(f.productos) ? f.productos : [],
    imagenUrl: f.imagen_url,
    creadoEn: f.creado_en,
  };
}

function error(mensaje: string): Error {
  if (mensaje.toLowerCase().includes('fetch') || mensaje.toLowerCase().includes('network')) {
    return new Error('Sin conexión. Revisa tu internet.');
  }
  if (mensaje.includes('imagen_url')) {
    return new Error('Falta la columna de fotos en Supabase. Vuelve a correr docs/supabase.sql.');
  }
  if (mensaje.includes('relation') && mensaje.includes('does not exist')) {
    return new Error('Falta crear la tabla de tickets en Supabase (docs/supabase.sql).');
  }
  return new Error(`No se pudo guardar/leer: ${mensaje}`);
}

export async function cargarTickets(): Promise<Ticket[]> {
  const { data, error: e } = await supabase
    .from('tickets')
    .select('id, tienda, fecha, total, productos, imagen_url, creado_en')
    .order('fecha', { ascending: false })
    .order('creado_en', { ascending: false });
  if (e) throw error(e.message);
  return (data as Fila[]).map(aTicket);
}

export async function guardarTicket(ticket: Ticket): Promise<void> {
  const { data: usuario } = await supabase.auth.getUser();
  if (!usuario.user) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
  const { error: e } = await supabase.from('tickets').upsert({
    id: ticket.id,
    user_id: usuario.user.id,
    tienda: ticket.tienda,
    fecha: ticket.fecha,
    total: ticket.total,
    productos: ticket.productos,
    imagen_url: ticket.imagenUrl ?? null,
    creado_en: ticket.creadoEn,
  });
  if (e) throw error(e.message);
}

/** Guarda muchos tickets de una sola vez (se usa para los ejemplos). */
export async function guardarVarios(tickets: Ticket[]): Promise<void> {
  const { data: usuario } = await supabase.auth.getUser();
  if (!usuario.user) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
  const filas = tickets.map((t) => ({
    id: t.id,
    user_id: usuario.user!.id,
    tienda: t.tienda,
    fecha: t.fecha,
    total: t.total,
    productos: t.productos,
    imagen_url: t.imagenUrl ?? null,
    creado_en: t.creadoEn,
  }));
  const { error: e } = await supabase.from('tickets').upsert(filas);
  if (e) throw error(e.message);
}

/** Borra solo los tickets de ejemplo (los que empiezan con el prefijo indicado). */
export async function borrarPorPrefijo(prefijo: string): Promise<void> {
  const { error: e } = await supabase.from('tickets').delete().like('id', `${prefijo}%`);
  if (e) throw error(e.message);
}

export async function borrarTicket(id: string): Promise<void> {
  const { error: e } = await supabase.from('tickets').delete().eq('id', id);
  if (e) throw error(e.message);
}
