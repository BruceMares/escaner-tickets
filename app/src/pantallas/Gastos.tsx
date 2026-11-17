import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AvatarTienda, Aviso, Boton, IconoCategoria, Insignia, Tarjeta, Vacio } from '../componentes';
import { categoriaInfo, colores, comunes, degradado, sombra } from '../estilos';
import { formatoDinero, nombreMes } from '../formato';
import { pedirConsejos } from '../ia';
import type { Ticket } from '../tipos';

type Props = { tickets: Ticket[]; alEscanear: () => void };

type Renglon = { nombre: string; monto: number };

function ordenar(mapa: Map<string, number>): Renglon[] {
  return [...mapa.entries()].map(([nombre, monto]) => ({ nombre, monto })).sort((a, b) => b.monto - a.monto);
}

function mesAnterior(clave: string): string {
  const [a, m] = clave.split('-').map(Number);
  const fecha = new Date(a, m - 2, 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

export default function Gastos({ tickets, alEscanear }: Props) {
  const meses = useMemo(
    () => [...new Set(tickets.map((t) => t.fecha.slice(0, 7)))].sort().reverse(),
    [tickets],
  );
  const [indiceMes, setIndiceMes] = useState(0);
  const [consejos, setConsejos] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mes = meses[Math.min(indiceMes, Math.max(meses.length - 1, 0))];

  function cambiarMes(paso: number) {
    setIndiceMes((i) => i + paso);
    setConsejos(null);
    setError(null);
  }

  const resumen = useMemo(() => {
    const delMes = tickets.filter((t) => t.fecha.startsWith(mes ?? ''));
    const anterior = mes ? mesAnterior(mes) : '';
    const totalAnterior = tickets.filter((t) => t.fecha.startsWith(anterior)).reduce((s, t) => s + t.total, 0);
    const cat = new Map<string, number>();
    const prod = new Map<string, number>();
    const tien = new Map<string, number>();
    for (const t of delMes) {
      tien.set(t.tienda, (tien.get(t.tienda) ?? 0) + t.total);
      for (const p of t.productos) {
        cat.set(p.categoria, (cat.get(p.categoria) ?? 0) + p.precio);
        const clave = p.nombre.toLowerCase();
        prod.set(clave, (prod.get(clave) ?? 0) + p.precio);
      }
    }
    const porCategoria = ordenar(cat).filter((r) => r.monto > 0);
    return {
      totalMes: delMes.reduce((s, t) => s + t.total, 0),
      totalAnterior,
      porCategoria,
      sumaCategorias: porCategoria.reduce((s, c) => s + c.monto, 0),
      porProducto: ordenar(prod).filter((r) => r.monto > 0).slice(0, 5),
      porTienda: ordenar(tien).slice(0, 5),
      numTickets: delMes.length,
    };
  }, [tickets, mes]);

  async function generarConsejos() {
    if (!mes) return;
    setCargando(true);
    setError(null);
    // Solo se manda el resumen (montos por categoría y productos principales), nunca las fotos.
    const texto = [
      `Mes: ${nombreMes(mes)}. Total gastado: ${resumen.totalMes.toFixed(2)} MXN en ${resumen.numTickets} tickets.`,
      'Gasto por categoría:',
      ...resumen.porCategoria.map((c) => `- ${c.nombre}: ${c.monto.toFixed(2)} MXN`),
      'Productos con más gasto:',
      ...resumen.porProducto.map((p) => `- ${p.nombre}: ${p.monto.toFixed(2)} MXN`),
    ].join('\n');
    try {
      setConsejos(await pedirConsejos(texto));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron generar consejos.');
    } finally {
      setCargando(false);
    }
  }

  if (!mes) {
    return (
      <View style={[comunes.pantalla, comunes.contenido]}>
        <Text style={comunes.titulo}>Mis gastos</Text>
        <Vacio
          icono="pie-chart-outline"
          titulo="Todavía no hay datos"
          texto="Escanea tu primer ticket para descubrir en qué gastas más cada mes."
        />
        <Boton texto="Escanear ticket" icono="camera" onPress={alEscanear} />
      </View>
    );
  }

  const { totalMes, totalAnterior, porCategoria, sumaCategorias, porProducto, porTienda, numTickets } = resumen;
  const diferencia = totalAnterior > 0 ? ((totalMes - totalAnterior) / totalAnterior) * 100 : null;
  const hayAnterior = indiceMes < meses.length - 1;
  const haySiguiente = indiceMes > 0;

  return (
    <ScrollView style={comunes.pantalla} contentContainerStyle={comunes.contenido}>
      <Text style={comunes.titulo}>Mis gastos</Text>

      <LinearGradient colors={degradado} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={estilos.heroe}>
        <View style={estilos.circuloDecorativo} />
        <View style={comunes.fila}>
          <Pressable disabled={!hayAnterior} onPress={() => cambiarMes(1)} hitSlop={12} style={estilos.flecha}>
            <Ionicons name="chevron-back" size={20} color={hayAnterior ? '#FFFFFF' : 'rgba(255,255,255,0.3)'} />
          </Pressable>
          <Text style={estilos.mes}>{nombreMes(mes)}</Text>
          <Pressable disabled={!haySiguiente} onPress={() => cambiarMes(-1)} hitSlop={12} style={estilos.flecha}>
            <Ionicons name="chevron-forward" size={20} color={haySiguiente ? '#FFFFFF' : 'rgba(255,255,255,0.3)'} />
          </Pressable>
        </View>
        <Text style={estilos.monto}>{formatoDinero(totalMes)}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <View style={estilos.chip}>
            <Ionicons name="receipt-outline" size={13} color="#FFFFFF" />
            <Text style={estilos.chipTexto}>{numTickets} tickets</Text>
          </View>
          {diferencia !== null && (
            <View style={estilos.chip}>
              <Ionicons name={diferencia > 0 ? 'trending-up' : 'trending-down'} size={13} color="#FFFFFF" />
              <Text style={estilos.chipTexto}>
                {diferencia > 0 ? '+' : ''}
                {diferencia.toFixed(0)}% vs mes anterior
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <Tarjeta>
        <Text style={comunes.seccion}>¿En qué gastas más?</Text>
        {/* Barra apilada con todas las categorías */}
        <View style={estilos.barraApilada}>
          {porCategoria.map((c) => (
            <View
              key={c.nombre}
              style={{ flex: c.monto / (sumaCategorias || 1), backgroundColor: categoriaInfo(c.nombre).color }}
            />
          ))}
        </View>
        {porCategoria.map((c) => {
          const porcentaje = sumaCategorias > 0 ? (c.monto / sumaCategorias) * 100 : 0;
          return (
            <View key={c.nombre} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconoCategoria categoria={c.nombre} tamano={38} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={comunes.fila}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colores.texto }}>{c.nombre}</Text>
                  <Text style={comunes.monto}>{formatoDinero(c.monto)}</Text>
                </View>
                <View style={estilos.barraFondo}>
                  <View
                    style={[
                      estilos.barra,
                      { width: `${Math.max(3, porcentaje)}%`, backgroundColor: categoriaInfo(c.nombre).color },
                    ]}
                  />
                </View>
              </View>
              <Text style={estilos.porcentaje}>{porcentaje.toFixed(0)}%</Text>
            </View>
          );
        })}
      </Tarjeta>

      <Tarjeta estilo={estilos.tarjetaConsejos}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Insignia icono="sparkles" color={colores.acento} tamano={42} />
          <View style={{ flex: 1 }}>
            <Text style={comunes.seccion}>Consejos de ahorro</Text>
            <Text style={comunes.etiqueta}>Generados con IA a partir de tu mes</Text>
          </View>
        </View>
        {consejos ? (
          <Text style={{ fontSize: 15, lineHeight: 23, color: colores.texto }}>{consejos}</Text>
        ) : cargando ? (
          <View style={{ alignItems: 'center', paddingVertical: 8, gap: 6 }}>
            <ActivityIndicator color={colores.acento} />
            <Text style={comunes.etiqueta}>Analizando tus gastos…</Text>
          </View>
        ) : (
          <Boton texto="Darme consejos" icono="sparkles" onPress={generarConsejos} estilo={{ backgroundColor: colores.acento }} />
        )}
        {error && <Aviso tipo="error" texto={error} />}
      </Tarjeta>

      <Tarjeta estilo={{ gap: 0 }}>
        <Text style={[comunes.seccion, { marginBottom: 6 }]}>Productos con más gasto</Text>
        {porProducto.map((p, i) => (
          <View key={p.nombre} style={[estilos.renglon, i > 0 && estilos.borde]}>
            <View style={estilos.lugar}>
              <Text style={estilos.lugarTexto}>{i + 1}</Text>
            </View>
            <Text style={{ fontSize: 15, flex: 1, color: colores.texto, textTransform: 'capitalize' }} numberOfLines={1}>
              {p.nombre}
            </Text>
            <Text style={comunes.monto}>{formatoDinero(p.monto)}</Text>
          </View>
        ))}
      </Tarjeta>

      <Tarjeta estilo={{ gap: 0 }}>
        <Text style={[comunes.seccion, { marginBottom: 6 }]}>Tiendas</Text>
        {porTienda.map((t, i) => (
          <View key={t.nombre} style={[estilos.renglon, i > 0 && estilos.borde]}>
            <AvatarTienda nombre={t.nombre} tamano={36} />
            <Text style={{ fontSize: 15, flex: 1, color: colores.texto }} numberOfLines={1}>
              {t.nombre}
            </Text>
            <Text style={comunes.monto}>{formatoDinero(t.monto)}</Text>
          </View>
        ))}
      </Tarjeta>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  heroe: { borderRadius: 26, padding: 20, gap: 6, overflow: 'hidden', ...sombra },
  circuloDecorativo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -90,
    left: -50,
  },
  flecha: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mes: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  monto: { color: '#FFFFFF', fontSize: 40, fontWeight: '800', letterSpacing: -1, textAlign: 'center', marginVertical: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  chipTexto: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  barraApilada: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2, marginBottom: 4 },
  barraFondo: { height: 6, borderRadius: 3, backgroundColor: '#EEF2F7', overflow: 'hidden' },
  barra: { height: 6, borderRadius: 3 },
  porcentaje: { width: 38, textAlign: 'right', fontSize: 13, fontWeight: '700', color: colores.suave },
  tarjetaConsejos: { borderWidth: 1, borderColor: '#E0E7FF', backgroundColor: '#FAFAFF' },
  renglon: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  borde: { borderTopWidth: 1, borderTopColor: colores.borde },
  lugar: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lugarTexto: { color: colores.primarioOscuro, fontWeight: '800', fontSize: 13 },
});
