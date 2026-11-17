// Utilidades de fotos: elegir con cámara o galería y reducirlas antes de enviarlas.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export type OrigenFoto = 'camara' | 'galeria';

/**
 * Abre la cámara o la galería. Regresa la dirección local de la foto, o null si el usuario canceló.
 * Con `cuadrada: true` deja recortar la foto en cuadro (para la foto de perfil).
 */
export async function elegirFoto(origen: OrigenFoto, { cuadrada = false } = {}): Promise<string | null> {
  const opciones: ImagePicker.ImagePickerOptions = {
    mediaTypes: 'images',
    quality: 1,
    ...(cuadrada ? { allowsEditing: true, aspect: [1, 1] as [number, number] } : {}),
  };

  let resultado: ImagePicker.ImagePickerResult;
  if (origen === 'camara') {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      throw new Error('Necesitamos permiso de la cámara. Actívalo en Ajustes del teléfono.');
    }
    resultado = await ImagePicker.launchCameraAsync(opciones);
  } else {
    resultado = await ImagePicker.launchImageLibraryAsync(opciones);
  }
  if (resultado.canceled || !resultado.assets[0]) return null;
  return resultado.assets[0].uri;
}

/** Reduce la foto (ancho máximo en píxeles) y la regresa en base64 (JPEG). */
export async function prepararImagen(uri: string, ancho = 1500): Promise<string> {
  const contexto = ImageManipulator.manipulate(uri);
  contexto.resize({ width: ancho });
  const imagen = await contexto.renderAsync();
  const resultado = await imagen.saveAsync({ base64: true, compress: 0.7, format: SaveFormat.JPEG });
  if (!resultado.base64) throw new Error('No se pudo procesar la foto.');
  return resultado.base64;
}
