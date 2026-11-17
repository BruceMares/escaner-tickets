// Conexión con la IA (Gemini, de Google — plan gratuito de Google AI Studio).
// - leerTicket: manda la foto del ticket y recibe tienda, fecha, total y productos en JSON.
// - pedirConsejos: manda el resumen de gastos (sin fotos) y recibe consejos de ahorro.
//
// IMPORTANTE (seguridad y privacidad):
// - La llave se lee de EXPO_PUBLIC_GEMINI_API_KEY y queda dentro de la app. Está bien para un
//   prototipo escolar, pero en una app real la llamada debe pasar por un servidor propio.
// - En el plan gratuito, Google puede usar lo que se le envía para mejorar sus productos.
import { z } from 'zod';

import { CATEGORIAS, type Producto } from './tipos';

// Modelos del plan gratuito, en orden. "-latest" apunta siempre a la versión más reciente.
// Primero el ligero (rápido); si está saturado o tarda demasiado, se usa el otro automáticamente.
const MODELOS = [
  { nombre: 'gemini-flash-lite-latest', intentos: 2, limiteMs: 30_000 },
  { nombre: 'gemini-flash-latest', intentos: 1, limiteMs: 30_000 },
];
const urlDe = (modelo: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
const esSaturacion = (estado: number) => estado === 500 || estado === 503;
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

export const hayLlaveIA = API_KEY.trim().length > 0;

type Parte = { text: string } | { inline_data: { mime_type: string; data: string } };

type RespuestaGemini = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string };
};

async function llamarGemini(partes: Parte[], instrucciones: string, configExtra: object = {}): Promise<string> {
  if (!hayLlaveIA) {
    throw new Error(
      'Falta la llave de la IA. Pon EXPO_PUBLIC_GEMINI_API_KEY=... en el archivo app/.env y reinicia "npx expo start".',
    );
  }

  const cuerpo = JSON.stringify({
    system_instruction: { parts: [{ text: instrucciones }] },
    contents: [{ role: 'user', parts: partes }],
    generationConfig: configExtra,
  });

  // Si Google está saturado (500/503) o tarda demasiado, se reintenta y luego se cambia de modelo.
  let respuesta: Response | null = null;
  let huboTiempoAgotado = false;
  buscar: for (const modelo of MODELOS) {
    for (let intento = 0; intento < modelo.intentos; intento++) {
      if (intento > 0) await new Promise((r) => setTimeout(r, 1500 * 2 ** (intento - 1)));
      const controlador = new AbortController();
      const temporizador = setTimeout(() => controlador.abort(), modelo.limiteMs);
      try {
        const r = await fetch(urlDe(modelo.nombre), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
          body: cuerpo,
          signal: controlador.signal,
        });
        respuesta = r;
        if (!esSaturacion(r.status)) break buscar;
      } catch (e) {
        if (controlador.signal.aborted) {
          huboTiempoAgotado = true; // tardó demasiado: se intenta de nuevo
          continue;
        }
        if (e instanceof Error && e.name === 'AbortError') continue;
        throw new Error('No hay conexión con la IA. Revisa tu internet e inténtalo de nuevo.');
      } finally {
        clearTimeout(temporizador);
      }
    }
  }

  if (!respuesta || esSaturacion(respuesta.status)) {
    throw new Error(
      huboTiempoAgotado && !respuesta
        ? 'La IA tardó demasiado en responder. Revisa tu internet y toca "Reintentar".'
        : 'La IA de Google está saturada en este momento. Espera un minuto y toca "Reintentar".',
    );
  }

  const datos = (await respuesta.json().catch(() => ({}))) as RespuestaGemini;

  if (!respuesta.ok) {
    const estado = datos.error?.status ?? '';
    const mensaje = datos.error?.message ?? '';
    if (respuesta.status === 429 || estado === 'RESOURCE_EXHAUSTED') {
      throw new Error('Se alcanzó el límite gratuito de la IA por ahora. Espera un minuto e inténtalo otra vez.');
    }
    if (mensaje.includes('API key') || estado === 'PERMISSION_DENIED' || estado === 'UNAUTHENTICATED') {
      throw new Error('La llave de la IA no es válida. Revisa tu archivo .env.');
    }
    throw new Error(`La IA respondió con un error (${respuesta.status}). Inténtalo de nuevo.`);
  }

  if (datos.promptFeedback?.blockReason) throw new Error('La IA no pudo procesar esta solicitud.');
  const candidato = datos.candidates?.[0];
  if (candidato?.finishReason === 'MAX_TOKENS') {
    throw new Error('La respuesta salió incompleta. Intenta con una foto más recortada.');
  }
  const texto = (candidato?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
  if (!texto) throw new Error('La IA no devolvió respuesta. Inténtalo de nuevo.');
  return texto;
}

// Validación de lo que regresa la IA (por si viene algo raro).
const EsquemaTicket = z.object({
  es_ticket: z.boolean(),
  tienda: z.string(),
  fecha: z.string(),
  total: z.coerce.number(),
  productos: z.array(
    z.object({
      nombre: z.string(),
      cantidad: z.coerce.number(),
      precio: z.coerce.number(),
      categoria: z.string(),
    }),
  ),
});

// El mismo formato, en el lenguaje que entiende Gemini, para obligarlo a responder JSON.
const ESQUEMA_GEMINI = {
  type: 'OBJECT',
  properties: {
    es_ticket: { type: 'BOOLEAN', description: 'false si la imagen no es un ticket o recibo de compra legible' },
    tienda: { type: 'STRING', description: 'Nombre del comercio tal como aparece en el ticket' },
    fecha: { type: 'STRING', description: 'Fecha de la compra en formato AAAA-MM-DD; cadena vacía si no se ve' },
    total: { type: 'NUMBER', description: 'Total pagado según el ticket' },
    productos: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          nombre: { type: 'STRING', description: 'Nombre del producto, legible para una persona' },
          cantidad: { type: 'NUMBER' },
          precio: { type: 'NUMBER', description: 'Importe total de esa línea (cantidad × precio unitario)' },
          categoria: { type: 'STRING', enum: [...CATEGORIAS] },
        },
        required: ['nombre', 'cantidad', 'precio', 'categoria'],
      },
    },
  },
  required: ['es_ticket', 'tienda', 'fecha', 'total', 'productos'],
};

export type TicketLeido = {
  tienda: string;
  fecha: string;
  total: number;
  productos: Producto[];
};

function categoriaValida(valor: string): Producto['categoria'] {
  return (CATEGORIAS as readonly string[]).includes(valor) ? (valor as Producto['categoria']) : 'Otros';
}

export async function leerTicket(imagenBase64: string): Promise<TicketLeido> {
  const texto = await llamarGemini(
    [
      { inline_data: { mime_type: 'image/jpeg', data: imagenBase64 } },
      { text: 'Lee este ticket y devuelve la tienda, la fecha, el total y cada producto con su categoría.' },
    ],
    'Eres un asistente que lee tickets de compra de México. Extrae los datos exactamente como aparecen. ' +
      'Usa números sin signo de pesos. Si una línea es un descuento, ponla con precio negativo. ' +
      'No incluyas como productos los subtotales, IVA, cambio, forma de pago ni datos de la tarjeta.',
    { responseMimeType: 'application/json', responseSchema: ESQUEMA_GEMINI, temperature: 0 },
  );

  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    throw new Error('La IA no devolvió datos válidos. Intenta con otra foto.');
  }
  const resultado = EsquemaTicket.safeParse(crudo);
  if (!resultado.success) throw new Error('La IA no devolvió datos válidos. Intenta con otra foto.');
  const datos = resultado.data;
  if (!datos.es_ticket) {
    throw new Error('La imagen no parece un ticket de compra. Toma la foto más de cerca y con buena luz.');
  }

  return {
    tienda: datos.tienda.trim() || 'Tienda desconocida',
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha) ? datos.fecha : '',
    total: Number.isFinite(datos.total) ? datos.total : 0,
    productos: datos.productos.map((p) => ({
      nombre: p.nombre.trim(),
      cantidad: Number.isFinite(p.cantidad) && p.cantidad > 0 ? p.cantidad : 1,
      precio: Number.isFinite(p.precio) ? p.precio : 0,
      categoria: categoriaValida(p.categoria),
    })),
  };
}

export async function pedirConsejos(resumen: string): Promise<string> {
  return llamarGemini(
    [{ text: resumen }],
    'Eres un asesor de finanzas personales amable que habla español de México. ' +
      'Con base en el resumen de gastos, da de 3 a 5 consejos concretos y breves para ahorrar, ' +
      'mencionando las categorías o productos donde más se gasta. Usa viñetas con "•" y texto plano, sin Markdown.',
  );
}
