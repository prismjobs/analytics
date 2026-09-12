import React, { useMemo } from 'react';
import { ChartCard } from './ChartCard';
import { RankingBarras } from './RankingBarras';
import { BolhasChart } from './BolhasChart';
import { calcularCrescimento, regiaoDe, media } from '../../lib/metrics';
import { formatarNumero } from '../../lib/viz';

const MINIMO_POR_REGIAO = 1;

/**
 * Agrupa por região para responder duas coisas diferentes: onde há mais
 * demanda (visitantes) e onde essa demanda ainda está crescendo (crescimento).
 * O gráfico de bolhas junta as duas com a densidade de concorrentes.
 */
export function SecaoRegioes({ ads }) {
  const porRegiao = useMemo(() => {
    const mapa = new Map();
    ads.forEach((ad) => {
      const regiao = regiaoDe(ad);
      if (!regiao) return;
      if (!mapa.has(regiao)) mapa.set(regiao, []);
      mapa.get(regiao).push(ad);
    });

    return [...mapa.entries()]
      .map(([regiao, doGrupo]) => {
        const crescimentos = doGrupo
          .map((ad) => calcularCrescimento(ad)?.absoluto ?? null)
          .filter((v) => v !== null);
        const visitantes = doGrupo
          .map((ad) => ad.visitors_atual)
          .filter((v) => v !== null && v !== undefined);

        return {
          regiao,
          concorrentes: doGrupo.length,
          mediaVisitantes: visitantes.length > 0 ? media(visitantes) : null,
          mediaCrescimento: crescimentos.length > 0 ? media(crescimentos) : null,
          comHistorico: crescimentos.length
        };
      })
      .filter((r) => r.concorrentes >= MINIMO_POR_REGIAO);
  }, [ads]);

  const rankingVisitantes = useMemo(
    () =>
      porRegiao
        .filter((r) => r.mediaVisitantes !== null)
        .sort((a, b) => b.mediaVisitantes - a.mediaVisitantes)
        .map((r) => ({
          nome: r.regiao,
          tituloCompleto: r.regiao,
          valor: r.mediaVisitantes,
          extra: [
            { label: 'Anúncios monitorados', valor: r.concorrentes },
            {
              label: 'Crescimento médio',
              valor:
                r.mediaCrescimento !== null ? formatarNumero(r.mediaCrescimento, 1) : '— (sem histórico)'
            }
          ]
        })),
    [porRegiao]
  );

  const rankingCrescimento = useMemo(
    () =>
      porRegiao
        .filter((r) => r.mediaCrescimento !== null)
        .sort((a, b) => b.mediaCrescimento - a.mediaCrescimento)
        .map((r) => ({
          nome: r.regiao,
          tituloCompleto: r.regiao,
          valor: r.mediaCrescimento,
          extra: [
            { label: 'Anúncios com histórico', valor: r.comHistorico },
            {
              label: 'Visitantes médios',
              valor: r.mediaVisitantes !== null ? formatarNumero(r.mediaVisitantes, 0) : '—'
            }
          ]
        })),
    [porRegiao]
  );

  const bolhas = useMemo(
    () =>
      porRegiao
        .filter((r) => r.mediaVisitantes !== null)
        .map((r) => ({
          x: r.concorrentes,
          y: r.mediaVisitantes,
          z: r.mediaCrescimento !== null ? Math.max(r.mediaCrescimento, 0) : 0,
          titulo: r.regiao,
          extra: [
            {
              label: 'Crescimento médio',
              valor:
                r.mediaCrescimento !== null
                  ? formatarNumero(r.mediaCrescimento, 1)
                  : '— (sem histórico)'
            }
          ]
        })),
    [porRegiao]
  );

  return (
    <div className="space-y-6">
      <ChartCard
        titulo="🗺️ Visitantes médios por região"
        subtitulo="Média do contador atual dos anúncios monitorados em cada região"
        pergunta="Quais regiões concentram mais audiência?"
        vazio={
          rankingVisitantes.length === 0
            ? 'Nenhum anúncio com região capturada ainda.'
            : null
        }
        nota="É a média dos anúncios que VOCÊ monitora em cada região — não uma amostra do mercado inteiro. Regiões com 1 ou 2 anúncios oscilam muito."
        tabela={{
          colunas: ['Região', 'Visitantes médios', 'Anúncios'],
          linhas: rankingVisitantes.map((d) => [
            d.nome,
            formatarNumero(d.valor, 0),
            d.extra[0].valor
          ])
        }}
      >
        <RankingBarras dados={rankingVisitantes} rotuloValor="Visitantes médios" larguraNomes={150} />
      </ChartCard>

      <ChartCard
        titulo="📈 Crescimento médio por região"
        subtitulo="Média do crescimento de visitantes no período monitorado"
        pergunta="Onde a audiência está crescendo agora, não só onde ela já é grande?"
        vazio={
          rankingCrescimento.length === 0
            ? 'Precisa de anúncios com 2 ou mais capturas para calcular crescimento por região.'
            : null
        }
        tabela={{
          colunas: ['Região', 'Crescimento médio', 'Anúncios com histórico'],
          linhas: rankingCrescimento.map((d) => [
            d.nome,
            formatarNumero(d.valor, 1),
            d.extra[0].valor
          ])
        }}
      >
        <RankingBarras
          dados={rankingCrescimento}
          rotuloValor="Crescimento médio"
          decimais={1}
          larguraNomes={150}
          porSinal
        />
      </ChartCard>

      <ChartCard
        titulo="🫧 Concorrência × audiência × crescimento"
        subtitulo="X = anúncios monitorados na região · Y = visitantes médios · tamanho = crescimento médio"
        pergunta="Onde há audiência alta com pouca concorrência? (canto superior esquerdo)"
        vazio={bolhas.length === 0 ? 'Nenhuma região com dados suficientes ainda.' : null}
        nota="Bolhas sem tamanho visível são regiões sem histórico de crescimento ou com crescimento zero."
        tabela={{
          colunas: ['Região', 'Anúncios', 'Visitantes médios', 'Crescimento médio'],
          linhas: bolhas.map((b) => [
            b.titulo,
            b.x,
            formatarNumero(b.y, 0),
            formatarNumero(b.z, 1)
          ])
        }}
      >
        <BolhasChart
          pontos={bolhas}
          rotuloX="Anúncios na região"
          rotuloY="Visitantes médios"
          rotuloZ="Crescimento médio"
          decimaisZ={1}
        />
      </ChartCard>
    </div>
  );
}
