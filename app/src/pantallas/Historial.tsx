import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';

import { AvatarTienda, Boton, Vacio } from '../componentes';
import { colores, comunes, sombra } from '../estilos';
import { formatoDinero, formatoFecha, nombreMes } from '../formato';
import { esEjemplo } from '../ejemplos';
import type { Ticket } from '../tipos';

type Props = {
  tickets: Ticket[];
  alAbrir: (ticket: Ticket) => void;
  alEscanear: () => void;
};

export default function Historial({ tickets, alAbrir, alEscanear }: Props) {
  const [busqueda, setBusqueda] = useState('');

  const secciones = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = q
      ? tickets.filter(
          (t) => t.tienda.toLowerCase().includes(q) || t.productos.some((p) => p.nombre.toLowerCase().includes(q)),
        )
      : tickets;
    const grupos = new Map<string, Ticket[]>();
    for (const t of filtrados) {
      const mes = t.fecha.slice(0, 7);
      grupos.set(mes, [...(grupos.get(mes) ?? []), t]);
    }
    return [...grupos.entries()].map(([mes, data]) => ({
      mes,
      total: data.reduce((s, t) => s + t.total, 0),
      data,
    }));
  }, [tickets, busqueda]);

  if (tickets.length === 0) {
    return (
      <View style={[comunes.pantalla, comunes.contenido]}>
        <Text style={comunes.titulo}>Mis tickets</Text>
        <Vacio
          icono="receipt-outline"
          titulo="Aún no hay tickets"
          texto="Escanea tu primer ticket y aquí verás todas tus compras organizadas por mes."
        />
        <Boton texto="Escanear ticket" icono="camera" onPress={alEscanear} />
      </View>
    );
  }

  return (
    <SectionList
      style={comunes.pantalla}
      contentContainerStyle={[comunes.contenido, { gap: 0 }]}
      sections={secciones}
      keyExtractor={(t) => t.id}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 14, marginBottom: 6 }}>
          <View>
            <Text style={comunes.titulo}>Mis tickets</Text>
            <Text style={comunes.subtitulo}>
              {tickets.length === 1 ? '1 ticket guardado' : `${tickets.length} tickets guardados`}
            </Text>
          </View>
          <View style={estilos.buscador}>
            <Ionicons name="search" size={18} color={colores.tenue} />
            <TextInput
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar tienda o producto"
              placeholderTextColor={colores.tenue}
              style={{ flex: 1, fontSize: 15, color: colores.texto, paddingVertical: 0 }}
            />
            {busqueda.length > 0 && (
              <Pressable onPress={() => setBusqueda('')} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={colores.tenue} />
              </Pressable>
            )}
          </View>
        </View>
      }
      ListEmptyComponent={
        <Vacio icono="search-outline" titulo="Sin resultados" texto={`No encontramos nada con “${busqueda}”.`} />
      }
      renderSectionHeader={({ section }) => (
        <View style={estilos.encabezadoMes}>
          <Text style={estilos.mes}>{nombreMes(section.mes)}</Text>
          <Text style={estilos.mesTotal}>{formatoDinero(section.total)}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => alAbrir(item)}
          style={({ pressed }) => [estilos.ticket, { opacity: pressed ? 0.85 : 1 }]}
        >
          <AvatarTienda nombre={item.tienda} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={estilos.tienda} numberOfLines={1}>
              {item.tienda}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={comunes.etiqueta}>
                {formatoFecha(item.fecha)} · {item.productos.length} productos
              </Text>
              {esEjemplo(item) && (
                <View style={estilos.chipEjemplo}>
                  <Text style={estilos.chipEjemploTexto}>Ejemplo</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={comunes.monto}>{formatoDinero(item.total)}</Text>
          <Ionicons name="chevron-forward" size={18} color={colores.tenue} />
        </Pressable>
      )}
    />
  );
}

const estilos = StyleSheet.create({
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colores.tarjeta,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...sombra,
  },
  encabezadoMes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 18,
    marginBottom: 10,
  },
  mes: { fontSize: 13, fontWeight: '800', color: colores.suave, textTransform: 'uppercase', letterSpacing: 0.8 },
  mesTotal: { fontSize: 13, fontWeight: '700', color: colores.suave },
  ticket: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colores.tarjeta,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    ...sombra,
  },
  tienda: { fontSize: 16, fontWeight: '700', color: colores.texto },
  chipEjemplo: { backgroundColor: '#EEF2FF', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
  chipEjemploTexto: { fontSize: 11, fontWeight: '700', color: colores.acento },
});
