import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

function formatarDataHora(isoString) {
  if (!isoString) return '—';
  const data = new Date(isoString);
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatarDataCurta(isoString) {
  if (!isoString) return '—';
  const data = new Date(isoString);
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/**
 * Converte a descrição em HTML (armazenada em ad.descricao) para texto
 * plano preservando quebras de parágrafo. Fazemos essa conversão aqui no
 * frontend — em vez de usar dangerouslySetInnerHTML — para nunca renderizar
 * HTML de terceiros diretamente na página (evita risco de XSS vindo do
 * texto do próprio anúncio raspado).
 */
function htmlParaTextoComQuebras(html) {
  if (!html) return '';
  return html
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Monta a tabela de histórico já com a variação calculada
 * entre cada captura e a captura anterior.
 */
function montarHistorico(snapshots) {
  const ordenado = [...(snapshots || [])].sort(
    (a, b) => new Date(a.data_snapshot) - new Date(b.data_snapshot)
  );

  return ordenado.map((snap, idx) => {
    const anterior = idx > 0 ? ordenado[idx - 1].visitors : null;
    const variacao = anterior !== null ? snap.visitors - anterior : null;
    return {
      ...snap,
      variacao,
      chartLabel: formatarDataCurta(snap.data_snapshot)
    };
  });
}

/**
 * Seção recolhível. Só o histórico de visitantes abre por padrão — o resto
 * fica fechado para o modal não virar uma barra de rolagem infinita, mas a
 * contagem no cabeçalho já diz o que tem dentro sem precisar abrir.
 */
function SecaoRecolhivel({ titulo, contagem, abertaInicialmente = false, children }) {
  const [aberta, setAberta] = useState(abertaInicialmente);

  return (
    <section className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
      >
        <span className="font-semibold text-gray-900">
          {titulo}
          {contagem !== undefined && contagem !== null && (
            <span className="ml-2 text-sm font-normal text-gray-500">({contagem})</span>
          )}
        </span>
        <span className="text-gray-400 text-sm shrink-0">{aberta ? '▲ recolher' : '▼ expandir'}</span>
      </button>
      {aberta && <div className="p-4">{children}</div>}
    </section>
  );
}

/**
 * Visualizador de fotos por cima do modal, sem sair da página.
 *
 * Fica num z-index acima do modal de detalhes (que já é uma caixa suspensa),
 * então abrir a foto não fecha nem rola o conteúdo de trás. Navega com as
 * setas do teclado e fecha com Esc.
 */
function Lightbox({ fotos, indice, onFechar, onNavegar }) {
  const foto = fotos[indice];

  const aoTeclar = useCallback(
    (evento) => {
      if (evento.key === 'Escape') onFechar();
      if (evento.key === 'ArrowRight') onNavegar(1);
      if (evento.key === 'ArrowLeft') onNavegar(-1);
    },
    [onFechar, onNavegar]
  );

  useEffect(() => {
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aoTeclar]);

  if (!foto) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex flex-col items-center justify-center p-4"
      onClick={onFechar}
    >
      <div className="absolute top-3 right-3 flex items-center gap-3">
        <span className="text-white text-sm">
          {indice + 1} / {fotos.length}
        </span>
        <button
          onClick={onFechar}
          className="text-white text-3xl leading-none hover:text-gray-300"
          aria-label="Fechar foto"
        >
          ×
        </button>
      </div>

      <img
        src={foto.url_foto}
        alt={`Foto ${indice + 1}`}
        className="max-h-[80vh] max-w-full object-contain rounded"
        onClick={(e) => e.stopPropagation()}
      />

      {fotos.length > 1 && (
        <div className="flex items-center gap-4 mt-4" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onNavegar(-1)}
            className="px-4 py-2 bg-white bg-opacity-10 text-white rounded-lg hover:bg-opacity-20"
          >
            ‹ Anterior
          </button>
          <button
            onClick={() => onNavegar(1)}
            className="px-4 py-2 bg-white bg-opacity-10 text-white rounded-lg hover:bg-opacity-20"
          >
            Próxima ›
          </button>
        </div>
      )}

      <p className="text-gray-400 text-xs mt-3" onClick={(e) => e.stopPropagation()}>
        Use as setas ← → para navegar e Esc para fechar. Clique fora da imagem
        também fecha.
      </p>
    </div>
  );
}

export function AdDetailModal({ ad, isOpen, onClose, onRecapturar, recapturando }) {
  const [fotoAberta, setFotoAberta] = useState(null);

  // Fecha o visualizador quando troca de anúncio ou o modal fecha, para não
  // reabrir mostrando a foto do anúncio anterior.
  useEffect(() => {
    setFotoAberta(null);
  }, [ad?.id, isOpen]);

  if (!isOpen || !ad) return null;

  const historico = montarHistorico(ad.snapshots);
  const fotos = [...(ad.fotos || [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const servicos = ad.servicos || [];
  const precos = ad.precos || [];

  const totalVisitantesPeriodo =
    historico.length >= 2
      ? historico[historico.length - 1].visitors - historico[0].visitors
      : null;

  // Prioriza o HTML bruto (preserva parágrafos); usa o texto plano salvo
  // no banco como reserva, para anúncios cadastrados antes desta correção
  const descricaoTexto =
    htmlParaTextoComQuebras(ad.descricao) || ad.descricao_plain || '';

  const navegarFoto = (passo) =>
    setFotoAberta((atual) => {
      if (atual === null) return null;
      return (atual + passo + fotos.length) % fotos.length;
    });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-start z-10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold">{ad.titulo}</h2>
              {ad.offline && (
                <span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  ⚠ fora do ar
                  {ad.offline_desde ? ` desde ${formatarDataCurta(ad.offline_desde)}` : ''}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {ad.localizacao || ad.regiao || 'Localização não informada'}
              {ad.tipo_anuncio && ` • ${ad.tipo_anuncio}`}
            </p>
            <div className="flex items-center gap-3 flex-wrap mt-1">
              <a
                href={ad.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs"
              >
                Abrir anúncio original ↗
              </a>
              {ad.telefone && (
                <a
                  href={`tel:${ad.telefone}`}
                  className="text-xs bg-green-50 text-green-800 px-2 py-0.5 rounded-full hover:bg-green-100"
                  title={
                    ad.telefone_capturado_em
                      ? `Telefone capturado em ${formatarDataHora(ad.telefone_capturado_em)}`
                      : undefined
                  }
                >
                  📞 {ad.telefone}
                </a>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none shrink-0"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-3">
          {/* ===== HISTÓRICO DE VISITANTES (única seção aberta por padrão) ===== */}
          <SecaoRecolhivel
            titulo="📈 Histórico de visitantes"
            contagem={`${historico.length} ${historico.length === 1 ? 'captura' : 'capturas'}`}
            abertaInicialmente
          >
            {totalVisitantesPeriodo !== null && (
              <div className="flex justify-end mb-3">
                <span
                  className={`text-sm font-semibold px-3 py-1 rounded-full ${
                    totalVisitantesPeriodo > 0
                      ? 'bg-green-100 text-green-700'
                      : totalVisitantesPeriodo < 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {totalVisitantesPeriodo > 0 ? '▲ +' : totalVisitantesPeriodo < 0 ? '▼ ' : '■ '}
                  {totalVisitantesPeriodo} desde a 1ª captura
                </span>
              </div>
            )}

            {historico.length === 0 && (
              <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
                Nenhuma captura registrada ainda. Clique em "🔄 Visitantes" (na linha
                deste anúncio) ou em "Atualizar visitantes" para começar a acumular
                histórico.
              </p>
            )}

            {historico.length === 1 && (
              <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
                Apenas 1 captura registrada ({historico[0].visitors} visitantes em{' '}
                {formatarDataHora(historico[0].data_snapshot)}). Atualize novamente em
                outro dia para começar a ver a evolução.
              </p>
            )}

            {historico.length >= 2 && (
              <div className="mb-4">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={historico}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="chartLabel" />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      labelFormatter={(_, payload) =>
                        payload?.[0]
                          ? formatarDataHora(payload[0].payload.data_snapshot)
                          : ''
                      }
                      formatter={(value) => [value, 'Visitantes']}
                    />
                    <Line
                      type="monotone"
                      dataKey="visitors"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {historico.length > 0 && (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Data da captura</th>
                      <th className="px-3 py-2 text-center">Visitantes</th>
                      <th className="px-3 py-2 text-center">Variação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...historico].reverse().map((snap, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{formatarDataHora(snap.data_snapshot)}</td>
                        <td className="px-3 py-2 text-center font-medium">{snap.visitors}</td>
                        <td className="px-3 py-2 text-center">
                          {snap.variacao === null ? (
                            <span className="text-gray-400">— (1ª captura)</span>
                          ) : snap.variacao > 0 ? (
                            <span className="text-green-600 font-medium">↑ +{snap.variacao}</span>
                          ) : snap.variacao < 0 ? (
                            <span className="text-red-600 font-medium">↓ {snap.variacao}</span>
                          ) : (
                            <span className="text-gray-500">→ 0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SecaoRecolhivel>

          {/* ===== DESCRIÇÃO ===== */}
          <SecaoRecolhivel
            titulo="📝 Descrição"
            contagem={descricaoTexto ? `${descricaoTexto.length} caracteres` : 'vazia'}
          >
            {descricaoTexto ? (
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-line max-h-64 overflow-y-auto">
                {descricaoTexto}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhuma descrição capturada.</p>
            )}
          </SecaoRecolhivel>

          {/* ===== FOTOS ===== */}
          <SecaoRecolhivel titulo="📷 Fotos" contagem={fotos.length}>
            {fotos.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma foto capturada.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {fotos.map((foto, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFotoAberta(i)}
                      className="block aspect-square rounded-lg overflow-hidden bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Ver foto ampliada"
                    >
                      <img
                        src={foto.url_foto}
                        alt={`Foto ${i + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Clique numa foto para ampliar aqui mesmo, sem sair da página.
                </p>
              </>
            )}
          </SecaoRecolhivel>

          {/* ===== INFORMAÇÕES GERAIS ===== */}
          <SecaoRecolhivel titulo="ℹ️ Informações gerais">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <InfoItem label="Telefone" value={ad.telefone} />
              <InfoItem label="Região" value={ad.regiao} />
              <InfoItem label="Localização" value={ad.localizacao} />
              <InfoItem label="Tipo" value={ad.tipo_anuncio} />
              <InfoItem label="Gênero" value={ad.genero} />
              <InfoItem label="Idade" value={ad.idade} />
              <InfoItem label="Etnia" value={ad.etnia} />
              <InfoItem label="Idiomas" value={ad.idiomas} />
              <InfoItem label="Público-alvo" value={ad.publico_alvo} />
              <InfoItem label="Membro desde" value={formatarDataCurta(ad.membro_desde)} />
              <InfoItem
                label="Última verificação"
                value={ad.ultima_verificacao ? formatarDataHora(ad.ultima_verificacao) : null}
              />
              <InfoItem
                label="Situação"
                value={ad.offline ? 'Fora do ar' : 'No ar na última verificação'}
              />
            </div>
          </SecaoRecolhivel>

          {/* ===== PREÇOS ===== */}
          <SecaoRecolhivel titulo="💷 Tabela de preços" contagem={precos.length}>
            {precos.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum preço capturado.</p>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Duração</th>
                      <th className="px-3 py-2 text-center">Incall</th>
                      <th className="px-3 py-2 text-center">Outcall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {precos.map((p, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{p.duracao}</td>
                        <td className="px-3 py-2 text-center">
                          {p.preco_incall != null ? `£${p.preco_incall}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {p.preco_outcall != null ? `£${p.preco_outcall}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SecaoRecolhivel>

          {/* ===== SERVIÇOS ===== */}
          <SecaoRecolhivel titulo="📋 Serviços" contagem={servicos.length}>
            {servicos.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum serviço capturado.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {servicos.map((s, i) => (
                  <span
                    key={i}
                    className={`text-xs px-3 py-1 rounded-full ${
                      s.incluido
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-400 line-through'
                    }`}
                  >
                    {s.nome_servico}
                    {s.preco_extra ? ` (+£${s.preco_extra})` : ''}
                  </span>
                ))}
              </div>
            )}
          </SecaoRecolhivel>

          {/* ===== RECAPTURA COMPLETA (ação destrutiva, fica por último) ===== */}
          {onRecapturar && (
            <div className="border border-dashed rounded-lg p-4 bg-gray-50">
              <p className="text-sm font-medium text-gray-800">Recapturar dados completos</p>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                A atualização normal mexe só no número de visitantes. Esta ação
                relê a página inteira e substitui descrição, fotos, preços e
                serviços pelos dados atuais do site. Use apenas quando você sabe
                que o anúncio está no ar e foi editado — se a página estiver fora
                do ar, a recaptura é abortada e nada é sobrescrito.
              </p>
              <button
                onClick={() => onRecapturar(ad)}
                disabled={recapturando}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50"
              >
                {recapturando ? 'Recapturando...' : '♻️ Recapturar dados completos'}
              </button>
            </div>
          )}
        </div>
      </div>

      {fotoAberta !== null && (
        <Lightbox
          fotos={fotos}
          indice={fotoAberta}
          onFechar={() => setFotoAberta(null)}
          onNavegar={navegarFoto}
        />
      )}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium break-words">{value || '—'}</p>
    </div>
  );
}
