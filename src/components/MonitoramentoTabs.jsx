import React, { useState } from 'react';
import { MonitoramentoModal } from './MonitoramentoModal';

export function MonitoramentoTabs({
  monitoramentos,
  monitoramentoAtivoId,
  onSelecionar,
  onCriar,
  onEditar,
  onExcluir,
  contagemPorMonitoramento
}) {
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [menuAbertoId, setMenuAbertoId] = useState(null);

  const handleSalvar = async (dados) => {
    if (editando) {
      await onEditar(editando.id, dados);
    } else {
      const novo = await onCriar(dados);
      onSelecionar(novo.id);
    }
    setEditando(null);
  };

  const handleExcluir = (m) => {
    setMenuAbertoId(null);
    const qtd = contagemPorMonitoramento[m.id] || 0;
    const aviso =
      qtd > 0
        ? `Excluir "${m.nome}"? Os ${qtd} anúncio(s) deste grupo NÃO serão apagados — apenas ficarão sem grupo definido.`
        : `Excluir "${m.nome}"?`;
    if (window.confirm(aviso)) {
      onExcluir(m.id);
      if (monitoramentoAtivoId === m.id) onSelecionar('todos');
    }
  };

  return (
    <div className="flex items-center gap-1 border-b bg-white px-2 overflow-x-auto">
      <button
        onClick={() => onSelecionar('todos')}
        className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
          monitoramentoAtivoId === 'todos'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        Todos os anúncios
      </button>

      <button
        onClick={() => onSelecionar('sem-grupo')}
        className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
          monitoramentoAtivoId === 'sem-grupo'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        Sem grupo
      </button>

      {monitoramentos.map((m) => (
        <div key={m.id} className="relative">
          <button
            onClick={() => onSelecionar(m.id)}
            onDoubleClick={() => setMenuAbertoId(m.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition group ${
              monitoramentoAtivoId === m.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.cor }}></span>
            {m.nome}
            <span className="text-xs text-gray-400">({contagemPorMonitoramento[m.id] || 0})</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                setMenuAbertoId(menuAbertoId === m.id ? null : m.id);
              }}
              className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 ml-1"
            >
              ⚙️
            </span>
          </button>

          {menuAbertoId === m.id && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg py-1 z-30 w-36">
              <button
                onClick={() => {
                  setEditando(m);
                  setShowModal(true);
                  setMenuAbertoId(null);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
              >
                ✏️ Editar
              </button>
              <button
                onClick={() => handleExcluir(m)}
                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50"
              >
                🗑️ Excluir
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={() => {
          setEditando(null);
          setShowModal(true);
        }}
        className="px-3 py-3 text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap font-medium"
      >
        + Novo
      </button>

      <MonitoramentoModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditando(null);
        }}
        onSave={handleSalvar}
        monitoramentoEditando={editando}
      />
    </div>
  );
}
