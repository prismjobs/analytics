import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { CaixaTooltip } from './ChartCard';
import { SERIE, GRID, EIXO, EIXO_TICK, formatarNumero } from '../../lib/viz';

/**
 * Histograma / distribuição por faixas.
 * `dados`: [{ faixa, quantidade, percentual }]
 */
export function Histograma({ dados, rotuloX, altura = 260, mostrarPercentual = true }) {
  if (!dados || dados.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} margin={{ top: 16, right: 12, bottom: 8, left: 0 }} barCategoryGap={6}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="faixa" tick={EIXO_TICK} stroke={EIXO} />
        <YAxis tick={EIXO_TICK} stroke={EIXO} width={36} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'rgba(11,11,11,0.04)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload;
            return (
              <CaixaTooltip
                titulo={`${rotuloX}: ${p.faixa}`}
                linhas={[
                  { label: 'Anúncios', valor: p.quantidade },
                  { label: 'Participação', valor: `${formatarNumero(p.percentual, 0)}%` },
                  ...(p.extra || [])
                ]}
              />
            );
          }}
        />
        <Bar dataKey="quantidade" fill={SERIE[0]} radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={64}>
          <LabelList
            dataKey={mostrarPercentual ? 'percentual' : 'quantidade'}
            position="top"
            fontSize={11}
            fill="#52514e"
            formatter={(v) => (mostrarPercentual ? `${formatarNumero(v, 0)}%` : formatarNumero(v, 0))}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
