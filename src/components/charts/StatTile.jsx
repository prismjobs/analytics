import React from 'react';
import { formatarNumero } from '../../lib/viz';

/**
 * Quando a história é UM número, o número é o gráfico.
 */
export function StatTile({ rotulo, valor, decimais = 0, sufixo = '', detalhe, destaque }) {
  const vazio = valor === null || valor === undefined || Number.isNaN(valor);

  return (
    <div className={`rounded-lg p-3 ${destaque ? 'bg-blue-50' : 'bg-white shadow-md'}`}>
      <p className="text-xs text-gray-500">{rotulo}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-0.5">
        {vazio ? '—' : `${formatarNumero(valor, decimais)}${sufixo}`}
      </p>
      {detalhe && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{detalhe}</p>}
    </div>
  );
}
