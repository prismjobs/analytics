import React, { useMemo } from 'react';
import { ChartCard } from './ChartCard';
import { RankingBarras } from './RankingBarras';
import { ScatterAnalitico } from './ScatterAnalitico';
import {
  calcularCrescimento,
  visitantesPorDia,
  aceleracaoRecente,
  idadeAnuncioDias,
  visitantesPorDiaDeVida
} from '../../lib/metrics';
import { encurtar, formatarNumero, simboloPorSinal } from '../../lib/viz';

const TOPO = 20;

/**
 * Três leituras de "sucesso" que contam histórias diferentes:
 * quem cresce mais no total, quem cresce mais rápido, e quem está acelerando
 * agora. Um anúncio antigo pode liderar o total sem crescer mais nada.
 */
export function SecaoRanking({ ads }) {
  const base = useMemo(
    () =>
      ads.map((ad) => ({
        ad,
        crescimento: calcularCrescimento(ad),
        porDia: visitantesPorDia(ad),
        aceleracao: aceleracaoRecente(ad),
        idade: idadeAnuncioDias(ad),
        porDiaDeVida: visitantesPorDiaDeVida(ad)
      })),
    [ads]
  );

  const rankingCrescimento = useMemo(
    () =>
      base
        .filter((b) => b.crescimento)
        .sort((a, b) => b.crescimento.absoluto - a.crescimento.absoluto)
        .slice(0, TOPO)
        .map((b) => ({
          nome: encurtar(b.ad.titulo, 30),
          tituloCompleto: b.ad.titulo,
          valor: b.crescimento.absoluto,
          extra: [
            {
              label: 'Período',
              valor: `${formatarNumero(b.crescimento.dias, 1)} dias`
            },
            {
              label: 'Variação',
              valor:
                b.crescimento.percentual !== null
                  ? `${formatarNumero(b.crescimento.percentual, 0)}%`
                  : '—'
            }
          ]
        })),
    [base]
  );

  const rankingVelocidade = useMemo(
    () =>
      base
        .filter((b) => b.porDia !== null)
        .sort((a, b) => b.porDia - a.porDia)
        .slice(0, TOPO)
        .map((b) => ({
          nome: encurtar(b.ad.titulo, 30),
          tituloCompleto: b.ad.titulo,
          valor: b.porDia,
          extra: [
            { label: 'Crescimento total', valor: formatarNumero(b.crescimento.absoluto, 0) },
            { label: 'Dias monitorados', valor: formatarNumero(b.crescimento.dias, 1) }
          ]
        })),
    [base]
  );

  const rankingAceleracao = useMemo(
    () =>
      base
        .filter((b) => b.aceleracao)
        .sort((a, b) => b.aceleracao.delta - a.aceleracao.delta)
        .slice(0, TOPO)
        .map((b) => ({
          nome: encurtar(b.ad.titulo, 30),
          tituloCompleto: b.ad.titulo,
          valor: b.aceleracao.delta,
          extra: [
            {
              label: 'Ritmo recente',
              valor: `${formatarNumero(b.aceleracao.recentePorDia, 1)}/dia`
            },
            {
              label: 'Média histórica',
              valor: `${formatarNumero(b.aceleracao.historicoPorDia, 1)}/dia`
            },
            {
              label: 'Situação',
              valor: b.aceleracao.delta > 0 ? '▲ acelerando' : b.aceleracao.delta < 0 ? '▼ desacelerando' : '■ estável'
            }
          ]
        })),
    [base]
  );

  const dispersaoIdade = useMemo(
    () =>
      base
        .filter((b) => b.idade !== null && b.porDiaDeVida !== null)
        .map((b) => ({
          x: b.idade,
          y: b.porDiaDeVida,
          titulo: b.ad.titulo,
          extra: [{ label: 'Visitantes hoje', valor: formatarNumero(b.ad.visitors_atual, 0) }]
        })),
    [base]
  );

  return (
    <div className="space-y-6">
      <ChartCard
        titulo="🏆 Ranking de crescimento total"
        subtitulo={`Visitantes ganhos da 1ª até a última captura — top ${rankingCrescimento.length}`}
        vazio={
          rankingCrescimento.length === 0
            ? 'Nenhum anúncio com 2 ou mais capturas ainda. Atualize os anúncios em dias diferentes para acumular histórico.'
            : null
        }
        nota="Mede volume acumulado no período monitorado — favorece quem está sendo acompanhado há mais tempo."
        tabela={{
          colunas: ['Anúncio', 'Crescimento'],
          linhas: rankingCrescimento.map((d) => [d.tituloCompleto, formatarNumero(d.valor, 0)])
        }}
      >
        <RankingBarras dados={rankingCrescimento} rotuloValor="Crescimento" />
      </ChartCard>

      <ChartCard
        titulo="⚡ Velocidade — visitantes por dia"
        subtitulo="Crescimento total ÷ dias entre a 1ª e a última captura"
        pergunta="Quem ganha mais visitantes por dia, independentemente de há quanto tempo é monitorado?"
        vazio={
          rankingVelocidade.length === 0
            ? 'Precisa de pelo menos 2 capturas em datas diferentes para calcular velocidade.'
            : null
        }
        tabela={{
          colunas: ['Anúncio', 'Visitantes/dia'],
          linhas: rankingVelocidade.map((d) => [d.tituloCompleto, formatarNumero(d.valor, 2)])
        }}
      >
        <RankingBarras dados={rankingVelocidade} rotuloValor="Visitantes/dia" decimais={2} />
      </ChartCard>

      <ChartCard
        titulo="🚀 Aceleração recente"
        subtitulo="Ritmo dos últimos 7 dias comparado à média histórica do próprio anúncio"
        pergunta="Quem está em tendência de alta agora — e quem já passou do pico?"
        vazio={
          rankingAceleracao.length === 0
            ? 'Precisa de 3 capturas ou mais, sendo pelo menos uma com mais de 7 dias, para comparar ritmo recente com o histórico.'
            : null
        }
        nota="▲ verde = acelerando, ▼ vermelho = desacelerando. O valor é a diferença de visitantes/dia entre a fase recente e a média histórica."
        tabela={{
          colunas: ['Anúncio', 'Diferença (visitantes/dia)', 'Situação'],
          linhas: rankingAceleracao.map((d) => [
            d.tituloCompleto,
            formatarNumero(d.valor, 2),
            `${simboloPorSinal(d.valor)} ${d.valor > 0 ? 'acelerando' : d.valor < 0 ? 'desacelerando' : 'estável'}`
          ])
        }}
      >
        <RankingBarras
          dados={rankingAceleracao}
          rotuloValor="Diferença de ritmo"
          decimais={2}
          porSinal
        />
      </ChartCard>

      <ChartCard
        titulo="⏳ Idade do anúncio × visitantes por dia de vida"
        subtitulo="Visitantes acumulados ÷ dias desde a publicação"
        pergunta="Separa a explosão recente (esquerda, alto) do sucesso sustentado (direita, alto)."
        vazio={
          dispersaoIdade.length === 0
            ? 'Nenhum anúncio com data de publicação capturada ainda.'
            : null
        }
        tabela={{
          colunas: ['Anúncio', 'Idade (dias)', 'Visitantes/dia de vida'],
          linhas: dispersaoIdade.map((d) => [
            d.titulo,
            formatarNumero(d.x, 0),
            formatarNumero(d.y, 2)
          ])
        }}
      >
        <ScatterAnalitico
          pontos={dispersaoIdade}
          rotuloX="Idade do anúncio (dias)"
          rotuloY="Visitantes/dia de vida"
          decimaisY={1}
          altura={320}
        />
      </ChartCard>
    </div>
  );
}
