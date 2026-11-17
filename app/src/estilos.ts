import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Platform, StyleSheet } from 'react-native';

export type NombreIcono = ComponentProps<typeof Ionicons>['name'];

export const colores = {
  fondo: '#F5F7FB',
  tarjeta: '#FFFFFF',
  texto: '#0F172A',
  suave: '#64748B',
  tenue: '#94A3B8',
  borde: '#E8ECF3',
  primario: '#0D9488',
  primarioOscuro: '#0F766E',
  primarioSuave: '#E6F6F4',
  acento: '#6366F1',
  peligro: '#E11D48',
  peligroSuave: '#FFF1F3',
  aviso: '#B45309',
  avisoSuave: '#FFF7E6',
};

/** Degradado principal de la app (encabezados y tarjetas destacadas). */
export const degradado = ['#14B8A6', '#0D9488', '#0F766E'] as const;

/**
 * Color e ícono de cada categoría. Los 8 colores son una paleta validada para daltonismo
 * (cada categoría conserva SIEMPRE su color). Mascotas y Otros comparten el gris neutro:
 * en las gráficas se agrupan como "Otros".
 */
export const infoCategoria: Record<string, { color: string; icono: NombreIcono }> = {
  Alimentos: { color: '#2a78d6', icono: 'nutrition-outline' },
  Bebidas: { color: '#eb6834', icono: 'cafe-outline' },
  Limpieza: { color: '#1baf7a', icono: 'sparkles-outline' },
  'Higiene personal': { color: '#eda100', icono: 'happy-outline' },
  Hogar: { color: '#e87ba4', icono: 'home-outline' },
  Farmacia: { color: '#008300', icono: 'medkit-outline' },
  Ropa: { color: '#6250d6', icono: 'shirt-outline' },
  Electrónica: { color: '#e34948', icono: 'phone-portrait-outline' },
  Mascotas: { color: '#8a8f98', icono: 'paw-outline' },
  Otros: { color: '#8a8f98', icono: 'pricetag-outline' },
};

/** Color de las gráficas de una sola serie (gasto total). */
export const colorSerie = '#0D9488';
export const colorSerieSuave = '#99D5CF';

export function categoriaInfo(nombre: string) {
  return infoCategoria[nombre] ?? infoCategoria.Otros;
}

/** Color estable para el avatar de cada tienda (según su nombre). */
const PALETA_TIENDAS = ['#0D9488', '#6366F1', '#F59E0B', '#EC4899', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444'];
export function colorTienda(nombre: string): string {
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETA_TIENDAS[h % PALETA_TIENDAS.length];
}

/** Agrega transparencia a un color "#RRGGBB" (alfa de 0 a 1). */
export function conAlfa(hex: string, alfa: number): string {
  const a = Math.round(alfa * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

export const sombra = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  default: { elevation: 2 },
});

export const comunes = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: 20, paddingBottom: 40, gap: 16 },
  titulo: { fontSize: 28, fontWeight: '800', color: colores.texto, letterSpacing: -0.5 },
  subtitulo: { fontSize: 15, color: colores.suave, lineHeight: 21 },
  seccion: { fontSize: 17, fontWeight: '700', color: colores.texto },
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    ...sombra,
  },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  etiqueta: { fontSize: 13, color: colores.suave },
  monto: { fontSize: 15, fontWeight: '700', color: colores.texto, fontVariant: ['tabular-nums'] },
  input: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colores.texto,
    backgroundColor: '#FAFBFD',
  },
  separador: { height: 1, backgroundColor: colores.borde },
});
