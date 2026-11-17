// Sube la foto del ticket a Cloudinary (plan gratuito) con un "upload preset" sin firma.
// Así no hace falta guardar ninguna llave secreta dentro de la app.
//
// Privacidad: las fotos quedan en Cloudinary con una dirección (URL) difícil de adivinar, pero
// cualquiera que tenga esa URL puede verla. Desde la app no se pueden borrar (para eso se
// necesita la llave secreta de Cloudinary, que nunca debe ir en la app).
const NUBE = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';

export const hayCloudinary = NUBE.trim().length > 0 && PRESET.trim().length > 0;

/** Sube una imagen JPEG en base64 y regresa su URL pública (https). */
export async function subirFoto(imagenBase64: string, carpeta: string): Promise<string> {
  if (!hayCloudinary) throw new Error('Cloudinary no está configurado.');

  const formulario = new FormData();
  formulario.append('file', `data:image/jpeg;base64,${imagenBase64}`);
  formulario.append('upload_preset', PRESET);
  formulario.append('folder', carpeta);

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 60_000);
  let respuesta: Response;
  try {
    respuesta = await fetch(`https://api.cloudinary.com/v1_1/${NUBE}/image/upload`, {
      method: 'POST',
      body: formulario,
      signal: controlador.signal,
    });
  } catch {
    throw new Error('No se pudo subir la foto. Revisa tu internet.');
  } finally {
    clearTimeout(temporizador);
  }

  const datos = (await respuesta.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!respuesta.ok || !datos.secure_url) {
    const mensaje = datos.error?.message ?? '';
    if (mensaje.toLowerCase().includes('preset')) {
      throw new Error('El "upload preset" de Cloudinary no existe o no es "Unsigned". Revisa la guía.');
    }
    throw new Error(`Cloudinary no aceptó la foto${mensaje ? `: ${mensaje}` : '.'}`);
  }
  return datos.secure_url;
}

/** Versión reducida de la foto para mostrarla rápido (Cloudinary la redimensiona al vuelo). */
export function miniatura(url: string, ancho = 600): string {
  return url.replace('/image/upload/', `/image/upload/c_limit,w_${ancho},q_auto,f_auto/`);
}
