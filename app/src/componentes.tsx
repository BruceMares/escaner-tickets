// Piezas de interfaz reutilizables en todas las pantallas.
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { categoriaInfo, colores, colorTienda, comunes, conAlfa, type NombreIcono } from './estilos';

type BotonProps = {
  texto: string;
  onPress: () => void;
  icono?: NombreIcono;
  variante?: 'primario' | 'secundario' | 'peligro' | 'claro';
  cargando?: boolean;
  estilo?: StyleProp<ViewStyle>;
};

export function Boton({ texto, onPress, icono, variante = 'primario', cargando, estilo }: BotonProps) {
  const v = VARIANTES[variante];
  return (
    <Pressable
      onPress={onPress}
      disabled={cargando}
      style={({ pressed }) => [
        estilos.boton,
        { backgroundColor: v.fondo, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={v.texto} />
      ) : (
        <>
          {icono && <Ionicons name={icono} size={20} color={v.texto} />}
          <Text style={[estilos.botonTexto, { color: v.texto }]}>{texto}</Text>
        </>
      )}
    </Pressable>
  );
}

const VARIANTES = {
  primario: { fondo: colores.primario, texto: '#FFFFFF' },
  secundario: { fondo: colores.primarioSuave, texto: colores.primarioOscuro },
  peligro: { fondo: colores.peligroSuave, texto: colores.peligro },
  claro: { fondo: 'rgba(255,255,255,0.18)', texto: '#FFFFFF' },
};

export function Tarjeta({ children, estilo }: { children: ReactNode; estilo?: StyleProp<ViewStyle> }) {
  return <View style={[comunes.tarjeta, estilo]}>{children}</View>;
}

/** Círculo de color con un ícono dentro. */
export function Insignia({ icono, color, tamano = 40 }: { icono: NombreIcono; color: string; tamano?: number }) {
  return (
    <View
      style={{
        width: tamano,
        height: tamano,
        borderRadius: tamano / 2.6,
        backgroundColor: conAlfa(color, 0.12),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icono} size={tamano * 0.5} color={color} />
    </View>
  );
}

export function IconoCategoria({ categoria, tamano }: { categoria: string; tamano?: number }) {
  const info = categoriaInfo(categoria);
  return <Insignia icono={info.icono} color={info.color} tamano={tamano} />;
}

/** Avatar con la inicial de la tienda. */
export function AvatarTienda({ nombre, tamano = 46 }: { nombre: string; tamano?: number }) {
  const color = colorTienda(nombre);
  return (
    <View
      style={{
        width: tamano,
        height: tamano,
        borderRadius: tamano / 2.6,
        backgroundColor: conAlfa(color, 0.14),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontSize: tamano * 0.42, fontWeight: '800' }}>
        {nombre.trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

/** Foto de perfil redonda; si no hay foto, muestra la inicial. */
export function AvatarUsuario({ nombre, url, tamano = 44 }: { nombre: string; url?: string | null; tamano?: number }) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: tamano, height: tamano, borderRadius: tamano / 2, backgroundColor: colores.borde }}
      />
    );
  }
  return (
    <View
      style={{
        width: tamano,
        height: tamano,
        borderRadius: tamano / 2,
        backgroundColor: colores.primarioSuave,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colores.primarioOscuro, fontSize: tamano * 0.4, fontWeight: '800' }}>
        {nombre.trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

/** Mensaje amigable para listas vacías. */
export function Vacio({ icono, titulo, texto }: { icono: NombreIcono; titulo: string; texto: string }) {
  return (
    <View style={estilos.vacio}>
      <Insignia icono={icono} color={colores.primario} tamano={72} />
      <Text style={[comunes.seccion, { textAlign: 'center' }]}>{titulo}</Text>
      <Text style={[comunes.subtitulo, { textAlign: 'center' }]}>{texto}</Text>
    </View>
  );
}

/** Aviso de color (error o advertencia). */
export function Aviso({ tipo, texto }: { tipo: 'error' | 'aviso'; texto: string }) {
  const esError = tipo === 'error';
  const color = esError ? colores.peligro : colores.aviso;
  return (
    <View style={[estilos.aviso, { backgroundColor: esError ? colores.peligroSuave : colores.avisoSuave }]}>
      <Ionicons name={esError ? 'alert-circle' : 'information-circle'} size={20} color={color} />
      <Text style={{ flex: 1, color, fontSize: 14, lineHeight: 20 }}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 18,
    minHeight: 52,
  },
  botonTexto: { fontSize: 16, fontWeight: '700' },
  vacio: { alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 24 },
  aviso: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, alignItems: 'flex-start' },
});
