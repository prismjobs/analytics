import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Label
} from 'recharts';
import { CaixaTooltip } from './ChartCard';
import { SERIE, GRID, EIXO, EIXO_TICK, formatarNumero } from '../../lib/viz';

/**
 * Bubble chart: X, Y e o tamanho da bolha como terceira dimensão.
 * `pontos`: [{ x, y, z, titulo, extra? }]
 */
export function BolhasChart({
  pontos,
  rotuloX,
  rotuloY,
  rotuloZ,
  decimaisX = 0,
  decimaisY = 0,
  decimaisZ = 0,
  altura = 320,
  rotularPontos = true
}) {
  const validos = (pontos || []).filter(
    (p) => p.x !== null && p.x !== undefined && p.y !== null && p.y !== undefined
  );
  if (validos.length === 0) return null;

  const zs = validos.map((p) => Math.abs(p.z || 0));
  const maxZ = Math.max(...zs, 1);

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <ScatterChart margin={{ top: 16, right: 24, bottom: 28, left: 4 }}>
        <CartesianGrid stroke={GRID} />
        <XAxis
          type="number"
          dataKey="x"
          name={rotuloX}
          tick={EIXO_TICK}
          stroke={EIXO}
          allowDecimals={decimaisX > 0}
          tickFormatter={(v) => formatarNumero(v, decimaisX)}
        >
          <Label value={rotuloX} position="insideBottom" offset={-18} fill={EIXO} fontSize={11} />
        </XAxis>
        <YAxis
          type="number"
          dataKey="y"
          name={rotuloY}
          tick={EIXO_TICK}
          stroke={EIXO}
          width={56}
          tickFormatter={(v) => formatarNumero(v, decimaisY)}
        />
        <ZAxis type="number" dataKey="z" range={[80, 900]} domain={[0, maxZ]} name={rotuloZ} />
        <Tooltip
          cursor={{ strokeDasharray: '0', stroke: EIXO }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload;
            return (
              <CaixaTooltip
                titulo={p.titulo}
                linhas={[
                  { label: rotuloX, valor: formatarNumero(p.x, decimaisX) },
                  { label: rotuloY, valor: formatarNumero(p.y, decimaisY) },
                  { label: rotuloZ, valor: formatarNumero(p.z, decimaisZ) },
                  ...(p.extra || [])
                ]}
              />
            );
          }}
        />
        <Scatter
          data={validos}
          fill={SERIE[0]}
          fillOpacity={0.55}
          stroke="#ffffff"
          strokeWidth={2}
          isAnimationActive={false}
        >
          {rotularPontos && (
            <LabelList dataKey="titulo" position="top" fontSize={10} fill="#52514e" />
          )}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
