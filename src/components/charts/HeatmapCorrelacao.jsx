import React from 'react';
import { corCorrelacao, formatarNumero, TINTA_SECUNDARIA } from '../../lib/viz';

/**
 * Matriz de correlação em forma de heatmap.
 *
 * A rampa é DIVERGENTE (vermelho = correlação negativa, cinza neutro = zero,
 * azul = positiva), porque o dado tem polaridade: -0,6 e +0,6 são igualmente
 * fortes, mas em direções opostas. Cada célula também mostra o número, então a
 * leitura nunca depende só da cor.
 *
 * `linhas`: [{ label, valores: [{ coluna, r, n }] }]
 */
export function HeatmapCorrelacao({ linhas, colunas, minimoAmostra = 3 }) {
  if (!linhas || linhas.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-separate" style={{ borderSpacing: '2px' }}>
        <thead>
          <tr>
            <th className="text-left font-semibold px-2 py-1 sticky left-0 bg-white">Feature</th>
            {colunas.map((c) => (
              <th key={c} className="px-2 py-1 font-semibold text-center align-bottom">
                <span className="block max-w-[92px] mx-auto leading-tight">{c}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.label}>
              <th
                className="text-left font-normal px-2 py-1 whitespace-nowrap sticky left-0 bg-white"
                style={{ color: TINTA_SECUNDARIA }}
              >
                {linha.label}
              </th>
              {linha.valores.map((celula, i) => {
                const semDados = celula.r === null || celula.n < minimoAmostra;
                return (
                  <td
                    key={i}
                    className="text-center px-2 py-1.5 rounded tabular-nums"
                    style={{
                      backgroundColor: semDados ? '#f9f9f7' : corCorrelacao(celula.r),
                      color: semDados
                        ? '#898781'
                        : Math.abs(celula.r) > 0.5
                        ? '#ffffff'
                        : '#0b0b0b',
                      minWidth: 56
                    }}
                    title={`${linha.label} × ${celula.coluna}: r = ${
                      semDados ? 'amostra insuficiente' : formatarNumero(celula.r, 2)
                    } (n = ${celula.n})`}
                  >
                    {semDados ? '—' : formatarNumero(celula.r, 2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
        <span>Correlação negativa</span>
        <div className="flex">
          {[-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9].map((r) => (
            <span
              key={r}
              className="w-7 h-3.5 first:rounded-l last:rounded-r"
              style={{ backgroundColor: corCorrelacao(r) }}
              aria-hidden="true"
            />
          ))}
        </div>
        <span>positiva</span>
      </div>
    </div>
  );
}
