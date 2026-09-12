import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { CaixaTooltip } from './ChartCard';
import { SERIE, GRID, TINTA_MUTED, formatarNumero } from '../../lib/viz';

/**
 * Radar de um anúncio — usado em PEQUENOS MÚLTIPLOS (um card por anúncio) em
 * vez de sobrepor várias séries no mesmo radar: áreas empilhadas viram sopa
 * visual e estouram o limite seguro de cores por gráfico.
 *
 * Todos os eixos estão normalizados de 0 a 100 dentro do conjunto analisado,
 * então a forma é comparável entre os cards.
 */
export function RadarPerfil({ titulo, subtitulo, eixos, altura = 220 }) {
  return (
    <div className="border rounded-lg p-3">
      <p className="text-sm font-medium truncate" title={titulo}>
        {titulo}
      </p>
      {subtitulo && <p className="text-xs text-gray-500 mb-1">{subtitulo}</p>}
      <ResponsiveContainer width="100%" height={altura}>
        <RadarChart data={eixos} outerRadius="72%">
          <PolarGrid stroke={GRID} />
          <PolarAngleAxis dataKey="eixo" tick={{ fontSize: 10, fill: TINTA_MUTED }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload;
              return (
                <CaixaTooltip
                  titulo={p.eixo}
                  linhas={[
                    { label: 'Índice (0–100)', valor: formatarNumero(p.valor, 0) },
                    { label: 'Valor real', valor: p.real }
                  ]}
                />
              );
            }}
          />
          <Radar
            dataKey="valor"
            stroke={SERIE[0]}
            strokeWidth={2}
            fill={SERIE[0]}
            fillOpacity={0.22}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
