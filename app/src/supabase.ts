// Conexión con Supabase: cuentas de usuario (correo/contraseña y Google) y base de datos de tickets.
// La "anon key" (o "publishable key") es pública por diseño: la seguridad la dan las reglas RLS de la base
// de datos, que solo dejan a cada usuario leer y escribir SUS propios tickets (ver docs/supabase.sql).
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const URL_SUPABASE = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const LLAVE_SUPABASE = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const haySupabase = URL_SUPABASE.startsWith('https://') && LLAVE_SUPABASE.length > 0;

export const supabase = createClient(
  // Valores de relleno para que la app no truene si aún no está configurado (se muestra un aviso).
  haySupabase ? URL_SUPABASE : 'https://sin-configurar.supabase.co',
  haySupabase ? LLAVE_SUPABASE : 'sin-configurar',
  {
    auth: {
      storage: AsyncStorage, // la sesión se guarda en el teléfono para no pedir login cada vez
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce', // necesario para el login con Google desde la app
    },
  },
);

// Renueva la sesión solo mientras la app está abierta (recomendación de Supabase para React Native).
AppState.addEventListener('change', (estado) => {
  if (estado === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
