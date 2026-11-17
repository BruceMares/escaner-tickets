import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { borrarPorPrefijo, guardarVarios } from '../almacen';
import { Boton, IconoCategoria, Insignia, Tarjeta, Vacio } from '../componentes';
import { esEjemplo, generarEjemplos, PREFIJO_EJEMPLO } from '../ejemplos';
import { categoriaInfo, colores, colorSerie, comunes, sombra } from '../estilos';
import { formatoDinero, hoy, nombreMes } from '../formato';
import {
  BarraSegmentada,
  BarrasApiladas,
  BarrasVerticales,
  LineaAcumulada,
  type Columna,
  type Parte,
  type Serie,
} from '../graficas';
import type { Ticket } from '../tipos';

type Props = { tickets: Ticket[]; usuarioId: string; alCambiarDatos: () => Promise<void> };

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const GRIS_OTROS = '#8a8f98';
const GRIS_ANTERIOR = '#94A3B8';

function claveMes(anio: number, mes0: number): string {
  const f = new Date(anio, mes0, 1);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
}
const mesCorto = (clave: string) => MESES_CORTOS[Number(clave.slice(5, 7)) - 1];
const mesAnterior = (clave: string) => claveMes(Number(clave.slice(0, 4)), Number(clave.slice(5, 7)) - 2);
const diasDe = (clave: string) => new Date(Number(clave.slice(0, 4)), Number(clave.slice(5, 7)), 0).getDate();
/** Mascotas se agrupa con Otros en las gráficas (comparten el color gris). */
const grupo = (categoria: string) => (categoria === 'Mascotas' ? 'Otros' : categoria);

export default function Graficas({ tickets, usuarioId, alCambiarDatos }: Props) {
  const hoyClave = hoy().slice(0, 7);
  const [anioHoy, mesHoy] = hoyClave.split('-').map(Number);
  const meses = useMemo(
    () => Array.from({ length: 6 }, (_, i) => claveMes(anioHoy, mesHoy - 1 - (5 - i))),
    [anioHoy, mesHoy],
  );
  const [mes, setMes] = useState(hoyClave);
  const [trabajando, setTrabajando] = useState<'cargar' | 'borrar' | null>(null);
  const hayEjemplos = tickets.some(esEjemplo);

  const datos = useMemo(() => {
    const totalPorMes = new Map<string, number>();
    const catPorMes = new Map<string, Map<string, number>>();
    const catTotal = new Map<string, number>();
    for (const t of tickets) {
      const m = t.fecha.slice(0, 7);
      totalPorMes.set(m, (totalPorMes.get(m) ?? 0) + t.total);
      const mapa = catPorMes.get(m) ?? new Map<string, number>();
      for (const p of t.productos) {
        if (p.precio <= 0) continue;
        const g = grupo(p.categoria);
        mapa.set(g, (mapa.get(g) ?? 0) + p.precio);
        if (meses.includes(m)) catTotal.set(g, (catTotal.get(g) ?? 0) + p.precio);
      }
      catPorMes.set(m, mapa);
    }

    // 1) Barras: gasto por mes (últimos 6 meses)
    const barrasMes = meses.map((m) => ({ clave: m, etiqueta: mesCorto(m), valor: totalPorMes.get(m) ?? 0 }));

    // 2) ¿En qué se gasta más este mes? (5 categorías principales + Otros)
    const delMes = [...(catPorMes.get(mes) ?? new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]);
    const principales = delMes.filter(([n]) => n !== 'Otros').slice(0, 5);
    const resto = delMes.filter(([n]) => !principales.some(([p]) => p === n)).reduce((s, [, v]) => s + v, 0);
    const partes: Parte[] = principales.map(([nombre, valor]) => ({
      nombre,
      valor,
      color: categoriaInfo(nombre).color,
      icono: <IconoCategoria categoria={nombre} tamano={30} />,
    }));
    if (resto > 0) partes.push({ nombre: 'Otros', valor: resto, color: GRIS_OTROS, icono: <IconoCategoria categoria="Otros" tamano={30} /> });

    // 3) Apiladas: categorías de cada mes (4 principales del periodo + Otros)
    const top = [...catTotal.entries()].filter(([n]) => n !== 'Otros').sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n]) => n);
    const series: Serie[] = [...top.map((n) => ({ nombre: n, color: categoriaInfo(n).color })), { nombre: 'Otros', color: GRIS_OTROS }];
    const columnas: Columna[] = meses.map((m) => {
      const mapa = catPorMes.get(m) ?? new Map<string, number>();
      const valores: Record<string, number> = {};
      for (const [n, v] of mapa) {
        const destino = top.includes(n) ? n : 'Otros';
        valores[destino] = (valores[destino] ?? 0) + v;
      }
      return { clave: m, etiqueta: mesCorto(m), valores };
    });

    // 4) Línea: gasto acumulado por día (mes elegido vs. mes anterior)
    const acumulado = (clave: string, hasta: number) => {
      const porDia = new Array(diasDe(clave)).fill(0);
      for (const t of tickets) if (t.fecha.startsWith(clave)) porDia[Number(t.fecha.slice(8, 10)) - 1] += t.total;
      let suma = 0;
      return porDia.slice(0, hasta).map((v) => (suma += v));
    };
    const dias = diasDe(mes);
    const hastaHoy = mes === hoyClave ? Number(hoy().slice(8, 10)) : dias;
    const anterior = mesAnterior(mes);

    // 5) Barras: gasto por semana del mes elegido
    const semanas = [0, 0, 0, 0, 0];
    for (const t of tickets) if (t.fecha.startsWith(mes)) semanas[Math.min(Math.floor((Number(t.fecha.slice(8, 10)) - 1) / 7), 4)] += t.total;
    const barrasSemana = semanas.map((v, i) => ({ clave: `s${i + 1}`, etiqueta: `Sem ${i + 1}`, valor: v }));
    const semanaMayor = barrasSemana.reduce((a, b) => (b.valor > a.valor ? b : a)).clave;

    const total = totalPorMes.get(mes) ?? 0;
    const totalAnterior = totalPorMes.get(anterior) ?? 0;
    const num = tickets.filter((t) => t.fecha.startsWith(mes)).length;
    return {
      barrasMes,
      partes,
      series,
      columnas,
      lineaActual: acumulado(mes, hastaHoy),
      lineaAnterior: acumulado(anterior, Math.min(diasDe(anterior), dias)),
      dias,
      anterior,
      barrasSemana,
      semanaMayor,
      total,
      totalAnterior,
      num,
      promedio: num > 0 ? total / num : 0,
      categoriaTop: partes[0]?.nombre,
    };
  }, [tickets, meses, mes, hoyClave]);

  async function cargarEjemplos() {
    setTrabajando('cargar');
    try {
      await guardarVarios(generarEjemplos(usuarioId));
      await alCambiarDatos();
      setMes(hoyClave);
    } catch (e) {
      Alert.alert('No se pudieron cargar los ejemplos', e instanceof Error ? e.message : 'Inténtalo de nuevo.');
    } finally {
      setTrabajando(null);
    }
  }

  function borrarEjemplos() {
    Alert.alert('Borrar ejemplos', 'Se borrarán solo los tickets de ejemplo. Tus tickets reales no se tocan.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          setTrabajando('borrar');
          try {
            await borrarPorPrefijo(PREFIJO_EJEMPLO);
            await alCambiarDatos();
          } catch (e) {
            Alert.alert('No se pudieron borrar', e instanceof Error ? e.message : 'Inténtalo de nuevo.');
          } finally {
            setTrabajando(null);
          }
        },
      },
    ]);
  }

  if (tickets.length === 0) {
    return (
      <ScrollView style={comunes.pantalla} contentContainerStyle={comunes.contenido}>
        <Text style={comunes.titulo}>Gráficas</Text>
        <Vacio
          icono="bar-chart-outline"
          titulo="Aún no hay datos para graficar"
          texto="Escanea tickets o carga datos de ejemplo para ver cómo se ven tus gráficas mes con mes."
        />
        <Boton texto="Cargar datos de ejemplo" icono="flask-outline" onPress={cargarEjemplos} cargando={trabajando === 'cargar'} />
      </ScrollView>
    );
  }

  const diferencia = datos.totalAnterior > 0 ? ((datos.total - datos.totalAnterior) / datos.totalAnterior) * 100 : null;

  return (
    <ScrollView style={comunes.pantalla} contentContainerStyle={comunes.contenido}>
      <View>
        <Text style={comunes.titulo}>Gráficas</Text>
        <Text style={comunes.subtitulo}>Toca un mes para ver su detalle</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[...meses].reverse().map((m) => (
          <Pressable key={m} onPress={() => setMes(m)} style={[estilos.chipMes, m === mes && estilos.chipMesActivo]}>
            <Text style={[estilos.chipMesTexto, m === mes && { color: '#FFFFFF' }]}>{nombreMes(m)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Resumen del mes */}
      <View style={estilos.resumen}>
        <Dato etiqueta="Total del mes" valor={formatoDinero(datos.total)} grande />
        <View style={estilos.divisorVertical} />
        <Dato etiqueta="Tickets" valor={String(datos.num)} />
        <View style={estilos.divisorVertical} />
        <Dato etiqueta="Promedio" valor={formatoDinero(datos.promedio)} />
      </View>
      {diferencia !== null && (
        <View style={[estilos.comparacion, { backgroundColor: diferencia > 0 ? colores.avisoSuave : colores.primarioSuave }]}>
          <Ionicons
            name={diferencia > 0 ? 'trending-up' : 'trending-down'}
            size={18}
            color={diferencia > 0 ? colores.aviso : colores.primarioOscuro}
          />
          <Text style={{ flex: 1, fontSize: 14, color: diferencia > 0 ? colores.aviso : colores.primarioOscuro }}>
            {diferencia > 0 ? 'Gastaste ' : 'Ahorraste '}
            <Text style={{ fontWeight: '800' }}>{Math.abs(diferencia).toFixed(0)}% {diferencia > 0 ? 'más' : 'menos'}</Text> que en{' '}
            {nombreMes(datos.anterior).toLowerCase()}
          </Text>
        </View>
      )}

      <Tarjeta>
        <Encabezado icono="bar-chart" titulo="Gasto por mes" detalle="Últimos 6 meses" />
        <BarrasVerticales datos={datos.barrasMes} seleccionado={mes} alTocar={setMes} />
      </Tarjeta>

      <Tarjeta>
        <Encabezado
          icono="pie-chart"
          titulo="¿En qué gastas más?"
          detalle={datos.categoriaTop ? `En ${nombreMes(mes).toLowerCase()} gastaste más en ${datos.categoriaTop}` : 'Sin gastos este mes'}
        />
        {datos.partes.length > 0 ? (
          <BarraSegmentada partes={datos.partes} />
        ) : (
          <Text style={comunes.etiqueta}>No hay tickets en {nombreMes(mes).toLowerCase()}.</Text>
        )}
      </Tarjeta>

      <Tarjeta>
        <Encabezado icono="layers" titulo="Categorías mes a mes" detalle="Cómo cambia tu gasto por categoría" />
        <BarrasApiladas columnas={datos.columnas} series={datos.series} seleccionado={mes} alTocar={setMes} />
      </Tarjeta>

      <Tarjeta>
        <Encabezado icono="trending-up" titulo="Gasto acumulado" detalle="Toca la gráfica para ver cada día" />
        <LineaAcumulada
          dias={datos.dias}
          series={[
            { nombre: nombreMes(mes), color: colorSerie, valores: datos.lineaActual },
            { nombre: nombreMes(datos.anterior), color: GRIS_ANTERIOR, valores: datos.lineaAnterior, punteada: true },
          ]}
        />
      </Tarjeta>

      <Tarjeta>
        <Encabezado icono="calendar" titulo="Gasto por semana" detalle={`Semanas de ${nombreMes(mes).toLowerCase()}`} />
        <BarrasVerticales datos={datos.barrasSemana} seleccionado={datos.semanaMayor} alto={170} />
      </Tarjeta>

      <Tarjeta estilo={estilos.tarjetaEjemplos}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Insignia icono="flask" color={colores.acento} tamano={42} />
          <View style={{ flex: 1 }}>
            <Text style={comunes.seccion}>Datos de ejemplo</Text>
            <Text style={comunes.etiqueta}>
              {hayEjemplos
                ? `${tickets.filter(esEjemplo).length} tickets de ejemplo cargados (6 meses)`
                : '6 meses de compras para probar las gráficas'}
            </Text>
          </View>
        </View>
        {hayEjemplos ? (
          <Boton texto="Borrar ejemplos" icono="trash-outline" variante="peligro" onPress={borrarEjemplos} cargando={trabajando === 'borrar'} />
        ) : (
          <Boton
            texto="Cargar datos de ejemplo"
            icono="flask-outline"
            onPress={cargarEjemplos}
            cargando={trabajando === 'cargar'}
            estilo={{ backgroundColor: colores.acento }}
          />
        )}
      </Tarjeta>
    </ScrollView>
  );
}

function Encabezado({ icono, titulo, detalle }: { icono: 'bar-chart' | 'pie-chart' | 'layers' | 'trending-up' | 'calendar'; titulo: string; detalle: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Insignia icono={icono} color={colores.primario} tamano={38} />
      <View style={{ flex: 1 }}>
        <Text style={comunes.seccion}>{titulo}</Text>
        <Text style={comunes.etiqueta}>{detalle}</Text>
      </View>
    </View>
  );
}

function Dato({ etiqueta, valor, grande }: { etiqueta: string; valor: string; grande?: boolean }) {
  return (
    <View style={{ flex: grande ? 1.3 : 1, alignItems: 'center', gap: 2 }}>
      <Text style={[estilos.datoValor, grande && { fontSize: 19, color: colores.primario }]} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      <Text style={comunes.etiqueta}>{etiqueta}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  chipMes: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  chipMesActivo: { backgroundColor: colores.primario, borderColor: colores.primario },
  chipMesTexto: { fontSize: 14, fontWeight: '600', color: colores.texto },
  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.tarjeta,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    ...sombra,
  },
  datoValor: { fontSize: 16, fontWeight: '800', color: colores.texto },
  divisorVertical: { width: 1, height: 36, backgroundColor: colores.borde },
  comparacion: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, marginTop: -4 },
  tarjetaEjemplos: { borderWidth: 1, borderColor: '#E0E7FF', backgroundColor: '#FAFAFF' },
});
