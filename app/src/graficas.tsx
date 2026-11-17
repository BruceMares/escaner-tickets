// Gráficas dibujadas con SVG (react-native-svg viene incluido en Expo Go).
// Reglas de diseño: marcas delgadas, esquinas de 4px solo en el extremo de datos, 2px de separación
// entre segmentos, cuadrícula tenue, leyenda cuando hay 2+ series y montos escritos (no solo color).
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { colores, colorSerie, colorSerieSuave } from './estilos';
import { formatoDinero } from './formato';

const TINTA_SUAVE = '#64748B';
const CUADRICULA = '#E8ECF3';

/** $1,234 -> "$1.2k" para los ejes. */
export function dineroCorto(valor: number): string {
  if (valor >= 1000) return `$${(valor / 1000).toFixed(valor >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(valor)}`;
}

/** Máximo "bonito" para el eje (redondea hacia arriba a 1, 2, 2.5, 5 o 10 × potencia de 10). */
function maximoBonito(valor: number): number {
  if (valor <= 0) return 100;
  const potencia = 10 ** Math.floor(Math.log10(valor));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * potencia >= valor) return m * potencia;
  return 10 * potencia;
}

/** Rectángulo con esquinas redondeadas solo arriba (anclado a la base). */
function barraRedondeadaArriba(x: number, arriba: number, ancho: number, base: number, radio = 4): string {
  const alto = base - arriba;
  if (alto <= 0) return '';
  const r = Math.min(radio, ancho / 2, alto);
  return `M${x},${base} V${arriba + r} Q${x},${arriba} ${x + r},${arriba} H${x + ancho - r} Q${x + ancho},${arriba} ${x + ancho},${arriba + r} V${base} Z`;
}

function useAncho(): [number, (e: LayoutChangeEvent) => void] {
  const [ancho, setAncho] = useState(0);
  return [ancho, (e) => setAncho(Math.round(e.nativeEvent.layout.width))];
}

// ---------------------------------------------------------------------------
// Barras verticales (una serie): gasto por mes / por semana
// ---------------------------------------------------------------------------

export type Punto = { clave: string; etiqueta: string; valor: number };

export function BarrasVerticales({
  datos,
  seleccionado,
  alTocar,
  alto = 190,
}: {
  datos: Punto[];
  seleccionado?: string;
  alTocar?: (clave: string) => void;
  alto?: number;
}) {
  const [ancho, alMedir] = useAncho();
  const ejeIzq = 44;
  const abajo = 24;
  const arriba = 22;
  const base = alto - abajo;
  const maximo = maximoBonito(Math.max(...datos.map((d) => d.valor), 0));
  const anchoZona = Math.max(ancho - ejeIzq, 0);
  const paso = datos.length > 0 ? anchoZona / datos.length : 0;
  const anchoBarra = Math.min(36, paso * 0.56);
  const y = (v: number) => base - (v / maximo) * (base - arriba);

  return (
    <View onLayout={alMedir} style={{ height: alto }}>
      {ancho > 0 && (
        <Svg width={ancho} height={alto}>
          {[0, 0.5, 1].map((f) => (
            <G key={f}>
              <Line x1={ejeIzq} x2={ancho} y1={y(maximo * f)} y2={y(maximo * f)} stroke={CUADRICULA} strokeWidth={1} />
              <SvgText x={ejeIzq - 8} y={y(maximo * f) + 4} fontSize={11} fill={TINTA_SUAVE} textAnchor="end">
                {dineroCorto(maximo * f)}
              </SvgText>
            </G>
          ))}
          {datos.map((d, i) => {
            const x = ejeIzq + paso * i + (paso - anchoBarra) / 2;
            const activo = seleccionado ? d.clave === seleccionado : i === datos.length - 1;
            return (
              <G key={d.clave}>
                {/* zona de toque más grande que la barra */}
                <Rect
                  x={ejeIzq + paso * i}
                  y={0}
                  width={paso}
                  height={alto}
                  fill="transparent"
                  onPress={alTocar ? () => alTocar(d.clave) : undefined}
                />
                <Path d={barraRedondeadaArriba(x, y(d.valor), anchoBarra, base)} fill={activo ? colorSerie : colorSerieSuave} />
                {activo && d.valor > 0 && (
                  <SvgText x={x + anchoBarra / 2} y={y(d.valor) - 7} fontSize={11} fontWeight="700" fill={colores.texto} textAnchor="middle">
                    {dineroCorto(d.valor)}
                  </SvgText>
                )}
                <SvgText
                  x={x + anchoBarra / 2}
                  y={alto - 6}
                  fontSize={11}
                  fontWeight={activo ? '700' : '400'}
                  fill={activo ? colores.texto : TINTA_SUAVE}
                  textAnchor="middle"
                >
                  {d.etiqueta}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Barras apiladas (varias series): categorías de cada mes
// ---------------------------------------------------------------------------

export type Serie = { nombre: string; color: string };
export type Columna = { clave: string; etiqueta: string; valores: Record<string, number> };

export function BarrasApiladas({
  columnas,
  series,
  seleccionado,
  alTocar,
  alto = 210,
}: {
  columnas: Columna[];
  series: Serie[];
  seleccionado?: string;
  alTocar?: (clave: string) => void;
  alto?: number;
}) {
  const [ancho, alMedir] = useAncho();
  const ejeIzq = 44;
  const abajo = 24;
  const arriba = 10;
  const base = alto - abajo;
  const totales = columnas.map((c) => series.reduce((s, se) => s + (c.valores[se.nombre] ?? 0), 0));
  const maximo = maximoBonito(Math.max(...totales, 0));
  const anchoZona = Math.max(ancho - ejeIzq, 0);
  const paso = columnas.length > 0 ? anchoZona / columnas.length : 0;
  const anchoBarra = Math.min(36, paso * 0.56);
  const escala = (v: number) => (v / maximo) * (base - arriba);

  return (
    <View style={{ gap: 12 }}>
      <View onLayout={alMedir} style={{ height: alto }}>
        {ancho > 0 && (
          <Svg width={ancho} height={alto}>
            {[0, 0.5, 1].map((f) => (
              <G key={f}>
                <Line x1={ejeIzq} x2={ancho} y1={base - escala(maximo * f)} y2={base - escala(maximo * f)} stroke={CUADRICULA} strokeWidth={1} />
                <SvgText x={ejeIzq - 8} y={base - escala(maximo * f) + 4} fontSize={11} fill={TINTA_SUAVE} textAnchor="end">
                  {dineroCorto(maximo * f)}
                </SvgText>
              </G>
            ))}
            {columnas.map((c, i) => {
              const x = ejeIzq + paso * i + (paso - anchoBarra) / 2;
              const activo = c.clave === seleccionado;
              let cursor = base;
              const presentes = series.filter((se) => (c.valores[se.nombre] ?? 0) > 0);
              return (
                <G key={c.clave} opacity={seleccionado && !activo ? 0.45 : 1}>
                  <Rect
                    x={ejeIzq + paso * i}
                    y={0}
                    width={paso}
                    height={alto}
                    fill="transparent"
                    onPress={alTocar ? () => alTocar(c.clave) : undefined}
                  />
                  {presentes.map((se, j) => {
                    const h = escala(c.valores[se.nombre] ?? 0);
                    const ultimo = j === presentes.length - 1;
                    const abajoSeg = cursor;
                    const arribaSeg = cursor - h;
                    cursor = arribaSeg - 2; // 2px de separación entre segmentos
                    const altoVisible = Math.max(abajoSeg - arribaSeg - (j > 0 ? 0 : 0), 0);
                    if (altoVisible <= 0.5) return null;
                    return ultimo ? (
                      <Path key={se.nombre} d={barraRedondeadaArriba(x, arribaSeg, anchoBarra, abajoSeg)} fill={se.color} />
                    ) : (
                      <Rect key={se.nombre} x={x} y={arribaSeg} width={anchoBarra} height={altoVisible} fill={se.color} />
                    );
                  })}
                  <SvgText
                    x={x + anchoBarra / 2}
                    y={alto - 6}
                    fontSize={11}
                    fontWeight={activo ? '700' : '400'}
                    fill={activo ? colores.texto : TINTA_SUAVE}
                    textAnchor="middle"
                  >
                    {c.etiqueta}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        )}
      </View>
      <Leyenda series={series} />
    </View>
  );
}

export function Leyenda({ series, punteada }: { series: Serie[]; punteada?: string }) {
  return (
    <View style={estilos.leyenda}>
      {series.map((s) => (
        <View key={s.nombre} style={estilos.leyendaItem}>
          {punteada === s.nombre ? (
            <View style={{ width: 14, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: s.color }} />
          ) : (
            <View style={[estilos.leyendaMuestra, { backgroundColor: s.color }]} />
          )}
          <Text style={estilos.leyendaTexto}>{s.nombre}</Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Barra segmentada horizontal + lista de montos: ¿en qué se gasta más?
// ---------------------------------------------------------------------------

export type Parte = { nombre: string; valor: number; color: string; icono?: ReactNode };

export function BarraSegmentada({ partes }: { partes: Parte[] }) {
  const [ancho, alMedir] = useAncho();
  const total = partes.reduce((s, p) => s + p.valor, 0);
  const visibles = partes.filter((p) => p.valor > 0);
  const huecos = Math.max(visibles.length - 1, 0) * 2;
  const disponible = Math.max(ancho - huecos, 0);
  // Posición de inicio de cada segmento (se calcula antes de dibujar).
  const inicios = visibles.reduce<number[]>((acc, p, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + (visibles[i - 1].valor / total) * disponible + 2);
    return acc;
  }, []);

  return (
    <View style={{ gap: 14 }}>
      <View onLayout={alMedir} style={{ height: 16 }}>
        {ancho > 0 && total > 0 && (
          <Svg width={ancho} height={16}>
            {visibles.map((p, i) => {
              const w = (p.valor / total) * disponible;
              const inicio = inicios[i];
              const primero = i === 0;
              const ultimo = i === visibles.length - 1;
              const r = Math.min(4, w / 2);
              // Esquinas redondeadas solo en los extremos de la barra completa.
              const d = `M${inicio + (primero ? r : 0)},0 H${inicio + w - (ultimo ? r : 0)} ${ultimo ? `Q${inicio + w},0 ${inicio + w},${r} V${16 - r} Q${inicio + w},16 ${inicio + w - r},16` : `V16`} H${inicio + (primero ? r : 0)} ${primero ? `Q${inicio},16 ${inicio},${16 - r} V${r} Q${inicio},0 ${inicio + r},0` : `V0`} Z`;
              return <Path key={p.nombre} d={d} fill={p.color} />;
            })}
          </Svg>
        )}
      </View>
      {partes.map((p) => {
        const porcentaje = total > 0 ? (p.valor / total) * 100 : 0;
        return (
          <View key={p.nombre} style={estilos.renglon}>
            {p.icono ?? <View style={[estilos.leyendaMuestra, { backgroundColor: p.color }]} />}
            <Text style={estilos.renglonNombre} numberOfLines={1}>
              {p.nombre}
            </Text>
            <Text style={estilos.renglonPorcentaje}>{porcentaje.toFixed(0)}%</Text>
            <Text style={estilos.renglonMonto}>{formatoDinero(p.valor)}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Línea de gasto acumulado: este mes vs. el mes anterior
// ---------------------------------------------------------------------------

export type SerieLinea = { nombre: string; color: string; valores: number[]; punteada?: boolean };

export function LineaAcumulada({ series, dias, alto = 200 }: { series: SerieLinea[]; dias: number; alto?: number }) {
  const [ancho, alMedir] = useAncho();
  const [dia, setDia] = useState<number | null>(null);
  const ejeIzq = 44;
  const derecha = 12;
  const abajo = 24;
  const arriba = 14;
  const base = alto - abajo;
  const maximo = maximoBonito(Math.max(...series.flatMap((s) => s.valores), 0));
  const anchoZona = Math.max(ancho - ejeIzq - derecha, 1);
  const x = (i: number) => ejeIzq + (dias > 1 ? (i / (dias - 1)) * anchoZona : 0);
  const y = (v: number) => base - (v / maximo) * (base - arriba);

  function tocar(locationX: number) {
    const i = Math.round(((locationX - ejeIzq) / anchoZona) * (dias - 1));
    setDia(Math.min(Math.max(i, 0), dias - 1));
  }

  return (
    <View style={{ gap: 12 }}>
      <Pressable
        onLayout={alMedir}
        style={{ height: alto }}
        onPressIn={(e) => tocar(e.nativeEvent.locationX)}
        onPressOut={() => setTimeout(() => setDia(null), 1800)}
      >
        {ancho > 0 && (
          <Svg width={ancho} height={alto}>
            {[0, 0.5, 1].map((f) => (
              <G key={f}>
                <Line x1={ejeIzq} x2={ancho - derecha} y1={y(maximo * f)} y2={y(maximo * f)} stroke={CUADRICULA} strokeWidth={1} />
                <SvgText x={ejeIzq - 8} y={y(maximo * f) + 4} fontSize={11} fill={TINTA_SUAVE} textAnchor="end">
                  {dineroCorto(maximo * f)}
                </SvgText>
              </G>
            ))}
            {[1, Math.ceil(dias / 2), dias].map((d) => (
              <SvgText key={d} x={x(d - 1)} y={alto - 6} fontSize={11} fill={TINTA_SUAVE} textAnchor="middle">
                {`día ${d}`}
              </SvgText>
            ))}
            {series.map((s) => {
              if (s.valores.length === 0) return null;
              const d = s.valores.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');
              const ultimo = s.valores.length - 1;
              return (
                <G key={s.nombre}>
                  <Path d={d} stroke={s.color} strokeWidth={2} fill="none" strokeDasharray={s.punteada ? '5,4' : undefined} strokeLinejoin="round" />
                  {!s.punteada && (
                    <Circle cx={x(ultimo)} cy={y(s.valores[ultimo])} r={4.5} fill={s.color} stroke="#FFFFFF" strokeWidth={2} />
                  )}
                </G>
              );
            })}
            {dia !== null && (
              <G>
                <Line x1={x(dia)} x2={x(dia)} y1={arriba} y2={base} stroke={TINTA_SUAVE} strokeWidth={1} strokeDasharray="3,3" />
                {series.map((s) =>
                  s.valores[dia] !== undefined ? (
                    <Circle key={s.nombre} cx={x(dia)} cy={y(s.valores[dia])} r={4} fill={s.color} stroke="#FFFFFF" strokeWidth={2} />
                  ) : null,
                )}
              </G>
            )}
          </Svg>
        )}
      </Pressable>
      {dia !== null ? (
        <View style={estilos.tooltip}>
          <Text style={estilos.tooltipTitulo}>Día {dia + 1}</Text>
          {series.map((s) =>
            s.valores[dia] !== undefined ? (
              <View key={s.nombre} style={estilos.leyendaItem}>
                <View style={[estilos.leyendaMuestra, { backgroundColor: s.color }]} />
                <Text style={estilos.leyendaTexto}>
                  {s.nombre}: <Text style={{ fontWeight: '700', color: colores.texto }}>{formatoDinero(s.valores[dia])}</Text>
                </Text>
              </View>
            ) : null,
          )}
        </View>
      ) : (
        <Leyenda series={series} punteada={series.find((s) => s.punteada)?.nombre} />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaMuestra: { width: 10, height: 10, borderRadius: 3 },
  leyendaTexto: { fontSize: 13, color: TINTA_SUAVE },
  renglon: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  renglonNombre: { flex: 1, fontSize: 15, fontWeight: '600', color: colores.texto },
  renglonPorcentaje: { width: 40, textAlign: 'right', fontSize: 13, fontWeight: '700', color: TINTA_SUAVE },
  renglonMonto: { width: 96, textAlign: 'right', fontSize: 15, fontWeight: '700', color: colores.texto, fontVariant: ['tabular-nums'] },
  tooltip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tooltipTitulo: { fontSize: 13, fontWeight: '800', color: colores.texto },
});
