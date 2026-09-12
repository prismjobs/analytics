import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label
} from 'recharts';
import { CaixaTooltip, LegendaSeries } from './ChartCard';
import { SERIE, GRID, EIXO, EIXO_TICK, formatarNumero } from '../../lib/viz';

/**
 * Curvas de crescimento sobrepostas, com o eixo X normalizado em "dias desde
 * a 1ª captura". Mostra o FORMATO do sucesso: estouro rápido com platô, ou
 * crescimento constante.
 *
 * Limitado a 5 séries de propósito — acima disso as cores deixam de ser
 * distinguíveis com segurança. A legenda traz nome + valor final de cada
 * série, então nada depende só da cor.
 */
export function CurvasNormalizadas({ series, dados, altura = 320 }) {
  if (!series || series.length === 0 || !dados || dados.length === 0) return null;

  return (
    <>
      <ResponsiveContainer width="100%" height={altura}>
        <LineChart data={dados} margin={{ top: 8, right: 20, bottom: 24, left: 4 }}>
          <CartesianGrid stroke={GRID} />
          <XAxis
            dataKey="dia"
            type="number"
            tick={EIXO_TICK}
            stroke={EIXO}
            domain={['dataMin', 'dataMax']}
            allowDecimals={false}
          >
            <Label
              value="Dias desde a 1ª captura"
              position="insideBottom"
              offset={-16}
              fill={EIXO}
              fontSize={11}
            />
          </XAxis>
          <YAxis tick={EIXO_TICK} stroke={EIXO} width={56} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <CaixaTooltip
                  titulo={`Dia ${label}`}
                  linhas={payload
                    .filter((p) => p.value !== null && p.value !== undefined)
                    .map((p) => ({
                      label: series.find((s) => s.chave === p.dataKey)?.label || p.dataKey,
                      valor: `+${formatarNumero(p.value, 0)} visitantes`
                    }))}
                />
              );
            }}
          />
          {series.map((s, i) => (
            <Line
              key={s.chave}
              type="monotone"
              dataKey={s.chave}
              stroke={SERIE[i % SERIE.length]}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <LegendaSeries
        itens={series.map((s, i) => ({
          label: s.label,
          cor: SERIE[i % SERIE.length],
          valor: `+${formatarNumero(s.valorFinal, 0)}`
        }))}
      />
    </>
  );
}
