import React, { useState } from 'react';

/**
 * Moldura padrão de todo gráfico do painel.
 *
 * Inclui de série a "visão em tabela": alguns tons da paleta ficam abaixo de
 * 3:1 de contraste com o fundo branco do cartão, e a regra de acessibilidade
 * adotada aqui é que nenhum dado exista só como cor — sempre há rótulo visível
 * ou a tabela com os números.
 */
export function ChartCard({
  titulo,
  subtitulo,
  pergunta,
  nota,
  vazio,
  tabela,
  acoes,
  children
}) {
  const [mostrarTabela, setMostrarTabela] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{titulo}</h3>
          {subtitulo && <p className="text-xs text-gray-500 mt-0.5">{subtitulo}</p>}
          {pergunta && (
            <p className="text-xs text-gray-400 mt-1 italic">{pergunta}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {acoes}
          {tabela && !vazio && (
            <button
              onClick={() => setMostrarTabela((v) => !v)}
              className="text-xs text-blue-700 hover:underline whitespace-nowrap"
            >
              {mostrarTabela ? 'Ver gráfico' : 'Ver dados'}
            </button>
          )}
        </div>
      </div>

      {vazio ? (
        <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">{vazio}</p>
      ) : mostrarTabela && tabela ? (
        <TabelaDados tabela={tabela} />
      ) : (
        children
      )}

      {nota && !vazio && <p className="text-xs text-gray-400 mt-3">{nota}</p>}
    </div>
  );
}

function TabelaDados({ tabela }) {
  return (
    <div className="overflow-auto max-h-80 border rounded-lg">
      <table className="w-full text-xs">
        <thead className="bg-gray-100 sticky top-0">
          <tr>
            {tabela.colunas.map((c) => (
              <th key={c} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {tabela.linhas.map((linha, i) => (
            <tr key={i} className="border-t">
              {linha.map((celula, j) => (
                <td key={j} className="px-2 py-1.5 whitespace-nowrap">
                  {celula === null || celula === undefined ? '—' : celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Caixa de tooltip compartilhada por todos os gráficos. */
export function CaixaTooltip({ titulo, linhas }) {
  return (
    <div className="bg-white px-3 py-2 border rounded-lg shadow-lg text-xs max-w-[240px]">
      {titulo && <p className="font-medium text-gray-900 mb-1 break-words">{titulo}</p>}
      {linhas.map((l, i) => (
        <p key={i} className="text-gray-600">
          {l.label}: <span className="font-medium text-gray-900">{l.valor}</span>
        </p>
      ))}
    </div>
  );
}

/** Legenda em texto: identidade nunca depende só da cor. */
export function LegendaSeries({ itens }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
      {itens.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-600">
          <span
            className="inline-block w-3 h-3 rounded-sm shrink-0"
            style={{ backgroundColor: item.cor }}
            aria-hidden="true"
          />
          <span className="truncate max-w-[180px]">{item.label}</span>
          {item.valor !== undefined && (
            <span className="text-gray-900 font-medium tabular-nums">{item.valor}</span>
          )}
        </div>
      ))}
    </div>
  );
}
