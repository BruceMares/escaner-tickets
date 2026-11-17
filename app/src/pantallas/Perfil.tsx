import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AvatarUsuario, Boton, Tarjeta } from '../componentes';
import { actualizarPerfil, cerrarSesion, type Perfil as DatosPerfil } from '../cuenta';
import { colores, comunes, degradado, sombra, type NombreIcono } from '../estilos';
import { formatoDinero, hoy } from '../formato';
import { hayCloudinary, subirFoto } from '../fotos';
import { elegirFoto, prepararImagen, type OrigenFoto } from '../imagen';
import type { Ticket } from '../tipos';

type Props = {
  perfil: DatosPerfil;
  usuarioId: string;
  tickets: Ticket[];
  alRegresar: () => void;
};

const LADAS = [
  { lada: '+52', bandera: '🇲🇽', pais: 'México' },
  { lada: '+1', bandera: '🇺🇸', pais: 'Estados Unidos' },
  { lada: '+34', bandera: '🇪🇸', pais: 'España' },
  { lada: '+57', bandera: '🇨🇴', pais: 'Colombia' },
  { lada: '+54', bandera: '🇦🇷', pais: 'Argentina' },
];
const banderaDe = (lada: string) => LADAS.find((l) => l.lada === lada)?.bandera ?? '🌎';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fechaLarga(iso: string): string {
  const f = new Date(iso);
  if (Number.isNaN(f.getTime())) return '—';
  return `${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}`;
}

/** Convierte lo que escribe el usuario en DD/MM/AAAA automáticamente. */
function mascaraFecha(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function fechaValida(texto: string): boolean {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!m) return false;
  const [d, mes, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(a, mes - 1, d);
  const valida = f.getFullYear() === a && f.getMonth() === mes - 1 && f.getDate() === d;
  return valida && a >= 1900 && f <= new Date();
}

function telefonoBonito(lada: string, tel: string): string {
  if (!tel) return '';
  const t = tel.length === 10 ? `${tel.slice(0, 3)} ${tel.slice(3, 6)} ${tel.slice(6)}` : tel;
  return `${lada} ${t}`;
}

export default function Perfil({ perfil, usuarioId, tickets, alRegresar }: Props) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return <EditarPerfil perfil={perfil} usuarioId={usuarioId} alTerminar={() => setEditando(false)} />;
  }

  const mes = hoy().slice(0, 7);
  const gastoTotal = tickets.reduce((s, t) => s + t.total, 0);
  const gastoMes = tickets.filter((t) => t.fecha.startsWith(mes)).reduce((s, t) => s + t.total, 0);
  const nombre = perfil.nombreCompleto || perfil.correo.split('@')[0];

  function confirmarSalida() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => cerrarSesion() },
    ]);
  }

  return (
    <ScrollView style={comunes.pantalla} contentContainerStyle={[comunes.contenido, { paddingTop: 0, paddingHorizontal: 0 }]}>
      <LinearGradient colors={degradado} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={estilos.heroe}>
        <View style={estilos.circulo1} />
        <View style={estilos.circulo2} />
        <View style={estilos.barraSuperior}>
          <Pressable onPress={alRegresar} hitSlop={12} style={estilos.botonCristal}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={estilos.tituloBarra}>Mi perfil</Text>
          <Pressable onPress={() => setEditando(true)} hitSlop={12} style={estilos.botonCristal}>
            <Ionicons name="create-outline" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <Pressable onPress={() => setEditando(true)} style={estilos.marcoAvatar}>
          <AvatarUsuario nombre={nombre} url={perfil.fotoUrl} tamano={108} />
        </Pressable>
        <Text style={estilos.nombre}>{nombre}</Text>
        <Text style={estilos.correo}>{perfil.correo}</Text>
        <View style={estilos.chipEstado}>
          <Ionicons name={perfil.verificado ? 'shield-checkmark' : 'shield-outline'} size={14} color="#FFFFFF" />
          <Text style={estilos.chipTexto}>{perfil.verificado ? 'Cuenta verificada' : 'Cuenta no verificada'}</Text>
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 20, gap: 16, marginTop: -34 }}>
        <View style={estilos.estadisticas}>
          <Estadistica icono="receipt-outline" valor={String(tickets.length)} etiqueta="Tickets" />
          <View style={estilos.divisorVertical} />
          <Estadistica icono="wallet-outline" valor={formatoDinero(gastoTotal)} etiqueta="Gasto total" />
          <View style={estilos.divisorVertical} />
          <Estadistica icono="calendar-outline" valor={formatoDinero(gastoMes)} etiqueta="Este mes" />
        </View>

        <Tarjeta estilo={{ gap: 0 }}>
          <Text style={[comunes.seccion, { marginBottom: 4 }]}>Información</Text>
          <Renglon icono="person-outline" etiqueta="Nombre" valor={perfil.nombreCompleto} />
          <Renglon icono="mail-outline" etiqueta="Correo" valor={perfil.correo} />
          <Renglon icono="gift-outline" etiqueta="Fecha de nacimiento" valor={perfil.fechaNacimiento} />
          <Renglon
            icono="call-outline"
            etiqueta="Teléfono"
            valor={perfil.telefono ? `${banderaDe(perfil.lada)} ${telefonoBonito(perfil.lada, perfil.telefono)}` : ''}
          />
          <Renglon icono="time-outline" etiqueta="Miembro desde" valor={fechaLarga(perfil.miembroDesde)} />
          <Renglon
            icono={perfil.metodo === 'google' ? 'logo-google' : 'key-outline'}
            etiqueta="Inicio de sesión"
            valor={perfil.metodo === 'google' ? 'Google' : 'Correo y contraseña'}
          />
        </Tarjeta>

        <Boton texto="Editar perfil" icono="create-outline" onPress={() => setEditando(true)} />
        <Boton texto="Cerrar sesión" icono="log-out-outline" variante="peligro" onPress={confirmarSalida} />
      </View>
    </ScrollView>
  );
}

function Estadistica({ icono, valor, etiqueta }: { icono: NombreIcono; valor: string; etiqueta: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <Ionicons name={icono} size={18} color={colores.primario} />
      <Text style={estilos.estadisticaValor} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      <Text style={comunes.etiqueta}>{etiqueta}</Text>
    </View>
  );
}

function Renglon({ icono, etiqueta, valor }: { icono: NombreIcono; etiqueta: string; valor: string }) {
  return (
    <View style={estilos.renglon}>
      <View style={estilos.renglonIcono}>
        <Ionicons name={icono} size={17} color={colores.primario} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={comunes.etiqueta}>{etiqueta}</Text>
        <Text style={[estilos.renglonValor, !valor && { color: colores.tenue }]} numberOfLines={1}>
          {valor || 'Sin agregar'}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Editar perfil
// ---------------------------------------------------------------------------

function EditarPerfil({ perfil, usuarioId, alTerminar }: { perfil: DatosPerfil; usuarioId: string; alTerminar: () => void }) {
  const [nombre, setNombre] = useState(perfil.nombreCompleto);
  const [fecha, setFecha] = useState(perfil.fechaNacimiento);
  const [lada, setLada] = useState(perfil.lada || '+52');
  const [telefono, setTelefono] = useState(perfil.telefono);
  const [fotoUrl, setFotoUrl] = useState<string | null>(perfil.fotoUrl);
  const [fotoLocal, setFotoLocal] = useState<string | null>(null);
  const [hojaFoto, setHojaFoto] = useState(false);
  const [hojaLada, setHojaLada] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function tomarFoto(origen: OrigenFoto) {
    setHojaFoto(false);
    try {
      const uri = await elegirFoto(origen, { cuadrada: true });
      if (uri) setFotoLocal(uri);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir la cámara.');
    }
  }

  function quitarFoto() {
    setHojaFoto(false);
    setFotoLocal(null);
    setFotoUrl(null);
  }

  async function guardar() {
    setError(null);
    if (!nombre.trim()) return setError('Escribe tu nombre completo.');
    if (fecha && !fechaValida(fecha)) return setError('La fecha de nacimiento debe ser real y como DD/MM/AAAA.');
    if (telefono && telefono.length < 8) return setError('El teléfono debe tener al menos 8 dígitos.');

    setGuardando(true);
    try {
      let urlFinal = fotoUrl;
      if (fotoLocal) {
        if (!hayCloudinary) throw new Error('Cloudinary no está configurado; no se puede subir la foto.');
        const base64 = await prepararImagen(fotoLocal, 600);
        urlFinal = await subirFoto(base64, `perfiles/${usuarioId}`);
      }
      await actualizarPerfil({ nombreCompleto: nombre, fechaNacimiento: fecha, lada, telefono, fotoUrl: urlFinal });
      alTerminar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  const fotoMostrada = fotoLocal ?? fotoUrl;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={comunes.pantalla} contentContainerStyle={comunes.contenido} keyboardShouldPersistTaps="handled">
        <View style={comunes.fila}>
          <Pressable onPress={alTerminar} hitSlop={12} style={estilos.botonRedondo}>
            <Ionicons name="close" size={22} color={colores.texto} />
          </Pressable>
          <Text style={comunes.seccion}>Editar perfil</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ alignItems: 'center', gap: 10, marginVertical: 6 }}>
          <Pressable onPress={() => setHojaFoto(true)}>
            {fotoMostrada ? (
              <Image source={{ uri: fotoMostrada }} style={estilos.fotoGrande} />
            ) : (
              <AvatarUsuario nombre={nombre || perfil.correo} tamano={120} />
            )}
            <View style={estilos.insigniaCamara}>
              <Ionicons name="camera" size={18} color="#FFFFFF" />
            </View>
          </Pressable>
          <Pressable onPress={() => setHojaFoto(true)} hitSlop={8}>
            <Text style={{ color: colores.primario, fontWeight: '700' }}>Cambiar foto</Text>
          </Pressable>
        </View>

        <Tarjeta>
          <Campo etiqueta="Nombre completo" icono="person-outline">
            <TextInput
              style={estilos.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Tu nombre y apellidos"
              placeholderTextColor={colores.tenue}
              autoCapitalize="words"
            />
          </Campo>

          <Campo etiqueta="Fecha de nacimiento" icono="gift-outline">
            <TextInput
              style={estilos.input}
              value={fecha}
              onChangeText={(t) => setFecha(mascaraFecha(t))}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={colores.tenue}
              keyboardType="number-pad"
              maxLength={10}
            />
          </Campo>

          <Campo etiqueta="Teléfono" icono="call-outline">
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setHojaLada(true)} style={estilos.selectorLada}>
                <Text style={{ fontSize: 18 }}>{banderaDe(lada)}</Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colores.texto }}>{lada}</Text>
                <Ionicons name="chevron-down" size={14} color={colores.suave} />
              </Pressable>
              <TextInput
                style={[estilos.input, { flex: 1 }]}
                value={telefono}
                onChangeText={(t) => setTelefono(t.replace(/\D/g, '').slice(0, 12))}
                placeholder="10 dígitos"
                placeholderTextColor={colores.tenue}
                keyboardType="phone-pad"
              />
            </View>
          </Campo>

          <Campo etiqueta="Correo (no se puede cambiar)" icono="mail-outline">
            <View style={[estilos.input, { backgroundColor: '#F1F5F9', justifyContent: 'center' }]}>
              <Text style={{ fontSize: 16, color: colores.suave }} numberOfLines={1}>
                {perfil.correo}
              </Text>
            </View>
          </Campo>
        </Tarjeta>

        {error && (
          <View style={estilos.error}>
            <Ionicons name="alert-circle" size={20} color={colores.peligro} />
            <Text style={{ flex: 1, color: colores.peligro, fontSize: 14 }}>{error}</Text>
          </View>
        )}

        <Boton texto="Guardar cambios" icono="checkmark" onPress={guardar} cargando={guardando} />
        <Boton texto="Cancelar" variante="secundario" onPress={alTerminar} />
      </ScrollView>

      <HojaOpciones visible={hojaFoto} titulo="Foto de perfil" alCerrar={() => setHojaFoto(false)}>
        <OpcionHoja icono="camera-outline" texto="Tomar foto" onPress={() => tomarFoto('camara')} />
        <OpcionHoja icono="images-outline" texto="Elegir de la galería" onPress={() => tomarFoto('galeria')} />
        {fotoMostrada && <OpcionHoja icono="trash-outline" texto="Quitar foto" peligro onPress={quitarFoto} />}
      </HojaOpciones>

      <HojaOpciones visible={hojaLada} titulo="Código de país" alCerrar={() => setHojaLada(false)}>
        {LADAS.map((l) => (
          <OpcionHoja
            key={l.lada}
            emoji={l.bandera}
            texto={`${l.pais} (${l.lada})`}
            seleccionada={l.lada === lada}
            onPress={() => {
              setLada(l.lada);
              setHojaLada(false);
            }}
          />
        ))}
      </HojaOpciones>

      {guardando && fotoLocal && (
        <View style={estilos.capaSubiendo}>
          <View style={estilos.burbuja}>
            <ActivityIndicator color={colores.primario} />
            <Text style={comunes.etiqueta}>Subiendo foto…</Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function Campo({ etiqueta, icono, children }: { etiqueta: string; icono: NombreIcono; children: ReactNode }) {
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

/** Menú que sube desde abajo (funciona igual en iPhone y Android). */
function HojaOpciones({
  visible,
  titulo,
  alCerrar,
  children,
}: {
  visible: boolean;
  titulo: string;
  alCerrar: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={alCerrar}>
      <Pressable style={estilos.fondoHoja} onPress={alCerrar} />
      <View style={estilos.hoja}>
        <View style={estilos.agarradera} />
        <Text style={[comunes.seccion, { marginBottom: 6 }]}>{titulo}</Text>
        {children}
        <Pressable onPress={alCerrar} style={estilos.cancelarHoja}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colores.suave }}>Cancelar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function OpcionHoja({
  icono,
  emoji,
  texto,
  onPress,
  peligro,
  seleccionada,
}: {
  icono?: NombreIcono;
  emoji?: string;
  texto: string;
  onPress: () => void;
  peligro?: boolean;
  seleccionada?: boolean;
}) {
  const color = peligro ? colores.peligro : colores.texto;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [estilos.opcionHoja, pressed && { backgroundColor: '#F1F5F9' }]}>
      <View style={[estilos.iconoOpcion, peligro && { backgroundColor: colores.peligroSuave }]}>
        {emoji ? (
          <Text style={{ fontSize: 20 }}>{emoji}</Text>
        ) : (
          <Ionicons name={icono ?? 'ellipse'} size={20} color={peligro ? colores.peligro : colores.primario} />
        )}
      </View>
      <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color }}>{texto}</Text>
      {seleccionada && <Ionicons name="checkmark-circle" size={22} color={colores.primario} />}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  heroe: { paddingTop: 12, paddingBottom: 56, paddingHorizontal: 20, alignItems: 'center', overflow: 'hidden' },
  circulo1: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -100,
    right: -70,
  },
  circulo2: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -60,
    left: -50,
  },
  barraSuperior: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginBottom: 14 },
  tituloBarra: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  botonCristal: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcoAvatar: { padding: 4, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.35)' },
  nombre: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  correo: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 2 },
  chipEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipTexto: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  estadisticas: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.tarjeta,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    ...sombra,
  },
  estadisticaValor: { fontSize: 16, fontWeight: '800', color: colores.texto },
  divisorVertical: { width: 1, height: 40, backgroundColor: colores.borde },
  renglon: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: colores.borde },
  renglonIcono: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renglonValor: { fontSize: 15, fontWeight: '600', color: colores.texto, marginTop: 1 },
  botonRedondo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
    ...sombra,
  },
  fotoGrande: { width: 120, height: 120, borderRadius: 60, backgroundColor: colores.borde },
  insigniaCamara: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colores.primario,
    borderWidth: 3,
    borderColor: colores.fondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colores.texto,
    backgroundColor: '#FAFBFD',
    minHeight: 50,
  },
  selectorLada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: '#FAFBFD',
    minHeight: 50,
  },
  error: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, backgroundColor: colores.peligroSuave },
  fondoHoja: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)' },
  hoja: {
    backgroundColor: colores.tarjeta,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
    gap: 4,
  },
  agarradera: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colores.borde, marginBottom: 10 },
  opcionHoja: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 14 },
  iconoOpcion: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelarHoja: { alignItems: 'center', paddingVertical: 14, marginTop: 6, borderRadius: 14, backgroundColor: '#F1F5F9' },
  capaSubiendo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15,23,42,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  burbuja: { backgroundColor: colores.tarjeta, borderRadius: 18, padding: 20, alignItems: 'center', gap: 8, ...sombra },
});
