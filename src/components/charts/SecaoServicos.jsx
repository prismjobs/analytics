import React, { useMemo } from 'react';
import { ChartCard } from './ChartCard';
import { ScatterAnalitico } from './ScatterAnalitico';
import { RankingBarras } from './RankingBarras';
import {
  calcularCrescimento,
  numeroDeServicos,
  servicosComSobretaxa,
  nomesDeServicos,
  quartisPorMetrica
} from '../../lib/metrics';
import { formatarNumero, encurtar } from '../../lib/viz';

const TOPO_SERVICOS = 20;

export function SecaoServicos({ ads }) {
  const base = useMemo(
    () =>
      ads.map((ad) => ({
        ad,
        crescimento: calcularCrescimento(ad)?.absoluto ?? null,
        servicos: numeroDeServicos(ad),
        comSobretaxa: servicosComSobretaxa(ad)
      })),
    [ads]
  );

  const comCrescimento = useMemo(
    () => base.filter((b) => b.crescimento !== null),
    [base]
  );

  const dispersaoQuantidade = useMemo(
    () =>
      comCrescimento
        .filter((b) => b.servicos !== null)
        .map((b) => ({
          x: b.servicos,
          y: b.crescimento,
          titulo: b.ad.titulo,
          extra: [{ label: 'Com sobretaxa', valor: b.comSobretaxa ?? '—' }]
        })),
    [comCrescimento]
  );

  const dispersaoSobretaxa = useMemo(
    () =>
      comCrescimento
        .filter((b) => b.comSobretaxa !== null)
        .map((b) => ({
          x: b.comSobretaxa,
          y: b.crescimento,
          titulo: b.ad.titulo,
          extra: [{ label: 'Total de serviços', valor: b.servicos ?? '—' }]
        })),
    [comCrescimento]
  );

  // Frequência de cada serviço no top 25% em crescimento, com a frequência no
  // resto como referência: um serviço presente em 100% dos vencedores só é
  // interessante se NÃO estiver em 100% de todo mundo.
  const frequencias = useMemo(() => {
    const quartis = quartisPorMetrica(comCrescimento, (b) => b.crescimento);
    if (quartis.top.length === 0) return [];

    const contar = (grupo) => {
      const mapa = new Map();
      grupo.forEach((b) => {
        new Set(nomesDeServicos(b.ad)).forEach((nome) => {
          mapa.set(nome, (mapa.get(nome) || 0) + 1);
        });
      });
      return mapa;
    };

    const noTop = contar(quartis.top);
    const restantes = comCrescimento.filter((b) => !quartis.top.includes(b));
    const noResto = contar(restantes);

    return [...noTop.entries()]
      .map(([nome, quantidade]) => {
        const percTop = (quantidade / quartis.top.length) * 100;
        const percResto =
          restantes.length > 0 ? ((noResto.get(nome) || 0) / restantes.length) * 100 : null;
        return {
          nome: encurtar(nome, 28),
          tituloCompleto: nome,
          valor: percTop,
          percResto,
          extra: [
            { label: 'Anúncios do top 25%', valor: `${quantidade} de ${quartis.top.length}` },
            {
              label: 'Nos demais anúncios',
              valor: percResto !== null ? `${formatarNumero(percResto, 0)}%` : '—'
            },
            {
              label: 'Diferença',
              valor:
                percResto !== null
                  ? `${percTop - percResto >= 0 ? '+' : ''}${formatarNumero(percTop - percResto, 0)} p.p.`
                  : '—'
            }
          ]
        };
      })
      .sort((a, b) => b.valor - a.valor || (b.percResto ?? 0) - (a.percResto ?? 0))
      .slice(0, TOPO_SERVICOS);
  }, [comCrescimento]);

  return (
    <div className="space-y-6">
      <ChartCard
        titulo="📋 Nº de serviços × crescimento"
        subtitulo="Linha de tendência por mínimos quadrados; inclinação e r no rodapé"
        pergunta="Oferecer mais serviços atrai mais visitantes, ou dilui o posicionamento?"
        vazio={
          dispersaoQuantidade.length === 0
            ? 'Precisa de anúncios com serviços capturados e 2 ou mais capturas de visitantes.'
            : null
        }
        tabela={{
          colunas: ['Anúncio', 'Serviços', 'Crescimento'],
          linhas: dispersaoQuantidade.map((d) => [d.titulo, d.x, formatarNumero(d.y, 0)])
        }}
      >
        <ScatterAnalitico
          pontos={dispersaoQuantidade}
          rotuloX="Nº de serviços oferecidos"
          rotuloY="Crescimento de visitantes"
          corPor="desempenho"
          valorDesempenho={(p) => p.y}
          linhaZeroY
        />
      </ChartCard>

      <ChartCard
        titulo="➕ Serviços com sobretaxa × crescimento"
        subtitulo="Quantos serviços do anúncio custam um valor extra"
        pergunta="Cobrar extra por muitos itens afasta o visitante?"
        vazio={
          dispersaoSobretaxa.length === 0
            ? 'Nenhum anúncio com serviços de preço extra capturados e histórico de visitantes.'
            : null
        }
        tabela={{
          colunas: ['Anúncio', 'Serviços com sobretaxa', 'Crescimento'],
          linhas: dispersaoSobretaxa.map((d) => [d.titulo, d.x, formatarNumero(d.y, 0)])
        }}
      >
        <ScatterAnalitico
          pontos={dispersaoSobretaxa}
          rotuloX="Serviços com sobretaxa"
          rotuloY="Crescimento de visitantes"
          corPor="desempenho"
          valorDesempenho={(p) => p.y}
          linhaZeroY
        />
      </ChartCard>

      <ChartCard
        titulo="🥇 Serviços mais frequentes no top 25%"
        subtitulo="% dos anúncios que mais crescem em que o serviço aparece"
        pergunta="Que serviços os vencedores oferecem?"
        vazio={
          frequencias.length === 0
            ? 'Precisa de pelo menos 4 anúncios com serviços capturados e histórico de visitantes.'
            : null
        }
        nota="Compare sempre com a coluna “Nos demais anúncios” do tooltip ou da tabela: um serviço presente em todos os anúncios não explica nada, mesmo estando em 100% dos vencedores."
        tabela={{
          colunas: ['Serviço', '% no top 25%', '% nos demais'],
          linhas: frequencias.map((f) => [
            f.tituloCompleto,
            `${formatarNumero(f.valor, 0)}%`,
            f.percResto !== null ? `${formatarNumero(f.percResto, 0)}%` : '—'
          ])
        }}
      >
        <RankingBarras
          dados={frequencias}
          rotuloValor="% do top 25%"
          unidade="%"
          larguraNomes={180}
        />
      </ChartCard>
    </div>
  );
}
