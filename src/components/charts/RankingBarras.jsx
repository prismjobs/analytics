import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import { CaixaTooltip } from './ChartCard';
import { SERIE, GRID, EIXO, EIXO_TICK, corPorSinal, simboloPorSinal, formatarNumero } from '../../lib/viz';

/**
 * Ranking horizontal.
 *
 * `porSinal = false` (padrão): magnitude — uma cor só para todas as barras.
 * `porSinal = true`: polaridade (acelerando/desacelerando) — par de estado
 * verde/vermelho SEMPRE acompanhado do símbolo ▲/▼ no rótulo da barra, para a
 * cor não ser a única pista.
 */
export function RankingBarras({
  dados,
  rotuloValor,
  decimais = 0,
  unidade = '',
  porSinal = false,
  larguraNomes = 190,
  alturaPorBarra = 26
}) {
  if (!dados || dados.length === 0) return null;

  const altura = Math.max(200, dados.length * alturaPorBarra + 40);

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        data={dados}
        layout="vertical"
        margin={{ top: 4, right: 56, bottom: 8, left: 4 }}
        barCategoryGap={4}
      >
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis
          type="number"
          tick={EIXO_TICK}
          stroke={EIXO}
          tickFormatter={(v) => formatarNumero(v, decimais)}
        />
        <YAxis
          type="category"
          dataKey="nome"
          width={larguraNomes}
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
                titulo={p.tituloCompleto || p.nome}
                linhas={[
                  { label: rotuloValor, valor: `${formatarNumero(p.valor, decimais)}${unidade}` },
                  ...(p.extra || [])
                ]}
              />
            );
          }}
        />
        <Bar dataKey="valor" radius={[0, 4, 4, 0]} isAnimationActive={false} maxBarSize={16}>
          {dados.map((d, i) => (
            <Cell key={i} fill={porSinal ? corPorSinal(d.valor) : SERIE[0]} />
          ))}
          <LabelList
            dataKey="valor"
            position="right"
            fontSize={11}
            fill="#52514e"
            formatter={(v) =>
              `${porSinal ? `${simboloPorSinal(v)} ` : ''}${formatarNumero(v, decimais)}${unidade}`
            }
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
