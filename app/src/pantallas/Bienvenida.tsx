import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { Aviso, Boton } from '../componentes';
import { crearCuenta, entrarConCorreo, entrarConGoogle, recuperarContrasena } from '../cuenta';
import { colores, comunes, degradado, sombra, type NombreIcono } from '../estilos';
import { haySupabase } from '../supabase';

type Modo = 'entrar' | 'registro';

export default function Bienvenida() {
  const [modo, setModo] = useState<Modo>('entrar');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo);
    setError(null);
    setMensaje(null);
  }

  async function enviar() {
    setError(null);
    setMensaje(null);
    if (!correo.includes('@')) return setError('Escribe un correo válido.');
    if (contrasena.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (modo === 'registro' && !nombre.trim()) return setError('Escribe tu nombre.');
    setCargando(true);
    try {
      if (modo === 'entrar') {
        await entrarConCorreo(correo, contrasena);
      } else {
        const sesionAbierta = await crearCuenta(nombre, correo, contrasena);
        if (!sesionAbierta) {
          setMensaje('¡Cuenta creada! Te enviamos un correo para confirmarla. Después inicia sesión aquí.');
          setModo('entrar');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error.');
    } finally {
      setCargando(false);
    }
  }

  async function conGoogle() {
    setError(null);
    setMensaje(null);
    setCargandoGoogle(true);
    try {
      await entrarConGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo entrar con Google.');
    } finally {
      setCargandoGoogle(false);
    }
  }

  async function olvide() {
    if (!correo.includes('@')) {
      setError('Escribe tu correo arriba y vuelve a tocar "¿Olvidaste tu contraseña?".');
      return;
    }
    try {
      await recuperarContrasena(correo);
      Alert.alert('Revisa tu correo', 'Te enviamos un enlace para crear una contraseña nueva.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el correo.');
    }
  }

  const esRegistro = modo === 'registro';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={comunes.pantalla} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={degradado} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={estilos.heroe}>
          <View style={estilos.circulo1} />
          <View style={estilos.circulo2} />
          <View style={estilos.logo}>
            <Ionicons name="receipt" size={34} color={colores.primario} />
          </View>
          <Text style={estilos.marca}>Escáner de Tickets</Text>
          <Text style={estilos.lema}>Toma foto a tus tickets y descubre en qué se va tu dinero.</Text>
        </LinearGradient>

        <View style={estilos.tarjeta}>
          <View style={estilos.selector}>
            {(['entrar', 'registro'] as const).map((m) => (
              <Pressable key={m} onPress={() => cambiarModo(m)} style={[estilos.opcion, modo === m && estilos.opcionActiva]}>
                <Text style={[estilos.opcionTexto, modo === m && estilos.opcionTextoActiva]}>
                  {m === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}
                </Text>
              </Pressable>
            ))}
          </View>

          {!haySupabase && (
            <Aviso tipo="error" texto="Falta configurar Supabase en app/.env. Sigue la guía docs/configurar-login.md." />
          )}
          {mensaje && <Aviso tipo="aviso" texto={mensaje} />}

          {esRegistro && (
            <Campo icono="person-outline" placeholder="Tu nombre" value={nombre} onChangeText={setNombre} autoCapitalize="words" textContentType="name" />
          )}
          <Campo
            icono="mail-outline"
            placeholder="Correo electrónico"
            value={correo}
            onChangeText={setCorreo}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Campo
            icono="lock-closed-outline"
            placeholder={esRegistro ? 'Contraseña (mínimo 6 caracteres)' : 'Contraseña'}
            value={contrasena}
            onChangeText={setContrasena}
            secureTextEntry={!verContrasena}
            autoCapitalize="none"
            textContentType={esRegistro ? 'newPassword' : 'password'}
            derecha={
              <Pressable onPress={() => setVerContrasena((v) => !v)} hitSlop={10}>
                <Ionicons name={verContrasena ? 'eye-off-outline' : 'eye-outline'} size={20} color={colores.tenue} />
              </Pressable>
            }
          />

          {!esRegistro && (
            <Pressable onPress={olvide} hitSlop={8} style={{ alignSelf: 'flex-end' }}>
              <Text style={{ color: colores.primario, fontWeight: '600', fontSize: 14 }}>¿Olvidaste tu contraseña?</Text>
            </Pressable>
          )}

          {error && <Aviso tipo="error" texto={error} />}

          <Boton texto={esRegistro ? 'Crear cuenta' : 'Entrar'} onPress={enviar} cargando={cargando} />

          <View style={estilos.divisor}>
            <View style={[comunes.separador, { flex: 1 }]} />
            <Text style={estilos.divisorTexto}>o</Text>
            <View style={[comunes.separador, { flex: 1 }]} />
          </View>

          <Pressable
            onPress={conGoogle}
            disabled={cargandoGoogle}
            style={({ pressed }) => [estilos.google, { opacity: pressed ? 0.85 : 1 }]}
          >
            {cargandoGoogle ? (
              <ActivityIndicator color={colores.texto} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#EA4335" />
                <Text style={estilos.googleTexto}>Continuar con Google</Text>
              </>
            )}
          </Pressable>

          <Text style={estilos.legal}>
            Tus tickets se guardan en tu cuenta y solo tú puedes verlos.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Campo({ icono, derecha, ...props }: TextInputProps & { icono: NombreIcono; derecha?: ReactNode }) {
  return (
    <View style={estilos.campo}>
      <Ionicons name={icono} size={20} color={colores.tenue} />
      <TextInput placeholderTextColor={colores.tenue} style={estilos.campoTexto} {...props} />
      {derecha}
    </View>
  );
}

const estilos = StyleSheet.create({
  heroe: {
    paddingTop: 48,
    paddingBottom: 72,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  circulo1: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -120,
    right: -80,
  },
  circulo2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -70,
    left: -60,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...sombra,
  },
  marca: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  lema: { color: 'rgba(255,255,255,0.88)', fontSize: 15, textAlign: 'center', lineHeight: 21 },
  tarjeta: {
    marginTop: -44,
    marginHorizontal: 18,
    marginBottom: 32,
    backgroundColor: colores.tarjeta,
    borderRadius: 26,
    padding: 20,
    gap: 14,
    ...sombra,
  },
  selector: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4 },
  opcion: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  opcionActiva: { backgroundColor: colores.tarjeta, ...sombra },
  opcionTexto: { fontSize: 15, fontWeight: '600', color: colores.suave },
  opcionTextoActiva: { color: colores.texto },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#FAFBFD',
  },
  campoTexto: { flex: 1, fontSize: 16, color: colores.texto, paddingVertical: 14 },
  divisor: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divisorTexto: { color: colores.tenue, fontSize: 13 },
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 16,
    paddingVertical: 14,
    minHeight: 52,
    backgroundColor: colores.tarjeta,
  },
  googleTexto: { fontSize: 16, fontWeight: '700', color: colores.texto },
  legal: { fontSize: 12, color: colores.tenue, textAlign: 'center' },
});
