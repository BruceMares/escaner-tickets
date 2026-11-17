// Tickets de ejemplo para probar y presentar las gráficas.
// Se generan 6 meses de compras realistas. Todos los ids empiezan con "demo-" para poder borrarlos
// después sin tocar los tickets reales del usuario.
import { hoy } from './formato';
import type { Categoria, Producto, Ticket } from './tipos';

export const PREFIJO_EJEMPLO = 'demo-';
export const esEjemplo = (t: Ticket) => t.id.startsWith(PREFIJO_EJEMPLO);

type Articulo = [nombre: string, precio: number, categoria: Categoria];

const TIENDAS: { nombre: string; peso: number; articulos: Articulo[] }[] = [
  {
    nombre: 'Walmart',
    peso: 4,
    articulos: [
      ['Leche Lala 1 L', 28.5, 'Alimentos'],
      ['Huevo blanco 18 pzas', 62, 'Alimentos'],
      ['Tortillas 1 kg', 24, 'Alimentos'],
      ['Arroz Verde Valle 1 kg', 32.9, 'Alimentos'],
      ['Frijol negro 1 kg', 38.5, 'Alimentos'],
      ['Pechuga de pollo 1 kg', 129, 'Alimentos'],
      ['Jamón de pavo 250 g', 48, 'Alimentos'],
      ['Coca-Cola 3 L', 47, 'Bebidas'],
      ['Agua Bonafont 6 L', 39, 'Bebidas'],
      ['Jugo Del Valle 1 L', 29.5, 'Bebidas'],
      ['Detergente Ariel 3 kg', 159, 'Limpieza'],
      ['Cloro 1 L', 22, 'Limpieza'],
      ['Papel higiénico 12 rollos', 89, 'Higiene personal'],
      ['Shampoo Head & Shoulders', 92, 'Higiene personal'],
      ['Pasta dental Colgate', 39.5, 'Higiene personal'],
      ['Croquetas Pedigree 4 kg', 245, 'Mascotas'],
    ],
  },
  {
    nombre: 'OXXO',
    peso: 4,
    articulos: [
      ['Coca-Cola 600 ml', 21, 'Bebidas'],
      ['Agua Ciel 1 L', 15, 'Bebidas'],
      ['Café americano', 27, 'Bebidas'],
      ['Red Bull 250 ml', 38, 'Bebidas'],
      ['Sabritas 45 g', 21, 'Alimentos'],
      ['Gansito', 17, 'Alimentos'],
      ['Torta de jamón', 39, 'Alimentos'],
      ['Chicles Trident', 14, 'Otros'],
    ],
  },
  {
    nombre: 'Soriana',
    peso: 2,
    articulos: [
      ['Carne molida 1 kg', 149, 'Alimentos'],
      ['Queso Oaxaca 400 g', 79, 'Alimentos'],
      ['Manzana roja 1 kg', 45, 'Alimentos'],
      ['Plátano 1 kg', 22, 'Alimentos'],
      ['Pan Bimbo grande', 52, 'Alimentos'],
      ['Refresco Jarritos 2 L', 28, 'Bebidas'],
      ['Fabuloso 1 L', 31, 'Limpieza'],
      ['Esponjas Scotch-Brite', 26, 'Limpieza'],
      ['Jabón Zest 3 pzas', 42, 'Higiene personal'],
    ],
  },
  {
    nombre: 'Farmacias Guadalajara',
    peso: 1.5,
    articulos: [
      ['Paracetamol 500 mg', 35, 'Farmacia'],
      ['Ibuprofeno 400 mg', 48, 'Farmacia'],
      ['Vitamina C', 89, 'Farmacia'],
      ['Suero Electrolit', 24, 'Farmacia'],
      ['Desodorante Rexona', 64, 'Higiene personal'],
      ['Toallas húmedas', 45, 'Higiene personal'],
    ],
  },
  {
    nombre: 'Costco',
    peso: 0.8,
    articulos: [
      ['Pechuga de pollo 3 kg', 389, 'Alimentos'],
      ['Café Kirkland 1.3 kg', 359, 'Bebidas'],
      ['Papel higiénico 30 rollos', 289, 'Higiene personal'],
      ['Detergente Persil 5 L', 329, 'Limpieza'],
      ['Aceite de oliva 2 L', 279, 'Alimentos'],
      ['Agua Kirkland 40 pzas', 139, 'Bebidas'],
    ],
  },
  {
    nombre: 'Liverpool',
    peso: 0.3,
    articulos: [
      ['Playera Levi’s', 499, 'Ropa'],
      ['Jeans Levi’s 505', 1199, 'Ropa'],
      ['Tenis Nike Revolution', 1499, 'Ropa'],
      ['Audífonos JBL Tune', 899, 'Electrónica'],
    ],
  },
  {
    nombre: 'Home Depot',
    peso: 0.5,
    articulos: [
      ['Foco LED 9 W (4 pzas)', 119, 'Hogar'],
      ['Extensión eléctrica 3 m', 89, 'Hogar'],
      ['Pintura Comex 4 L', 459, 'Hogar'],
      ['Organizador plástico', 149, 'Hogar'],
    ],
  },
  {
    nombre: 'Steren',
    peso: 0.4,
    articulos: [
      ['Cable USB-C 1 m', 149, 'Electrónica'],
      ['Cargador rápido 20 W', 299, 'Electrónica'],
      ['Mouse inalámbrico', 249, 'Electrónica'],
    ],
  },
];

/** Generador de números "aleatorios" con semilla: siempre produce los mismos ejemplos. */
function crearAleatorio(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dos = (n: number) => String(n).padStart(2, '0');

export function generarEjemplos(usuarioId: string, meses = 6): Ticket[] {
  const marca = usuarioId.replace(/-/g, '').slice(0, 8);
  const azar = crearAleatorio(20261113);
  const entero = (min: number, max: number) => min + Math.floor(azar() * (max - min + 1));
  const pesoTotal = TIENDAS.reduce((s, t) => s + t.peso, 0);
  const elegirTienda = () => {
    let r = azar() * pesoTotal;
    for (const t of TIENDAS) {
      r -= t.peso;
      if (r <= 0) return t;
    }
    return TIENDAS[0];
  };

  const [anioHoy, mesHoy, diaHoy] = hoy().split('-').map(Number);
  const tickets: Ticket[] = [];
  let contador = 0;

  for (let m = meses - 1; m >= 0; m--) {
    const fechaMes = new Date(anioHoy, mesHoy - 1 - m, 1);
    const anio = fechaMes.getFullYear();
    const mes = fechaMes.getMonth() + 1;
    const diasDelMes = new Date(anio, mes, 0).getDate();
    const ultimoDia = m === 0 ? diaHoy : diasDelMes;
    // Más compras en meses "de fiesta" para que las gráficas tengan variación.
    const extra = mes === 12 || mes === 5 ? 4 : 0;
    const cantidad = Math.max(2, Math.round(((entero(7, 11) + extra) * ultimoDia) / diasDelMes));

    for (let k = 0; k < cantidad; k++) {
      const tienda = elegirTienda();
      const dia = entero(1, ultimoDia);
      const tiendaChica = ['Liverpool', 'Steren', 'Home Depot'].includes(tienda.nombre);
      const nArticulos = Math.min(tienda.articulos.length, tiendaChica ? entero(1, 2) : entero(2, tienda.nombre === 'OXXO' ? 3 : 7));
      const disponibles = [...tienda.articulos];
      const productos: Producto[] = [];
      for (let p = 0; p < nArticulos; p++) {
        const [nombre, precio, categoria] = disponibles.splice(entero(0, disponibles.length - 1), 1)[0];
        const cantidadArt = categoria === 'Ropa' || categoria === 'Electrónica' || precio > 200 ? 1 : entero(1, 3);
        productos.push({ nombre, cantidad: cantidadArt, precio: Math.round(precio * cantidadArt * 100) / 100, categoria });
      }
      const total = Math.round(productos.reduce((s, p) => s + p.precio, 0) * 100) / 100;
      const fecha = `${anio}-${dos(mes)}-${dos(dia)}`;
      contador++;
      tickets.push({
        id: `${PREFIJO_EJEMPLO}${marca}-${anio}${dos(mes)}-${dos(contador)}`,
        tienda: tienda.nombre,
        fecha,
        total,
        productos,
        imagenUrl: null,
        creadoEn: `${fecha}T${dos(entero(8, 21))}:${dos(entero(0, 59))}:00.000Z`,
      });
    }
  }
  return tickets;
}
