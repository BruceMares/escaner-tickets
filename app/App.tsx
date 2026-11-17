import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { cargarTickets } from './src/almacen';
import { nombreDe, perfilDe, useSesion } from './src/cuenta';
import { colores, type NombreIcono } from './src/estilos';
import Bienvenida from './src/pantallas/Bienvenida';
import Detalle from './src/pantallas/Detalle';
import Escanear from './src/pantallas/Escanear';
import Gastos from './src/pantallas/Gastos';
import Graficas from './src/pantallas/Graficas';
import Historial from './src/pantallas/Historial';
import Perfil from './src/pantallas/Perfil';
import type { Session } from '@supabase/supabase-js';

import type { Pestana, Ticket } from './src/tipos';

const PESTANAS: { clave: Pestana; texto: string; icono: NombreIcono; iconoActivo: NombreIcono }[] = [
  { clave: 'escanear', texto: 'Inicio', icono: 'scan-outline', iconoActivo: 'scan' },
  { clave: 'historial', texto: 'Tickets', icono: 'receipt-outline', iconoActivo: 'receipt' },
  { clave: 'gastos', texto: 'Gastos', icono: 'wallet-outline', iconoActivo: 'wallet' },
  { clave: 'graficas', texto: 'Gráficas', icono: 'bar-chart-outline', iconoActivo: 'bar-chart' },
];

export default function App() {
  const sesion = useSesion();

  return (
    <SafeAreaProvider>
      <StatusBar style={sesion ? 'dark' : 'light'} />
      {sesion === undefined ? (
        <View style={[estilos.raiz, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={colores.primario} />
        </View>
      ) : sesion === null ? (
        <SafeAreaView style={[estilos.raiz, { backgroundColor: colores.primario }]} edges={['top']}>
          <View style={{ flex: 1, backgroundColor: colores.fondo }}>
            <Bienvenida />
          </View>
        </SafeAreaView>
      ) : (
        // "key" hace que todo se reinicie si cambia el usuario (cada quien ve solo lo suyo).
        <Principal key={sesion.user.id} sesion={sesion} />
      )}
    </SafeAreaProvider>
  );
}

function Principal({ sesion }: { sesion: Session }) {
  const nombre = nombreDe(sesion);
  const perfil = perfilDe(sesion);
  const [verPerfil, setVerPerfil] = useState(false);
  const [pestana, setPestana] = useState<Pestana>('escanear');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [abierto, setAbierto] = useState<Ticket | null>(null);

  const recargar = useCallback(async () => {
    try {
      setTickets(await cargarTickets());
    } catch (e) {
      Alert.alert('No se pudieron cargar tus tickets', e instanceof Error ? e.message : 'Inténtalo de nuevo.');
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // Botón "atrás" de Android: cierra el detalle en vez de salir de la app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (verPerfil) {
        setVerPerfil(false);
        return true;
      }
      if (abierto) {
        setAbierto(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [abierto, verPerfil]);

  let contenido;
  if (verPerfil) {
    contenido = (
      <Perfil perfil={perfil} usuarioId={sesion.user.id} tickets={tickets} alRegresar={() => setVerPerfil(false)} />
    );
  } else if (abierto) {
    contenido = (
      <Detalle
        ticket={abierto}
        alRegresar={() => setAbierto(null)}
        alBorrar={async () => {
          setAbierto(null);
          await recargar();
        }}
      />
    );
  } else if (pestana === 'escanear') {
    contenido = (
      <Escanear
        tickets={tickets}
        nombre={nombre}
        fotoUrl={perfil.fotoUrl}
        alAbrirCuenta={() => setVerPerfil(true)}
        alAbrir={setAbierto}
        alVerTodos={() => setPestana('historial')}
        alGuardar={async () => {
          await recargar();
          setPestana('historial');
        }}
      />
    );
  } else if (pestana === 'historial') {
    contenido = <Historial tickets={tickets} alAbrir={setAbierto} alEscanear={() => setPestana('escanear')} />;
  } else if (pestana === 'gastos') {
    contenido = <Gastos tickets={tickets} alEscanear={() => setPestana('escanear')} />;
  } else {
    contenido = <Graficas tickets={tickets} usuarioId={sesion.user.id} alCambiarDatos={recargar} />;
  }

  return (
    <>
      <SafeAreaView style={[estilos.raiz, verPerfil && { backgroundColor: colores.primario }]} edges={['top']}>
        <View style={{ flex: 1, backgroundColor: colores.fondo }}>{contenido}</View>
      </SafeAreaView>
      <SafeAreaView edges={['bottom']} style={estilos.barraContenedor}>
        <View style={estilos.barra}>
          {PESTANAS.map((p) => {
            const activa = !abierto && !verPerfil && pestana === p.clave;
            return (
              <Pressable
                key={p.clave}
                style={estilos.boton}
                onPress={() => {
                  setAbierto(null);
                  setVerPerfil(false);
                  setPestana(p.clave);
                }}
              >
                <View style={[estilos.pastilla, activa && estilos.pastillaActiva]}>
                  <Ionicons
                    name={activa ? p.iconoActivo : p.icono}
                    size={22}
                    color={activa ? colores.primario : colores.tenue}
                  />
                </View>
                <Text style={[estilos.texto, activa && estilos.textoActivo]}>{p.texto}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.fondo },
  barraContenedor: {
    backgroundColor: colores.tarjeta,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.borde,
  },
  barra: { flexDirection: 'row', paddingTop: 8, paddingBottom: 4 },
  boton: { flex: 1, alignItems: 'center', gap: 2 },
  pastilla: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 14 },
  pastillaActiva: { backgroundColor: colores.primarioSuave },
  texto: { fontSize: 12, color: colores.tenue, fontWeight: '600' },
  textoActivo: { color: colores.primario },
});
