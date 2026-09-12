import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Label
} from 'recharts';
import { CaixaTooltip } from './ChartCard';
import { SERIE, GRID, EIXO, EIXO_TICK, formatarNumero } from '../../lib/viz';
import { mediana } from '../../lib/metrics';

/**
 * Gráfico de quadrantes para seleção visual de "quem estudar a fundo".
 *
 * Os cortes são as MEDIANAS de cada eixo (não a média), então metade dos
 * anúncios cai de cada lado independentemente de outliers.
 *
 * Os pontos têm uma cor só: a informação que importa é a POSIÇÃO (em qual
 * quadrante o anúncio caiu), e os quadrantes já vêm rotulados por escrito.
 */
export function Quadrantes({ pontos, rotuloX, rotuloY, altura = 420, nomesQuadrantes }) {
  const { validos, corteX, corteY, limites } = useMemo(() => {
    const v = (pontos || []).filter(
      (p) => p.x !== null && p.x !== undefined && p.y !== null && p.y !== undefined
    );
    if (v.length === 0) return { validos: [], corteX: 0, corteY: 0, limites: null };

    const xs = v.map((p) => p.x);
    const ys = v.map((p) => p.y);
    const folgaX = (Math.max(...xs) - Math.min(...xs)) * 0.12 || 1;
    const folgaY = (Math.max(...ys) - Math.min(...ys)) * 0.12 || 1;

    return {
      validos: v,
      corteX: mediana(xs),
      corteY: mediana(ys),
      limites: {
        minX: Math.min(...xs) - folgaX,
        maxX: Math.max(...xs) + folgaX,
        minY: Math.min(...ys) - folgaY,
        maxY: Math.max(...ys) + folgaY
      }
    };
  }, [pontos]);

  if (validos.length === 0 || !limites) return null;

  const rotulos = {
    altoAlto: 'Vencedores óbvios',
    baixoAlto: 'Potencial não explorado',
    altoBaixo: 'Sorte / anomalia',
    baixoBaixo: 'Descartáveis',
    ...(nomesQuadrantes || {})
  };

  return (
    <>
      <ResponsiveContainer width="100%" height={altura}>
        <ScatterChart margin={{ top: 16, right: 20, bottom: 28, left: 4 }}>
          <CartesianGrid stroke={GRID} />

          {/* Quadrante de destaque (alto em X e alto em Y) recebe um leve
              banho de cor; os outros ficam limpos, só com rótulo. */}
          <ReferenceArea
            x1={corteX}
            x2={limites.maxX}
            y1={corteY}
            y2={limites.maxY}
            fill={SERIE[0]}
            fillOpacity={0.05}
            stroke="none"
          />

          <XAxis
            type="number"
            dataKey="x"
            name={rotuloX}
            domain={[limites.minX, limites.maxX]}
            tick={EIXO_TICK}
            stroke={EIXO}
            tickFormatter={(v) => formatarNumero(v, 0)}
          >
            <Label value={rotuloX} position="insideBottom" offset={-18} fill={EIXO} fontSize={11} />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            name={rotuloY}
            domain={[limites.minY, limites.maxY]}
            tick={EIXO_TICK}
            stroke={EIXO}
            width={56}
            tickFormatter={(v) => formatarNumero(v, 0)}
          />

          <ReferenceLine x={corteX} stroke={EIXO} strokeWidth={1} />
          <ReferenceLine y={corteY} stroke={EIXO} strokeWidth={1} />

          <Tooltip
            cursor={{ stroke: EIXO }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload;
              const quadrante =
                p.x >= corteX
                  ? p.y >= corteY
                    ? rotulos.altoAlto
                    : rotulos.altoBaixo
                  : p.y >= corteY
                  ? rotulos.baixoAlto
                  : rotulos.baixoBaixo;
              return (
                <CaixaTooltip
                  titulo={p.titulo}
                  linhas={[
                    { label: rotuloX, valor: formatarNumero(p.x, 0) },
                    { label: rotuloY, valor: formatarNumero(p.y, 0) },
                    { label: 'Quadrante', valor: quadrante },
                    ...(p.extra || [])
                  ]}
                />
              );
            }}
          />

          <Scatter
            data={validos}
            fill={SERIE[0]}
            stroke="#ffffff"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </ScatterChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
        <QuadranteLegenda
          titulo={`↖ ${rotulos.baixoAlto}`}
          descricao={`${rotuloY} alto, ${rotuloX} baixo — tem os ingredientes e não performa.`}
        />
        <QuadranteLegenda
          titulo={`↗ ${rotulos.altoAlto}`}
          descricao={`Alto nos dois eixos — o grupo para estudar a fundo.`}
          destaque
        />
        <QuadranteLegenda
          titulo={`↙ ${rotulos.baixoBaixo}`}
          descricao="Baixo nos dois eixos."
        />
        <QuadranteLegenda
          titulo={`↘ ${rotulos.altoBaixo}`}
          descricao={`${rotuloX} alto com ${rotuloY.toLowerCase()} baixo — performou com pouco.`}
        />
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Cortes na mediana: {rotuloX} = {formatarNumero(corteX, 1)} · {rotuloY} ={' '}
        {formatarNumero(corteY, 1)}
      </p>
    </>
  );
}

function QuadranteLegenda({ titulo, descricao, destaque }) {
  return (
    <div className={`rounded-lg p-2 ${destaque ? 'bg-blue-50' : 'bg-gray-50'}`}>
      <p className="font-medium text-gray-800">{titulo}</p>
      <p className="text-gray-500 leading-snug">{descricao}</p>
    </div>
  );
}
