import React, { useMemo } from 'react';
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Label
} from 'recharts';
import { CaixaTooltip, LegendaSeries } from './ChartCard';
import { regressaoLinear, faixaDoValor } from '../../lib/metrics';
import { SERIE, GRID, EIXO, EIXO_TICK, corPorFaixa, formatarNumero } from '../../lib/viz';

const FAIXAS = ['Bottom 25%', '25–50%', '50–75%', 'Top 25%'];

/**
 * Scatter com reta de tendência opcional.
 *
 * `pontos`: [{ x, y, titulo, extra? }]
 * `corPor`: 'unica' (padrão) ou 'desempenho' — no segundo caso a cor vem de
 * uma rampa ordinal de um único tom (claro = pior faixa), com legenda em texto.
 */
export function ScatterAnalitico({
  pontos,
  rotuloX,
  rotuloY,
  unidadeX = '',
  unidadeY = '',
  tendencia = true,
  corPor = 'unica',
  valorDesempenho,
  altura = 300,
  decimaisX = 0,
  decimaisY = 0,
  linhaZeroY = false
}) {
  const { dados, reta, r, faixaPorIndice } = useMemo(() => {
    const validos = pontos
      .filter((p) => p.x !== null && p.x !== undefined && p.y !== null && p.y !== undefined)
      .sort((a, b) => a.x - b.x);

    const regressao = tendencia ? regressaoLinear(validos) : null;

    const desempenhos =
      corPor === 'desempenho' && valorDesempenho
        ? validos.map((p) => valorDesempenho(p))
        : null;

    return {
      dados: validos.map((p) => ({
        ...p,
        tendencia: regressao ? regressao.intercepto + regressao.inclinacao * p.x : null
      })),
      reta: regressao,
      r: regressao ? regressao.r : null,
      faixaPorIndice: desempenhos
        ? desempenhos.map((valor) => faixaDoValor(valor, desempenhos))
        : null
    };
  }, [pontos, tendencia, corPor, valorDesempenho]);

  if (dados.length === 0) return null;

  return (
    <>
      <ResponsiveContainer width="100%" height={altura}>
        <ComposedChart data={dados} margin={{ top: 8, right: 16, bottom: 24, left: 4 }}>
          <CartesianGrid stroke={GRID} strokeWidth={1} />
          <XAxis
            type="number"
            dataKey="x"
            name={rotuloX}
            tick={EIXO_TICK}
            stroke={EIXO}
            tickFormatter={(v) => `${formatarNumero(v, decimaisX)}${unidadeX}`}
            domain={['dataMin', 'dataMax']}
          >
            <Label value={rotuloX} position="insideBottom" offset={-16} fill={EIXO} fontSize={11} />
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
          {linhaZeroY && <ReferenceLine y={0} stroke={EIXO} strokeWidth={1} />}
          <Tooltip
            cursor={{ stroke: EIXO, strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload;
              return (
                <CaixaTooltip
                  titulo={p.titulo}
                  linhas={[
                    { label: rotuloX, valor: `${formatarNumero(p.x, decimaisX)}${unidadeX}` },
                    { label: rotuloY, valor: `${formatarNumero(p.y, decimaisY)}${unidadeY}` },
                    ...(p.extra || [])
                  ]}
                />
              );
            }}
          />
          {reta && (
            <Line
              type="linear"
              dataKey="tendencia"
              stroke={SERIE[1]}
              strokeWidth={2}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              legendType="none"
            />
          )}
          <Scatter dataKey="y" fill={SERIE[0]} isAnimationActive={false}>
            {dados.map((p, i) => (
              <Cell
                key={i}
                fill={faixaPorIndice ? corPorFaixa(faixaPorIndice[i]) : SERIE[0]}
                stroke="#ffffff"
                strokeWidth={2}
              />
            ))}
          </Scatter>
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {faixaPorIndice && (
          <LegendaSeries
            itens={FAIXAS.map((label, i) => ({ label, cor: corPorFaixa(i) }))}
          />
        )}
        {reta && r !== null && (
          <p className="text-xs text-gray-500 mt-2">
            Tendência: {reta.inclinacao > 0 ? 'sobe' : 'desce'} {formatarNumero(Math.abs(reta.inclinacao), 2)} de{' '}
            {rotuloY.toLowerCase()} por unidade de {rotuloX.toLowerCase()} · correlação r ={' '}
            <span className="font-medium text-gray-700">{formatarNumero(r, 2)}</span> (n = {dados.length})
          </p>
        )}
      </div>
    </>
  );
}
