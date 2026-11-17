const dinero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function formatoDinero(valor: number): string {
  return dinero.format(Number.isFinite(valor) ? valor : 0);
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** "2026-11-13" -> "13 nov 2026" */
export function formatoFecha(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  if (!a || !m || !d) return fecha;
  return `${d} ${MESES[m - 1]} ${a}`;
}

/** "2026-11" -> "Noviembre 2026" */
export function nombreMes(clave: string): string {
  const [a, m] = clave.split('-').map(Number);
  if (!a || !m) return clave;
  return `${MESES_LARGOS[m - 1]} ${a}`;
}

export function hoy(): string {
  const f = new Date();
  const mm = String(f.getMonth() + 1).padStart(2, '0');
  const dd = String(f.getDate()).padStart(2, '0');
  return `${f.getFullYear()}-${mm}-${dd}`;
}

export function nuevoId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
