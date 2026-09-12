import React from 'react';
import { SERIE, GRID, EIXO, TINTA_MUTED, TINTA_SECUNDARIA, formatarNumero } from '../../lib/viz';

/**
 * Box plot desenhado à mão em SVG (o Recharts não tem essa forma).
 *
 * Mostra mediana + dispersão, não só a média — é o ponto do gráfico: dois
 * grupos podem ter a mesma média e distribuições completamente diferentes.
 *
 * `grupos`: [{ label, resumo: { minimo, q1, mediana, q3, maximo, n } }]
 */
export function BoxPlot({ grupos, rotuloValor, decimais = 0, altura = 260 }) {
  const validos = (grupos || []).filter((g) => g.resumo);
  if (validos.length === 0) return null;

  const margem = { topo: 16, direita: 16, baixo: 40, esquerda: 52 };
  const largura = 520;
  const alturaPlot = altura - margem.topo - margem.baixo;

  const todosValores = validos.flatMap((g) => [g.resumo.minimo, g.resumo.maximo]);
  const min = Math.min(...todosValores);
  const max = Math.max(...todosValores);
  const amplitude = max - min || 1;
  const folga = amplitude * 0.1;
  const escalaMin = min - folga;
  const escalaMax = max + folga;

  const y = (valor) =>
    margem.topo + alturaPlot - ((valor - escalaMin) / (escalaMax - escalaMin)) * alturaPlot;

  const faixaPorGrupo = (largura - margem.esquerda - margem.direita) / validos.length;
  const larguraCaixa = Math.min(72, faixaPorGrupo * 0.5);

  const ticks = [escalaMin, (escalaMin + escalaMax) / 2, escalaMax];

  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      width="100%"
      height={altura}
      role="img"
      aria-label={`Box plot de ${rotuloValor} por grupo`}
    >
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={margem.esquerda}
            x2={largura - margem.direita}
            y1={y(t)}
            y2={y(t)}
            stroke={GRID}
            strokeWidth={1}
          />
          <text x={margem.esquerda - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={TINTA_MUTED}>
            {formatarNumero(t, decimais)}
          </text>
        </g>
      ))}

      {validos.map((grupo, i) => {
        const centro = margem.esquerda + faixaPorGrupo * (i + 0.5);
        const esquerda = centro - larguraCaixa / 2;
        const { minimo, q1, mediana, q3, maximo, n } = grupo.resumo;
        const cor = grupo.cor || SERIE[0];

        return (
          <g key={grupo.label}>
            {/* Bigodes */}
            <line x1={centro} x2={centro} y1={y(maximo)} y2={y(q3)} stroke={cor} strokeWidth={2} />
            <line x1={centro} x2={centro} y1={y(q1)} y2={y(minimo)} stroke={cor} strokeWidth={2} />
            <line
              x1={centro - larguraCaixa / 4}
              x2={centro + larguraCaixa / 4}
              y1={y(maximo)}
              y2={y(maximo)}
              stroke={cor}
              strokeWidth={2}
            />
            <line
              x1={centro - larguraCaixa / 4}
              x2={centro + larguraCaixa / 4}
              y1={y(minimo)}
              y2={y(minimo)}
              stroke={cor}
              strokeWidth={2}
            />

            {/* Caixa Q1–Q3 */}
            <rect
              x={esquerda}
              y={y(q3)}
              width={larguraCaixa}
              height={Math.max(2, y(q1) - y(q3))}
              fill={cor}
              fillOpacity={0.18}
              stroke={cor}
              strokeWidth={2}
              rx={3}
            />

            {/* Mediana */}
            <line
              x1={esquerda}
              x2={esquerda + larguraCaixa}
              y1={y(mediana)}
              y2={y(mediana)}
              stroke={cor}
              strokeWidth={3}
            />
            <text
              x={esquerda + larguraCaixa + 6}
              y={y(mediana) + 4}
              fontSize={11}
              fill={TINTA_SECUNDARIA}
            >
              mediana {formatarNumero(mediana, decimais)}
            </text>

            <text x={centro} y={altura - 20} textAnchor="middle" fontSize={11} fill={TINTA_SECUNDARIA}>
              {grupo.label}
            </text>
            <text x={centro} y={altura - 6} textAnchor="middle" fontSize={10} fill={TINTA_MUTED}>
              n = {n}
            </text>
          </g>
        );
      })}

      <line
        x1={margem.esquerda}
        x2={margem.esquerda}
        y1={margem.topo}
        y2={margem.topo + alturaPlot}
        stroke={EIXO}
        strokeWidth={1}
      />
    </svg>
  );
}
