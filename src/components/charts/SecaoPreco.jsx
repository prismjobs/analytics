import React, { useMemo } from 'react';
import { ChartCard } from './ChartCard';
import { ScatterAnalitico } from './ScatterAnalitico';
import { Histograma } from './Histograma';
import { ComparacaoBarras } from './ComparacaoBarras';
import {
  calcularCrescimento,
  precoOutcall1Hora,
  completudePreco,
  media,
  mediana
} from '../../lib/metrics';
import { formatarNumero } from '../../lib/viz';

const FAIXAS_PRECO = [
  { faixa: 'até £80', teste: (p) => p <= 80 },
  { faixa: '£81–120', teste: (p) => p > 80 && p <= 120 },
  { faixa: '£121–160', teste: (p) => p > 120 && p <= 160 },
  { faixa: '£161–200', teste: (p) => p > 160 && p <= 200 },
  { faixa: 'acima de £200', teste: (p) => p > 200 }
];

// Considera "tabela completa" quem preencheu ao menos 80% das combinações
// duração × incall/outcall que o anúncio expõe.
const CORTE_COMPLETUDE = 0.8;

export function SecaoPreco({ ads }) {
  const base = useMemo(
    () =>
      ads.map((ad) => ({
        ad,
        crescimento: calcularCrescimento(ad)?.absoluto ?? null,
        preco: precoOutcall1Hora(ad),
        completude: completudePreco(ad)
      })),
    [ads]
  );

  const dispersao = useMemo(
    () =>
      base
        .filter((b) => b.preco !== null && b.crescimento !== null)
        .map((b) => ({
          x: b.preco,
          y: b.crescimento,
          titulo: b.ad.titulo,
          extra: [
            {
              label: 'Completude da tabela',
              valor:
                b.completude !== null ? `${formatarNumero(b.completude * 100, 0)}%` : '—'
            }
          ]
        })),
    [base]
  );

  const histograma = useMemo(() => {
    const comPreco = base.filter((b) => b.preco !== null);
    if (comPreco.length === 0) return [];
    return FAIXAS_PRECO.map((f) => {
      const doGrupo = comPreco.filter((b) => f.teste(b.preco));
      const crescimentos = doGrupo
        .map((b) => b.crescimento)
        .filter((v) => v !== null);
      return {
        faixa: f.faixa,
        quantidade: doGrupo.length,
        percentual: (doGrupo.length / comPreco.length) * 100,
        extra:
          crescimentos.length > 0
            ? [
                {
                  label: 'Crescimento médio',
                  valor: formatarNumero(media(crescimentos), 1)
                }
              ]
            : []
      };
    });
  }, [base]);

  const completudeComparada = useMemo(() => {
    const comDados = base.filter((b) => b.completude !== null && b.crescimento !== null);
    if (comDados.length < 2) return [];

    const completos = comDados.filter((b) => b.completude >= CORTE_COMPLETUDE);
    const incompletos = comDados.filter((b) => b.completude < CORTE_COMPLETUDE);
    if (completos.length === 0 || incompletos.length === 0) return [];

    const linhas = [
      {
        feature: 'Crescimento médio',
        a: media(completos.map((b) => b.crescimento)),
        b: media(incompletos.map((b) => b.crescimento)),
        decimais: 1
      },
      {
        feature: 'Crescimento mediano',
        a: mediana(completos.map((b) => b.crescimento)),
        b: mediana(incompletos.map((b) => b.crescimento)),
        decimais: 1
      },
      {
        feature: 'Visitantes atuais (média)',
        a: media(completos.map((b) => b.ad.visitors_atual).filter((v) => v != null)),
        b: media(incompletos.map((b) => b.ad.visitors_atual).filter((v) => v != null)),
        decimais: 0
      }
    ];

    return linhas
      .filter((l) => l.a !== null && l.b !== null)
      .map((l) => ({
        feature: l.feature,
        valorRealA: l.a,
        valorRealB: l.b,
        decimais: l.decimais,
        indiceA: l.b !== 0 ? (l.a / l.b) * 100 : null,
        indiceB: l.b !== 0 ? 100 : null
      }));
  }, [base]);

  const contagemCompletude = useMemo(() => {
    const comDados = base.filter((b) => b.completude !== null);
    const completos = comDados.filter((b) => b.completude >= CORTE_COMPLETUDE).length;
    return { completos, incompletos: comDados.length - completos, total: comDados.length };
  }, [base]);

  return (
    <div className="space-y-6">
      <ChartCard
        titulo="💷 Preço outcall 1h × crescimento"
        subtitulo="Linha de tendência por mínimos quadrados; inclinação e r no rodapé"
        pergunta="Preço mais alto reduz visitantes, ou sinaliza qualidade e atrai?"
        vazio={
          dispersao.length === 0
            ? 'Precisa de anúncios com preço de outcall 1h capturado e 2 ou mais capturas de visitantes.'
            : null
        }
        nota="Visitante não é cliente: preço alto pode manter a curiosidade (visitas) e derrubar a conversão, que este dado não mede."
        tabela={{
          colunas: ['Anúncio', 'Preço outcall 1h', 'Crescimento'],
          linhas: dispersao.map((d) => [
            d.titulo,
            `£${formatarNumero(d.x, 0)}`,
            formatarNumero(d.y, 0)
          ])
        }}
      >
        <ScatterAnalitico
          pontos={dispersao}
          rotuloX="Preço outcall 1h (£)"
          rotuloY="Crescimento de visitantes"
          corPor="desempenho"
          valorDesempenho={(p) => p.y}
          linhaZeroY
        />
      </ChartCard>

      <ChartCard
        titulo="📊 Distribuição de preços do mercado"
        subtitulo="Anúncios monitorados por faixa de preço de outcall 1h"
        pergunta="Onde está o miolo do mercado — e você está dentro ou fora dele?"
        vazio={histograma.length === 0 ? 'Nenhum anúncio com preço de outcall 1h capturado.' : null}
        tabela={{
          colunas: ['Faixa', 'Anúncios', '% do total'],
          linhas: histograma.map((h) => [
            h.faixa,
            h.quantidade,
            `${formatarNumero(h.percentual, 1)}%`
          ])
        }}
      >
        <Histograma dados={histograma} rotuloX="Faixa de preço" />
      </ChartCard>

      <ChartCard
        titulo="✅ Tabela de preços completa × incompleta"
        subtitulo={`Completa = ${CORTE_COMPLETUDE * 100}% ou mais das células preenchidas · ${contagemCompletude.completos} completas, ${contagemCompletude.incompletos} incompletas`}
        pergunta="Preencher a tabela inteira faz diferença no resultado?"
        vazio={
          completudeComparada.length === 0
            ? 'Precisa de anúncios nos dois grupos (tabela completa e incompleta) com histórico de visitantes.'
            : null
        }
        nota="Índice com o grupo incompleto = 100. Passe o mouse para ver os valores reais de cada grupo."
        tabela={{
          colunas: ['Métrica', 'Tabela completa', 'Tabela incompleta', 'Diferença'],
          linhas: completudeComparada.map((c) => [
            c.feature,
            formatarNumero(c.valorRealA, c.decimais),
            formatarNumero(c.valorRealB, c.decimais),
            c.indiceA === null
              ? '—'
              : `${c.indiceA >= 100 ? '+' : ''}${formatarNumero(c.indiceA - 100, 0)}%`
          ])
        }}
      >
        <ComparacaoBarras
          dados={completudeComparada}
          rotuloA="Tabela completa"
          rotuloB="Tabela incompleta"
          altura={220}
        />
      </ChartCard>
    </div>
  );
}
