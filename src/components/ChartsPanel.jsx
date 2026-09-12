import React, { useMemo, useState } from 'react';
import { StatTile } from './charts/StatTile';
import { SecaoRanking } from './charts/SecaoRanking';
import { SecaoFotos } from './charts/SecaoFotos';
import { SecaoRegioes } from './charts/SecaoRegioes';
import { SecaoDescricao } from './charts/SecaoDescricao';
import { SecaoPreco } from './charts/SecaoPreco';
import { SecaoServicos } from './charts/SecaoServicos';
import { SecaoCicloVida } from './charts/SecaoCicloVida';
import { SecaoVencedores } from './charts/SecaoVencedores';
import {
  calcularCrescimento,
  visitantesPorDia,
  snapshotsOrdenados,
  media,
  mediana
} from '../lib/metrics';

// A ordem das abas segue a prioridade de leitura: primeiro o que já é
// confiável com poucos dados (rankings), depois o que exige mais anúncios
// (correlações de texto) e mais semanas de captura (quadrante de seleção).
const ABAS = [
  { chave: 'ranking', label: '🏆 Ranking', componente: SecaoRanking },
  { chave: 'fotos', label: '📷 Fotos', componente: SecaoFotos },
  { chave: 'regioes', label: '🗺️ Regiões', componente: SecaoRegioes },
  { chave: 'descricao', label: '📝 Descrição', componente: SecaoDescricao },
  { chave: 'preco', label: '💷 Preço', componente: SecaoPreco },
  { chave: 'servicos', label: '📋 Serviços', componente: SecaoServicos },
  { chave: 'ciclo', label: '🔁 Ciclo de vida', componente: SecaoCicloVida },
  { chave: 'vencedores', label: '🎯 Vencedores', componente: SecaoVencedores }
];

export function ChartsPanel({ ads }) {
  const [abaAtiva, setAbaAtiva] = useState('ranking');

  const resumo = useMemo(() => {
    const crescimentos = ads
      .map((ad) => calcularCrescimento(ad))
      .filter((c) => c !== null);
    const velocidades = ads
      .map((ad) => visitantesPorDia(ad))
      .filter((v) => v !== null);
    const visitantes = ads
      .map((ad) => ad.visitors_atual)
      .filter((v) => v !== null && v !== undefined);

    const diasDeHistorico = crescimentos
      .map((c) => c.dias)
      .filter((d) => d !== null);

    return {
      totalAds: ads.length,
      comHistorico: crescimentos.length,
      semHistorico: ads.length - crescimentos.length,
      offline: ads.filter((ad) => ad.offline).length,
      capturas: ads.reduce((soma, ad) => soma + snapshotsOrdenados(ad).length, 0),
      visitantesTotais: visitantes.reduce((a, b) => a + b, 0),
      crescimentoTotal: crescimentos.reduce((soma, c) => soma + c.absoluto, 0),
      velocidadeMediana: velocidades.length > 0 ? mediana(velocidades) : null,
      janelaMedia: diasDeHistorico.length > 0 ? media(diasDeHistorico) : null
    };
  }, [ads]);

  const AbaAtual = ABAS.find((a) => a.chave === abaAtiva)?.componente || SecaoRanking;

  if (ads.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500 text-sm">
        Nenhum anúncio nesta visão. Adicione anúncios para começar a coletar
        dados — os gráficos de análise aparecem aqui.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ===== LINHA DE KPIs ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile rotulo="Anúncios monitorados" valor={resumo.totalAds} />
        <StatTile
          rotulo="Com histórico (2+ capturas)"
          valor={resumo.comHistorico}
          detalhe={
            resumo.semHistorico > 0
              ? `${resumo.semHistorico} ainda com 1 captura`
              : 'todos comparáveis'
          }
        />
        <StatTile rotulo="Capturas acumuladas" valor={resumo.capturas} />
        <StatTile rotulo="Visitantes somados" valor={resumo.visitantesTotais} />
        <StatTile
          rotulo="Crescimento no período"
          valor={resumo.crescimentoTotal}
          destaque
          detalhe={
            resumo.janelaMedia !== null
              ? `janela média de ${resumo.janelaMedia.toFixed(1)} dias`
              : null
          }
        />
        <StatTile
          rotulo="Velocidade mediana"
          valor={resumo.velocidadeMediana}
          decimais={2}
          sufixo=" /dia"
          detalhe="mediana, não média"
        />
      </div>

      {resumo.offline > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3">
          {resumo.offline}{' '}
          {resumo.offline === 1
            ? 'anúncio está marcado como fora do ar. Os dados dele foram preservados'
            : 'anúncios estão marcados como fora do ar. Os dados deles foram preservados'}{' '}
          e continuam contando nos gráficos históricos, mas não recebem mais
          novas capturas de visitantes.
        </div>
      )}

      {resumo.comHistorico === 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg p-3">
          Nenhum anúncio tem 2 capturas ainda, então tudo que depende de
          <strong> crescimento</strong> aparece vazio. Clique em "Atualizar
          visitantes" na tabela acima hoje e novamente em outro dia — a partir
          da segunda captura os gráficos começam a se preencher.
        </div>
      )}

      {/* ===== ABAS ===== */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex gap-1 overflow-x-auto border-b px-2 pt-2">
          {ABAS.map((aba) => (
            <button
              key={aba.chave}
              onClick={() => setAbaAtiva(aba.chave)}
              className={`px-3 py-2 text-sm whitespace-nowrap rounded-t-lg transition ${
                abaAtiva === aba.chave
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {aba.label}
            </button>
          ))}
        </div>

        <div className="p-3 bg-gray-50 rounded-b-lg">
          <AbaAtual ads={ads} />
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Tudo que envolve crescimento usa só os {resumo.comHistorico} de{' '}
        {resumo.totalAds} anúncios com 2 ou mais capturas. Cada gráfico tem um
        botão "Ver dados" que mostra a mesma informação em tabela.
      </p>
    </div>
  );
}
