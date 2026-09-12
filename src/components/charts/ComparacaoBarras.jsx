import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { CaixaTooltip, LegendaSeries } from './ChartCard';
import { SERIE, GRID, EIXO, EIXO_TICK, formatarNumero } from '../../lib/viz';

/**
 * Barras lado a lado comparando dois grupos (top 25% x bottom 25%) em várias
 * features. Os valores são exibidos como ÍNDICE relativo ao grupo de baixo
 * (=100), porque as features têm escalas incompatíveis (caracteres, emojis,
 * nota de sentimento) e não cabem no mesmo eixo em valor absoluto —
 * dois eixos Y no mesmo gráfico inventariam uma comparação que não existe.
 */
export function ComparacaoBarras({ dados, rotuloA, rotuloB, altura = 320 }) {
  if (!dados || dados.length === 0) return null;

  return (
    <>
      <ResponsiveContainer width="100%" height={altura}>
        <BarChart
          data={dados}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 8, left: 4 }}
          barCategoryGap={8}
          barGap={2}
        >
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" tick={EIXO_TICK} stroke={EIXO} />
          <YAxis
            type="category"
            dataKey="feature"
            width={150}
            tick={{ ...EIXO_TICK, fontSize: 11 }}
            stroke={EIXO}
          />
          <Tooltip
            cursor={{ fill: 'rgba(11,11,11,0.04)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload;
              return (
                <CaixaTooltip
                  titulo={p.feature}
                  linhas={[
                    { label: rotuloA, valor: formatarNumero(p.valorRealA, p.decimais ?? 1) },
                    { label: rotuloB, valor: formatarNumero(p.valorRealB, p.decimais ?? 1) },
                    {
                      label: 'Diferença',
                      valor:
                        p.indiceA === null
                          ? '—'
                          : `${p.indiceA >= 100 ? '+' : ''}${formatarNumero(p.indiceA - 100, 0)}%`
                    }
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="indiceA" fill={SERIE[0]} radius={[0, 4, 4, 0]} maxBarSize={12} isAnimationActive={false} />
          <Bar dataKey="indiceB" fill={SERIE[1]} radius={[0, 4, 4, 0]} maxBarSize={12} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>

      <LegendaSeries
        itens={[
          { label: rotuloA, cor: SERIE[0] },
          { label: `${rotuloB} (base = 100)`, cor: SERIE[1] }
        ]}
      />
    </>
  );
}
