import React, { useMemo } from 'react';
import { ChartCard } from './ChartCard';
import { ScatterAnalitico } from './ScatterAnalitico';
import { CurvasNormalizadas } from './CurvasNormalizadas';
import {
  calcularCrescimento,
  snapshotsOrdenados,
  diasDesde,
  antiguidadeContaDias
} from '../../lib/metrics';
import { formatarNumero, encurtar } from '../../lib/viz';

// Limite de séries sobrepostas: acima de 5 as cores deixam de ser
// distinguíveis com segurança, então mostramos os 5 maiores em crescimento.
const MAX_CURVAS = 5;
const DIA_MS = 1000 * 60 * 60 * 24;

export function SecaoCicloVida({ ads }) {
  const base = useMemo(
    () =>
      ads.map((ad) => ({
        ad,
        crescimento: calcularCrescimento(ad)?.absoluto ?? null,
        diasSemAtualizar: diasDesde(ad.data_ultima_atualizacao),
        antiguidade: antiguidadeContaDias(ad)
      })),
    [ads]
  );

  const dispersaoAtualizacao = useMemo(
    () =>
      base
        .filter((b) => b.diasSemAtualizar !== null && b.crescimento !== null)
        .map((b) => ({
          x: b.diasSemAtualizar,
          y: b.crescimento,
          titulo: b.ad.titulo
        })),
    [base]
  );

  const dispersaoAntiguidade = useMemo(
    () =>
      base
        .filter((b) => b.antiguidade !== null && b.ad.visitors_atual != null)
        .map((b) => ({
          x: b.antiguidade,
          y: b.ad.visitors_atual,
          titulo: b.ad.titulo,
          extra: [
            {
              label: 'Crescimento',
              valor: b.crescimento !== null ? formatarNumero(b.crescimento, 0) : '— (1 captura)'
            }
          ]
        })),
    [base]
  );

  // Curvas normalizadas: cada anúncio começa em 0 no dia da sua 1ª captura,
  // então as trajetórias ficam comparáveis mesmo tendo começado a ser
  // monitoradas em datas diferentes.
  const curvas = useMemo(() => {
    const candidatos = base
      .filter((b) => b.crescimento !== null && snapshotsOrdenados(b.ad).length >= 2)
      .sort((a, b) => b.crescimento - a.crescimento)
      .slice(0, MAX_CURVAS);

    if (candidatos.length === 0) return { series: [], dados: [] };

    const series = candidatos.map((b, i) => ({
      chave: `s${i}`,
      label: encurtar(b.ad.titulo, 28),
      valorFinal: b.crescimento
    }));

    const pontosPorDia = new Map();
    candidatos.forEach((b, i) => {
      const snaps = snapshotsOrdenados(b.ad);
      const inicio = new Date(snaps[0].data_snapshot).getTime();
      const baseVisitors = snaps[0].visitors;
      snaps.forEach((snap) => {
        const dia = Math.round((new Date(snap.data_snapshot).getTime() - inicio) / DIA_MS);
        if (!pontosPorDia.has(dia)) pontosPorDia.set(dia, { dia });
        pontosPorDia.get(dia)[`s${i}`] = snap.visitors - baseVisitors;
      });
    });

    const dados = [...pontosPorDia.values()].sort((a, b) => a.dia - b.dia);
    return { series, dados };
  }, [base]);

  return (
    <div className="space-y-6">
      <ChartCard
        titulo="🔁 Curvas de crescimento sobrepostas"
        subtitulo={`Os ${curvas.series.length} anúncios que mais cresceram, alinhados no dia 0 da 1ª captura`}
        pergunta="O sucesso vem de um estouro inicial que satura, ou de crescimento constante?"
        vazio={
          curvas.dados.length === 0
            ? 'Precisa de anúncios com 2 ou mais capturas. Atualize os anúncios em dias diferentes para desenhar a trajetória.'
            : null
        }
        nota="Eixo Y = visitantes ganhos desde a 1ª captura de cada anúncio (todos partem de 0). Uma curva que “deita” está saturando."
        tabela={{
          colunas: ['Dia', ...curvas.series.map((s) => s.label)],
          linhas: curvas.dados.map((d) => [
            d.dia,
            ...curvas.series.map((s) => (d[s.chave] ?? '—'))
          ])
        }}
      >
        <CurvasNormalizadas series={curvas.series} dados={curvas.dados} />
      </ChartCard>

      <ChartCard
        titulo="🕓 Dias sem atualizar × crescimento"
        subtitulo="Tempo desde a última atualização registrada do anúncio"
        pergunta="Anúncio parado perde tração?"
        vazio={
          dispersaoAtualizacao.length === 0
            ? 'Precisa de anúncios com data de última atualização e 2 ou mais capturas.'
            : null
        }
        nota="A data usada é a da última atualização registrada aqui no sistema, que é a melhor aproximação disponível da renovação do anúncio no site."
        tabela={{
          colunas: ['Anúncio', 'Dias sem atualizar', 'Crescimento'],
          linhas: dispersaoAtualizacao.map((d) => [
            d.titulo,
            formatarNumero(d.x, 1),
            formatarNumero(d.y, 0)
          ])
        }}
      >
        <ScatterAnalitico
          pontos={dispersaoAtualizacao}
          rotuloX="Dias desde a última atualização"
          rotuloY="Crescimento de visitantes"
          decimaisX={1}
          corPor="desempenho"
          valorDesempenho={(p) => p.y}
          linhaZeroY
        />
      </ChartCard>

      <ChartCard
        titulo="👤 Antiguidade da conta × visitantes atuais"
        subtitulo="Dias desde o “membro desde” do anunciante"
        pergunta="Conta antiga acumula audiência, ou o mercado só olha o anúncio novo?"
        vazio={
          dispersaoAntiguidade.length === 0
            ? 'Nenhum anúncio com a data de “membro desde” capturada.'
            : null
        }
        tabela={{
          colunas: ['Anúncio', 'Dias de conta', 'Visitantes atuais'],
          linhas: dispersaoAntiguidade.map((d) => [
            d.titulo,
            formatarNumero(d.x, 0),
            formatarNumero(d.y, 0)
          ])
        }}
      >
        <ScatterAnalitico
          pontos={dispersaoAntiguidade}
          rotuloX="Dias desde que é membro"
          rotuloY="Visitantes atuais"
        />
      </ChartCard>
    </div>
  );
}
