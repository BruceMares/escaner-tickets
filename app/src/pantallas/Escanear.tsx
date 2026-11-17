import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { guardarTicket } from '../almacen';
import { AvatarTienda, AvatarUsuario, Aviso, Boton, IconoCategoria, Tarjeta } from '../componentes';
import { colores, comunes, degradado, sombra, type NombreIcono } from '../estilos';
import { formatoDinero, formatoFecha, hoy, nombreMes, nuevoId } from '../formato';
import { hayCloudinary, subirFoto } from '../fotos';
import { elegirFoto, prepararImagen } from '../imagen';
import { hayLlaveIA, leerTicket, type TicketLeido } from '../ia';
import { supabase } from '../supabase';
import type { Ticket } from '../tipos';

type Props = {
  tickets: Ticket[];
  nombre: string;
  fotoUrl: string | null;
  alAbrirCuenta: () => void;
  alGuardar: () => void;
  alAbrir: (ticket: Ticket) => void;
  alVerTodos: () => void;
};

function saludo(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const CONSEJOS_FOTO = [
  { icono: 'sunny-outline' as const, texto: 'Buena luz, sin sombras ni reflejos' },
  { icono: 'scan-outline' as const, texto: 'El ticket completo y derecho' },
  { icono: 'hand-left-outline' as const, texto: 'Sin mover el teléfono al tomarla' },
];

export default function Escanear({ tickets, nombre, fotoUrl, alAbrirCuenta, alGuardar, alAbrir, alVerTodos }: Props) {
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leido, setLeido] = useState<TicketLeido | null>(null);
  const [tienda, setTienda] = useState('');
  const [fecha, setFecha] = useState('');
  const [total, setTotal] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [fotoSubida, setFotoSubida] = useState<string | null>(null);

  const mesActual = hoy().slice(0, 7);
  const delMes = tickets.filter((t) => t.fecha.startsWith(mesActual));
  const totalMes = delMes.reduce((s, t) => s + t.total, 0);

  async function obtenerFoto(origen: 'camara' | 'galeria') {
    setError(null);
    let uri: string | null;
    try {
      uri = await elegirFoto(origen);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir la cámara.');
      return;
    }
    if (!uri) return;

    setFotoUri(uri);
    setLeido(null);
    await analizar(uri);
  }

  async function analizar(uri: string) {
    setLeyendo(true);
    setError(null);
    try {
      const base64 = await prepararImagen(uri);
      setFotoBase64(base64);
      setFotoSubida(null);
      const datos = await leerTicket(base64);
      setLeido(datos);
      setTienda(datos.tienda);
      setFecha(datos.fecha || hoy());
      setTotal(String(datos.total));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el ticket.');
    } finally {
      setLeyendo(false);
    }
  }

  function quitarProducto(indice: number) {
    if (!leido) return;
    setLeido({ ...leido, productos: leido.productos.filter((_, i) => i !== indice) });
  }

  async function guardar() {
    if (!leido) return;
    const totalNumero = Number(total.replace(/[^0-9.-]/g, ''));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      Alert.alert('Fecha inválida', 'Escribe la fecha como AAAA-MM-DD, por ejemplo 2026-11-13.');
      return;
    }
    setGuardando(true);

    // 1) Subir la foto a Cloudinary (si está configurado). Si falla, se pregunta si guardar sin foto.
    let imagenUrl = fotoSubida;
    if (!imagenUrl && fotoBase64 && hayCloudinary) {
      try {
        const { data } = await supabase.auth.getSession();
        imagenUrl = await subirFoto(fotoBase64, `tickets/${data.session?.user.id ?? 'sin-usuario'}`);
        setFotoSubida(imagenUrl); // por si falla el guardado y se reintenta, no se sube dos veces
      } catch (e) {
        setGuardando(false);
        const seguir = await new Promise<boolean>((resolver) =>
          Alert.alert(
            'No se pudo subir la foto',
            `${e instanceof Error ? e.message : ''}\n¿Quieres guardar el ticket sin foto?`,
            [
              { text: 'Cancelar', style: 'cancel', onPress: () => resolver(false) },
              { text: 'Guardar sin foto', onPress: () => resolver(true) },
            ],
          ),
        );
        if (!seguir) return;
        setGuardando(true);
      }
    }

    // 2) Guardar los datos del ticket en Supabase.
    const ticket: Ticket = {
      id: nuevoId(),
      tienda: tienda.trim() || 'Tienda desconocida',
      fecha,
      total: Number.isFinite(totalNumero) ? totalNumero : leido.total,
      productos: leido.productos,
      imagenUrl,
      creadoEn: new Date().toISOString(),
    };
    try {
      await guardarTicket(ticket);
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Inténtalo de nuevo.');
      return;
    } finally {
      setGuardando(false);
    }
    reiniciar();
    alGuardar();
  }

  function reiniciar() {
    setFotoUri(null);
    setFotoBase64(null);
    setFotoSubida(null);
    setLeido(null);
    setError(null);
  }

  // ---------- Revisión de lo que leyó la IA ----------
  if (leido) {
    const sumaProductos = leido.productos.reduce((s, p) => s + p.precio, 0);
    return (
      <ScrollView style={comunes.pantalla} contentContainerStyle={comunes.contenido} keyboardShouldPersistTaps="handled">
        <View style={comunes.fila}>
          <Pressable onPress={reiniciar} hitSlop={12} style={estilos.botonRedondo}>
            <Ionicons name="close" size={22} color={colores.texto} />
          </Pressable>
          <Text style={comunes.seccion}>Revisa tu ticket</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={estilos.exito}>
          <Ionicons name="checkmark-circle" size={22} color={colores.primario} />
          <Text style={{ flex: 1, color: colores.primarioOscuro, fontSize: 14, lineHeight: 20 }}>
            La IA encontró {leido.productos.length} productos. Corrige lo que haga falta antes de guardar.
          </Text>
        </View>

        <Tarjeta>
          <Campo icono="storefront-outline" etiqueta="Tienda">
            <TextInput style={comunes.input} value={tienda} onChangeText={setTienda} placeholder="Nombre de la tienda" />
          </Campo>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Campo icono="calendar-outline" etiqueta="Fecha">
                <TextInput style={comunes.input} value={fecha} onChangeText={setFecha} placeholder="AAAA-MM-DD" />
              </Campo>
            </View>
            <View style={{ flex: 1 }}>
              <Campo icono="cash-outline" etiqueta="Total">
                <TextInput style={comunes.input} value={total} onChangeText={setTotal} keyboardType="decimal-pad" />
              </Campo>
            </View>
          </View>
          {Math.abs(sumaProductos - leido.total) > 1 && (
            <Aviso
              tipo="aviso"
              texto={`La suma de los productos es ${formatoDinero(sumaProductos)}. Revisa que se haya leído todo el ticket.`}
            />
          )}
        </Tarjeta>

        <Tarjeta estilo={{ gap: 0 }}>
          <Text style={[comunes.seccion, { marginBottom: 6 }]}>Productos</Text>
          {leido.productos.map((p, i) => (
            <View key={`${p.nombre}-${i}`} style={[estilos.producto, i > 0 && estilos.productoBorde]}>
              <IconoCategoria categoria={p.categoria} tamano={38} />
              <View style={{ flex: 1 }}>
                <Text style={estilos.productoNombre} numberOfLines={2}>
                  {p.nombre}
                </Text>
                <Text style={comunes.etiqueta}>
                  {p.cantidad !== 1 ? `${p.cantidad} pzas · ` : ''}
                  {p.categoria}
                </Text>
              </View>
              <Text style={comunes.monto}>{formatoDinero(p.precio)}</Text>
              <Pressable onPress={() => quitarProducto(i)} hitSlop={10}>
                <Ionicons name="close-circle" size={22} color={colores.tenue} />
              </Pressable>
            </View>
          ))}
        </Tarjeta>

        <Boton texto="Guardar ticket" icono="checkmark" onPress={guardar} cargando={guardando} />
        <Boton texto="Descartar" variante="secundario" onPress={reiniciar} />
      </ScrollView>
    );
  }

  // ---------- Leyendo con IA ----------
  if (leyendo || (fotoUri && error)) {
    return (
      <ScrollView style={comunes.pantalla} contentContainerStyle={comunes.contenido}>
        <Text style={comunes.titulo}>{leyendo ? 'Leyendo ticket' : 'No se pudo leer'}</Text>
        <View style={estilos.marcoFoto}>
          {fotoUri && <Image source={{ uri: fotoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
          {leyendo && (
            <View style={estilos.capaCarga}>
              <View style={estilos.burbujaCarga}>
                <ActivityIndicator size="large" color={colores.primario} />
                <Text style={[comunes.seccion, { fontSize: 15 }]}>La IA está leyendo tu ticket…</Text>
                <Text style={comunes.etiqueta}>Esto toma unos segundos</Text>
              </View>
            </View>
          )}
        </View>
        {error && (
          <>
            <Aviso tipo="error" texto={error} />
            {fotoUri && <Boton texto="Reintentar" icono="refresh" onPress={() => analizar(fotoUri)} />}
            <Boton texto="Tomar otra foto" variante="secundario" icono="camera-outline" onPress={reiniciar} />
          </>
        )}
      </ScrollView>
    );
  }

  // ---------- Inicio ----------
  return (
    <ScrollView style={comunes.pantalla} contentContainerStyle={comunes.contenido}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={comunes.subtitulo}>
            {saludo()}
            {nombre ? `, ${nombre}` : ''} 👋
          </Text>
          <Text style={comunes.titulo}>Tus gastos, sin complicaciones</Text>
        </View>
        <Pressable onPress={alAbrirCuenta} hitSlop={8} accessibilityLabel="Mi cuenta">
          <AvatarUsuario nombre={nombre || '?'} url={fotoUrl} tamano={44} />
        </Pressable>
      </View>

      {!hayLlaveIA && (
        <Aviso tipo="error" texto="Falta configurar la llave de la IA. Crea el archivo app/.env (copia .env.example) y reinicia la app." />
      )}

      <LinearGradient colors={degradado} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={estilos.heroe}>
        <View style={estilos.circuloDecorativo} />
        <Text style={estilos.heroeEtiqueta}>Gastado en {nombreMes(mesActual).toLowerCase()}</Text>
        <Text style={estilos.heroeMonto}>{formatoDinero(totalMes)}</Text>
        <Text style={estilos.heroeEtiqueta}>
          {delMes.length === 1 ? '1 ticket registrado' : `${delMes.length} tickets registrados`}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Pressable
            style={({ pressed }) => [estilos.botonHeroe, { opacity: pressed ? 0.9 : 1 }]}
            onPress={() => obtenerFoto('camara')}
          >
            <Ionicons name="camera" size={20} color={colores.primarioOscuro} />
            <Text style={estilos.botonHeroeTexto}>Escanear</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [estilos.botonHeroeClaro, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => obtenerFoto('galeria')}
          >
            <Ionicons name="images-outline" size={20} color="#FFFFFF" />
            <Text style={[estilos.botonHeroeTexto, { color: '#FFFFFF' }]}>Galería</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {error && <Aviso tipo="error" texto={error} />}

      {tickets.length > 0 ? (
        <View style={{ gap: 10 }}>
          <View style={comunes.fila}>
            <Text style={comunes.seccion}>Recientes</Text>
            <Pressable onPress={alVerTodos} hitSlop={10}>
              <Text style={{ color: colores.primario, fontWeight: '700' }}>Ver todos</Text>
            </Pressable>
          </View>
          <Tarjeta estilo={{ gap: 0, paddingVertical: 6 }}>
            {tickets.slice(0, 3).map((t, i) => (
              <Pressable key={t.id} onPress={() => alAbrir(t)} style={[estilos.reciente, i > 0 && estilos.productoBorde]}>
                <AvatarTienda nombre={t.tienda} tamano={42} />
                <View style={{ flex: 1 }}>
                  <Text style={estilos.productoNombre} numberOfLines={1}>
                    {t.tienda}
                  </Text>
                  <Text style={comunes.etiqueta}>{formatoFecha(t.fecha)}</Text>
                </View>
                <Text style={comunes.monto}>{formatoDinero(t.total)}</Text>
              </Pressable>
            ))}
          </Tarjeta>
        </View>
      ) : (
        <Tarjeta>
          <Text style={comunes.seccion}>Para una buena lectura</Text>
          {CONSEJOS_FOTO.map((c) => (
            <View key={c.texto} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={estilos.consejoIcono}>
                <Ionicons name={c.icono} size={18} color={colores.primario} />
              </View>
              <Text style={{ fontSize: 15, color: colores.texto, flex: 1 }}>{c.texto}</Text>
            </View>
          ))}
        </Tarjeta>
      )}
    </ScrollView>
  );
}

function Campo({ icono, etiqueta, children }: { icono: NombreIcono; etiqueta: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={icono} size={14} color={colores.suave} />
        <Text style={comunes.etiqueta}>{etiqueta}</Text>
      </View>
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  heroe: { borderRadius: 26, padding: 22, overflow: 'hidden', ...sombra },
  circuloDecorativo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -80,
    right: -60,
  },
  heroeEtiqueta: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500' },
  heroeMonto: { color: '#FFFFFF', fontSize: 38, fontWeight: '800', letterSpacing: -1, marginVertical: 4 },
  botonHeroe: {
    flex: 1.3,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
  },
  botonHeroeClaro: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    paddingVertical: 14,
  },
  botonHeroeTexto: { color: colores.primarioOscuro, fontSize: 16, fontWeight: '700' },
  consejoIcono: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reciente: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  producto: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  productoBorde: { borderTopWidth: 1, borderTopColor: colores.borde },
  productoNombre: { fontSize: 15, fontWeight: '600', color: colores.texto },
  botonRedondo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
    ...sombra,
  },
  exito: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colores.primarioSuave,
    padding: 14,
    borderRadius: 14,
  },
  marcoFoto: {
    height: 420,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  capaCarga: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15,23,42,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  burbujaCarga: {
    backgroundColor: colores.tarjeta,
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 26,
    alignItems: 'center',
    gap: 8,
  },
});
