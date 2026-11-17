import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { borrarTicket } from '../almacen';
import { miniatura } from '../fotos';
import { AvatarTienda, Boton, IconoCategoria, Tarjeta } from '../componentes';
import { colores, comunes, sombra } from '../estilos';
import { formatoDinero, formatoFecha } from '../formato';
import type { Ticket } from '../tipos';

type Props = {
  ticket: Ticket;
  alRegresar: () => void;
  alBorrar: () => void;
};

export default function Detalle({ ticket, alRegresar, alBorrar }: Props) {
  const piezas = ticket.productos.reduce((s, p) => s + p.cantidad, 0);
  const [verFoto, setVerFoto] = useState(false);

  function confirmarBorrado() {
    Alert.alert('Borrar ticket', `¿Seguro que quieres borrar el ticket de ${ticket.tienda}? No se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await borrarTicket(ticket.id);
            alBorrar();
          } catch (e) {
            Alert.alert('No se pudo borrar', e instanceof Error ? e.message : 'Inténtalo de nuevo.');
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={comunes.pantalla} contentContainerStyle={comunes.contenido}>
      <View style={comunes.fila}>
        <Pressable onPress={alRegresar} hitSlop={12} style={estilos.botonRedondo}>
          <Ionicons name="chevron-back" size={22} color={colores.texto} />
        </Pressable>
        <Text style={comunes.seccion}>Detalle</Text>
        <Pressable onPress={confirmarBorrado} hitSlop={12} style={estilos.botonRedondo}>
          <Ionicons name="trash-outline" size={20} color={colores.peligro} />
        </Pressable>
      </View>

      <Tarjeta estilo={{ alignItems: 'center', paddingVertical: 24, gap: 6 }}>
        <AvatarTienda nombre={ticket.tienda} tamano={64} />
        <Text style={[comunes.seccion, { fontSize: 20, textAlign: 'center' }]}>{ticket.tienda}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="calendar-outline" size={14} color={colores.suave} />
          <Text style={comunes.etiqueta}>{formatoFecha(ticket.fecha)}</Text>
        </View>
        <Text style={estilos.total}>{formatoDinero(ticket.total)}</Text>
        <View style={estilos.chip}>
          <Text style={estilos.chipTexto}>
            {ticket.productos.length} productos · {piezas} piezas
          </Text>
        </View>
      </Tarjeta>

      {ticket.imagenUrl && (
        <Pressable onPress={() => setVerFoto(true)} style={estilos.foto}>
          <Image source={{ uri: miniatura(ticket.imagenUrl) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={estilos.fotoEtiqueta}>
            <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Ver foto del ticket</Text>
          </View>
        </Pressable>
      )}

      <Modal visible={verFoto} animationType="fade" transparent onRequestClose={() => setVerFoto(false)}>
        <View style={estilos.visor}>
          {ticket.imagenUrl && (
            <Image source={{ uri: miniatura(ticket.imagenUrl, 1600) }} style={{ flex: 1 }} resizeMode="contain" />
          )}
          <Pressable onPress={() => setVerFoto(false)} hitSlop={12} style={estilos.cerrarVisor}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>

      <Tarjeta estilo={{ gap: 0 }}>
        <Text style={[comunes.seccion, { marginBottom: 6 }]}>Productos</Text>
        {ticket.productos.map((p, i) => (
          <View key={`${p.nombre}-${i}`} style={[estilos.producto, i > 0 && estilos.borde]}>
            <IconoCategoria categoria={p.categoria} tamano={38} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colores.texto }} numberOfLines={2}>
                {p.nombre}
              </Text>
              <Text style={comunes.etiqueta}>
                {p.cantidad !== 1 ? `${p.cantidad} pzas · ` : ''}
                {p.categoria}
              </Text>
            </View>
            <Text style={comunes.monto}>{formatoDinero(p.precio)}</Text>
          </View>
        ))}
        <View style={[comunes.fila, estilos.borde, { paddingTop: 14, marginTop: 4 }]}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colores.texto }}>Total</Text>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colores.primario }}>{formatoDinero(ticket.total)}</Text>
        </View>
      </Tarjeta>

      <Boton texto="Borrar ticket" icono="trash-outline" variante="peligro" onPress={confirmarBorrado} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  botonRedondo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
    ...sombra,
  },
  total: { fontSize: 34, fontWeight: '800', color: colores.texto, letterSpacing: -1, marginTop: 6 },
  chip: { backgroundColor: colores.primarioSuave, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  chipTexto: { color: colores.primarioOscuro, fontSize: 13, fontWeight: '600' },
  producto: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  borde: { borderTopWidth: 1, borderTopColor: colores.borde },
  foto: { height: 180, borderRadius: 20, overflow: 'hidden', backgroundColor: '#E2E8F0', ...sombra },
  fotoEtiqueta: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  visor: { flex: 1, backgroundColor: '#000000', paddingTop: 60, paddingBottom: 30 },
  cerrarVisor: {
    position: 'absolute',
    top: 54,
    right: 18,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
