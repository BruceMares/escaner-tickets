// Todo lo relacionado con la cuenta del usuario: registrarse, entrar, Google, salir.
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';

import { haySupabase, supabase } from './supabase';

// Cierra la ventana del navegador cuando Google regresa a la app.
WebBrowser.maybeCompleteAuthSession();

/** Dirección a la que Google/Supabase regresan al terminar el login (debe estar en "Redirect URLs" de Supabase). */
export const URL_REGRESO = Linking.createURL('auth');

/** Traduce los errores de Supabase a mensajes claros en español. */
function traducir(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'Primero confirma tu correo con el enlace que te enviamos.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Ese correo ya tiene una cuenta. Inicia sesión.';
  if (m.includes('password should be at least') || m.includes('weak password'))
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('unable to validate email') || m.includes('invalid format') || m.includes('email address'))
    return 'Escribe un correo válido.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera un momento.';
  if (m.includes('provider is not enabled')) return 'El inicio con Google aún no está activado en Supabase.';
  if (m.includes('network') || m.includes('fetch')) return 'Sin conexión. Revisa tu internet.';
  return mensaje;
}

function revisarConfiguracion() {
  if (!haySupabase) {
    throw new Error('Falta configurar Supabase en el archivo app/.env (revisa docs/configurar-login.md).');
  }
}

export async function entrarConCorreo(correo: string, contrasena: string): Promise<void> {
  revisarConfiguracion();
  const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: contrasena });
  if (error) throw new Error(traducir(error.message));
}

/** Crea la cuenta. Regresa true si ya quedó la sesión abierta, false si hay que confirmar el correo. */
export async function crearCuenta(nombre: string, correo: string, contrasena: string): Promise<boolean> {
  revisarConfiguracion();
  const { data, error } = await supabase.auth.signUp({
    email: correo.trim(),
    password: contrasena,
    options: { data: { full_name: nombre.trim() }, emailRedirectTo: URL_REGRESO },
  });
  if (error) throw new Error(traducir(error.message));
  return data.session !== null;
}

export async function recuperarContrasena(correo: string): Promise<void> {
  revisarConfiguracion();
  const { error } = await supabase.auth.resetPasswordForEmail(correo.trim(), { redirectTo: URL_REGRESO });
  if (error) throw new Error(traducir(error.message));
}

/** Pregunta a Supabase si el inicio con Google está activado, para no abrir una página de error. */
async function revisarGoogleActivo(): Promise<void> {
  let activo = true;
  try {
    const r = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '' },
    });
    const ajustes = (await r.json()) as { external?: { google?: boolean } };
    activo = ajustes.external?.google !== false;
  } catch {
    // Si no se pudo revisar, se intenta de todos modos.
  }
  if (!activo) {
    throw new Error('El inicio con Google aún no está activado. Por ahora crea tu cuenta con correo y contraseña.');
  }
}

/** Abre la página de Google, y cuando el usuario acepta, regresa a la app con la sesión abierta. */
export async function entrarConGoogle(): Promise<void> {
  revisarConfiguracion();
  await revisarGoogleActivo();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: URL_REGRESO, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw new Error(traducir(error?.message ?? 'No se pudo abrir Google.'));

  const resultado = await WebBrowser.openAuthSessionAsync(data.url, URL_REGRESO);
  if (resultado.type !== 'success') return; // el usuario cerró la ventana

  const { queryParams } = Linking.parse(resultado.url);
  const errorGoogle = queryParams?.error_description ?? queryParams?.error;
  if (errorGoogle) throw new Error(traducir(String(errorGoogle)));
  const codigo = queryParams?.code;
  if (typeof codigo !== 'string') throw new Error('Google no regresó la información de la cuenta. Intenta de nuevo.');

  const { error: errorSesion } = await supabase.auth.exchangeCodeForSession(codigo);
  if (errorSesion) throw new Error(traducir(errorSesion.message));
}

export async function cerrarSesion(): Promise<void> {
  await supabase.auth.signOut();
}

/** Datos del perfil. Se guardan en los "metadatos" del usuario en Supabase (no hace falta otra tabla). */
export type Perfil = {
  nombreCompleto: string;
  correo: string;
  fotoUrl: string | null;
  fechaNacimiento: string; // DD/MM/AAAA
  lada: string; // ej. "+52"
  telefono: string; // solo dígitos
  miembroDesde: string; // ISO
  verificado: boolean;
  metodo: 'correo' | 'google';
};

export function perfilDe(sesion: Session): Perfil {
  const u = sesion.user;
  const meta = u.user_metadata ?? {};
  return {
    nombreCompleto: String(meta.full_name ?? meta.name ?? ''),
    correo: u.email ?? '',
    fotoUrl: (meta.foto_url ?? meta.avatar_url ?? meta.picture ?? null) as string | null,
    fechaNacimiento: String(meta.fecha_nacimiento ?? ''),
    lada: String(meta.lada ?? '+52'),
    telefono: String(meta.telefono ?? ''),
    miembroDesde: u.created_at,
    verificado: Boolean(u.email_confirmed_at),
    metodo: u.app_metadata?.provider === 'google' ? 'google' : 'correo',
  };
}

export async function actualizarPerfil(datos: {
  nombreCompleto: string;
  fechaNacimiento: string;
  lada: string;
  telefono: string;
  fotoUrl: string | null;
}): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: datos.nombreCompleto.trim(),
      fecha_nacimiento: datos.fechaNacimiento,
      lada: datos.lada,
      telefono: datos.telefono,
      foto_url: datos.fotoUrl,
    },
  });
  if (error) throw new Error(traducir(error.message));
}

/** Nombre para mostrar del usuario (de Google o del registro). */
export function nombreDe(sesion: Session | null): string {
  const meta = sesion?.user.user_metadata ?? {};
  const nombre = (meta.full_name ?? meta.name ?? '') as string;
  if (nombre.trim()) return nombre.trim().split(' ')[0];
  return sesion?.user.email?.split('@')[0] ?? '';
}

/** Sesión actual: undefined mientras carga, null si no hay nadie dentro. */
export function useSesion(): Session | null | undefined {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => setSesion(nueva));
    return () => data.subscription.unsubscribe();
  }, []);
  return sesion;
}
