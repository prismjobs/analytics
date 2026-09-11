import React from 'react';
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

export function AdDetailModal({ ad, isOpen, onClose }) {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-start z-10">
          <div>
            <h2 className="text-xl font-bold">{ad.titulo}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {ad.localizacao || ad.regiao || 'Localização não informada'}
              {ad.tipo_anuncio && ` • ${ad.tipo_anuncio}`}
            </p>
            <a
              href={ad.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-xs"
            >
              Abrir anúncio original ↗
            </a>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* ===== HISTÓRICO DE VISITANTES (prioridade principal) ===== */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">📈 Histórico de visitantes</h3>
              {totalVisitantesPeriodo !== null && (
                <span
                  className={`text-sm font-semibold px-3 py-1 rounded-full ${
                    totalVisitantesPeriodo > 0
                      ? 'bg-green-100 text-green-700'
                      : totalVisitantesPeriodo < 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {totalVisitantesPeriodo > 0 ? '+' : ''}
                  {totalVisitantesPeriodo} desde a 1ª captura
                </span>
              )}
            </div>

            {historico.length === 0 && (
              <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
                Nenhuma captura registrada ainda. Clique em "🔄 Atualizar" (na linha
                deste anúncio) ou em "Atualizar todos" para começar a acumular
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
          </section>

          {/* ===== DESCRIÇÃO ===== */}
          <section>
            <h3 className="text-lg font-semibold mb-3">📝 Descrição</h3>
            {descricaoTexto ? (
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-line max-h-64 overflow-y-auto">
                {descricaoTexto}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhuma descrição capturada.</p>
            )}
          </section>

          {/* ===== FOTOS ===== */}
          <section>
            <h3 className="text-lg font-semibold mb-3">📷 Fotos ({fotos.length})</h3>
            {fotos.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma foto capturada.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {fotos.map((foto, i) => (
                  <a
                    key={i}
                    href={foto.url_foto}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square rounded-lg overflow-hidden bg-gray-100"
                  >
                    <img
                      src={foto.url_foto}
                      alt={`Foto ${i + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            )}
          </section>

          {/* ===== INFORMAÇÕES GERAIS ===== */}
          <section>
            <h3 className="text-lg font-semibold mb-3">ℹ️ Informações gerais</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <InfoItem label="Região" value={ad.regiao} />
              <InfoItem label="Localização" value={ad.localizacao} />
              <InfoItem label="Tipo" value={ad.tipo_anuncio} />
              <InfoItem label="Gênero" value={ad.genero} />
              <InfoItem label="Idade" value={ad.idade} />
              <InfoItem label="Etnia" value={ad.etnia} />
              <InfoItem label="Idiomas" value={ad.idiomas} />
              <InfoItem label="Público-alvo" value={ad.publico_alvo} />
              <InfoItem label="Membro desde" value={formatarDataCurta(ad.membro_desde)} />
            </div>
          </section>

          {/* ===== PREÇOS ===== */}
          <section>
            <h3 className="text-lg font-semibold mb-3">💷 Tabela de preços</h3>
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
          </section>

          {/* ===== SERVIÇOS ===== */}
          <section>
            <h3 className="text-lg font-semibold mb-3">📋 Serviços ({servicos.length})</h3>
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
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}
