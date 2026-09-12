import React, { useMemo } from 'react';
import { ChartCard } from './ChartCard';
import { ScatterAnalitico } from './ScatterAnalitico';
import { BoxPlot } from './BoxPlot';
import { Histograma } from './Histograma';
import {
  calcularCrescimento,
  numeroDeFotos,
  quartisPorMetrica,
  resumoBoxPlot,
  media
} from '../../lib/metrics';
import { formatarNumero } from '../../lib/viz';

const FAIXAS_FOTOS = [
  { faixa: '1 foto', teste: (n) => n === 1 },
  { faixa: '2 fotos', teste: (n) => n === 2 },
  { faixa: '3–5 fotos', teste: (n) => n >= 3 && n <= 5 },
  { faixa: '6–9 fotos', teste: (n) => n >= 6 && n <= 9 },
  { faixa: '10+ fotos', teste: (n) => n >= 10 }
];

/**
 * A pergunta de fundo é "existe um número ideal de fotos, e a partir de quanto
 * satura?". O scatter responde a forma da relação; o box plot responde se os
 * vencedores realmente têm mais fotos (comparando medianas e dispersão, não
 * médias, que uma única conta com 30 fotos distorce).
 */
export function SecaoFotos({ ads }) {
  const base = useMemo(
    () =>
      ads.map((ad) => ({
        ad,
        fotos: numeroDeFotos(ad),
        crescimento: calcularCrescimento(ad)?.absoluto ?? null
      })),
    [ads]
  );

  const dispersao = useMemo(
    () =>
      base
        .filter((b) => b.fotos !== null && b.crescimento !== null)
        .map((b) => ({
          x: b.fotos,
          y: b.crescimento,
          titulo: b.ad.titulo,
          extra: [{ label: 'Visitantes hoje', valor: formatarNumero(b.ad.visitors_atual, 0) }]
        })),
    [base]
  );

  const quartis = useMemo(
    () => quartisPorMetrica(base.filter((b) => b.crescimento !== null), (b) => b.crescimento),
    [base]
  );

  const gruposBox = useMemo(() => {
    if (quartis.top.length === 0) return [];
    return [
      {
        label: 'Top 25% em crescimento',
        resumo: resumoBoxPlot(quartis.top.map((b) => b.fotos))
      },
      {
        label: 'Bottom 25% em crescimento',
        resumo: resumoBoxPlot(quartis.bottom.map((b) => b.fotos))
      }
    ].filter((g) => g.resumo);
  }, [quartis]);

  const histograma = useMemo(() => {
    const comFotos = base.filter((b) => b.fotos !== null && b.fotos > 0);
    if (comFotos.length === 0) return [];
    return FAIXAS_FOTOS.map((f) => {
      const doGrupo = comFotos.filter((b) => f.teste(b.fotos));
      const comCrescimento = doGrupo.filter((b) => b.crescimento !== null);
      return {
        faixa: f.faixa,
        quantidade: doGrupo.length,
        percentual: (doGrupo.length / comFotos.length) * 100,
        extra:
          comCrescimento.length > 0
            ? [
                {
                  label: 'Crescimento médio',
                  valor: formatarNumero(media(comCrescimento.map((b) => b.crescimento)), 1)
                }
              ]
            : []
      };
    });
  }, [base]);

  return (
    <div className="space-y-6">
      <ChartCard
        titulo="📷 Nº de fotos × crescimento"
        subtitulo="Cada ponto é um anúncio; a linha é a tendência por mínimos quadrados"
        pergunta="Existe um número ideal de fotos? A partir de quantas o ganho satura?"
        vazio={
          dispersao.length === 0
            ? 'Precisa de anúncios com fotos capturadas e pelo menos 2 capturas de visitantes.'
            : null
        }
        nota="Correlação não é causa: mais fotos pode ser sintoma de um anunciante mais dedicado em tudo."
        tabela={{
          colunas: ['Anúncio', 'Fotos', 'Crescimento'],
          linhas: dispersao.map((d) => [d.titulo, d.x, formatarNumero(d.y, 0)])
        }}
      >
        <ScatterAnalitico
          pontos={dispersao}
          rotuloX="Nº de fotos"
          rotuloY="Crescimento de visitantes"
          corPor="desempenho"
          valorDesempenho={(p) => p.y}
          linhaZeroY
        />
      </ChartCard>

      <ChartCard
        titulo="📦 Distribuição de fotos: melhores × piores"
        subtitulo="Mediana, quartis e extremos do nº de fotos em cada grupo de desempenho"
        pergunta="Os anúncios que mais crescem realmente têm mais fotos?"
        vazio={
          gruposBox.length === 0
            ? 'Precisa de pelo menos 4 anúncios com histórico de visitantes para separar em quartis.'
            : null
        }
        nota="A caixa vai do 1º ao 3º quartil, a linha interna é a mediana e os traços são o mínimo e o máximo. Se as duas caixas se sobrepõem quase inteiras, a diferença entre os grupos não é confiável ainda."
        tabela={{
          colunas: ['Grupo', 'n', 'Mínimo', 'Q1', 'Mediana', 'Q3', 'Máximo'],
          linhas: gruposBox.map((g) => [
            g.label,
            g.resumo.n,
            g.resumo.minimo,
            g.resumo.q1,
            g.resumo.mediana,
            g.resumo.q3,
            g.resumo.maximo
          ])
        }}
      >
        <BoxPlot grupos={gruposBox} rotuloValor="Nº de fotos" />
      </ChartCard>

      <ChartCard
        titulo="📊 Quantas fotos o mercado usa"
        subtitulo="Distribuição dos anúncios monitorados por faixa de quantidade de fotos"
        pergunta="Publicar 6+ fotos é comum ou é diferencial?"
        vazio={histograma.length === 0 ? 'Nenhum anúncio com fotos capturadas ainda.' : null}
        tabela={{
          colunas: ['Faixa', 'Anúncios', '% do total'],
          linhas: histograma.map((h) => [
            h.faixa,
            h.quantidade,
            `${formatarNumero(h.percentual, 1)}%`
          ])
        }}
      >
        <Histograma dados={histograma} rotuloX="Faixa de fotos" />
      </ChartCard>
    </div>
  );
}
