import React, { useMemo, useState } from 'react';
import { ChartCard } from './ChartCard';
import { ScatterAnalitico } from './ScatterAnalitico';
import { ComparacaoBarras } from './ComparacaoBarras';
import { HeatmapCorrelacao } from './HeatmapCorrelacao';
import {
  calcularCrescimento,
  featuresTexto,
  valorDeFeatureTexto,
  quartisPorMetrica,
  pearson,
  media,
  FEATURES_TEXTO
} from '../../lib/metrics';
import { formatarNumero } from '../../lib/viz';

// Features destacadas em scatter próprio — as que o usuário citou
// explicitamente como hipótese.
const DESTAQUES = [
  {
    chave: 'desc_length',
    titulo: '📝 Comprimento da descrição × crescimento',
    rotuloX: 'Caracteres na descrição',
    pergunta: 'Texto longo ajuda ou espanta?'
  },
  {
    chave: 'emoji_count',
    titulo: '😊 Quantidade de emojis × crescimento',
    rotuloX: 'Nº de emojis',
    pergunta: 'Emoji chama atenção ou passa amadorismo?'
  }
];

const MINIMO_CORRELACAO = 5;

/**
 * As features de texto vêm da tabela ad_text_features, calculada na captura
 * do anúncio — não são recalculadas no navegador. Anúncios cadastrados antes
 * do cálculo de features simplesmente não aparecem nestes gráficos.
 */
export function SecaoDescricao({ ads }) {
  const [eixoY, setEixoY] = useState('vocab_diversity');

  const base = useMemo(
    () =>
      ads
        .map((ad) => ({
          ad,
          crescimento: calcularCrescimento(ad)?.absoluto ?? null,
          temFeatures: !!featuresTexto(ad)
        }))
        .filter((b) => b.temFeatures),
    [ads]
  );

  const comCrescimento = useMemo(
    () => base.filter((b) => b.crescimento !== null),
    [base]
  );

  const scatters = useMemo(
    () =>
      DESTAQUES.map((d) => ({
        ...d,
        pontos: comCrescimento
          .map((b) => ({
            x: valorDeFeatureTexto(b.ad, d.chave),
            y: b.crescimento,
            titulo: b.ad.titulo
          }))
          .filter((p) => p.x !== null)
      })),
    [comCrescimento]
  );

  const quartis = useMemo(
    () => quartisPorMetrica(comCrescimento, (b) => b.crescimento),
    [comCrescimento]
  );

  const comparacao = useMemo(() => {
    if (quartis.top.length === 0) return [];
    return FEATURES_TEXTO.map((f) => {
      const valoresTop = quartis.top
        .map((b) => valorDeFeatureTexto(b.ad, f.chave))
        .filter((v) => v !== null);
      const valoresBottom = quartis.bottom
        .map((b) => valorDeFeatureTexto(b.ad, f.chave))
        .filter((v) => v !== null);
      if (valoresTop.length === 0 || valoresBottom.length === 0) return null;

      const mediaTop = media(valoresTop);
      const mediaBottom = media(valoresBottom);
      const decimais = Math.abs(mediaBottom) < 10 ? 2 : 0;

      return {
        feature: f.label,
        valorRealA: mediaTop,
        valorRealB: mediaBottom,
        decimais,
        indiceA: mediaBottom !== 0 ? (mediaTop / mediaBottom) * 100 : null,
        indiceB: mediaBottom !== 0 ? 100 : null
      };
    }).filter(Boolean);
  }, [quartis]);

  const matriz = useMemo(() => {
    const alvos = [
      { coluna: 'Crescimento', obter: (b) => b.crescimento },
      { coluna: 'Visitantes atuais', obter: (b) => b.ad.visitors_atual ?? null },
      {
        coluna: 'Visitantes/dia',
        obter: (b) => calcularCrescimento(b.ad)?.porDia ?? null
      }
    ];

    const linhas = FEATURES_TEXTO.map((f) => ({
      label: f.label,
      valores: alvos.map((alvo) => {
        const xs = [];
        const ys = [];
        comCrescimento.forEach((b) => {
          xs.push(valorDeFeatureTexto(b.ad, f.chave));
          ys.push(alvo.obter(b));
        });
        const { r, n } = pearson(xs, ys);
        return { coluna: alvo.coluna, r, n };
      })
    }));

    return { linhas, colunas: alvos.map((a) => a.coluna) };
  }, [comCrescimento]);

  const dispersao2D = useMemo(
    () =>
      comCrescimento
        .map((b) => ({
          x: valorDeFeatureTexto(b.ad, 'sentiment_score'),
          y: valorDeFeatureTexto(b.ad, eixoY),
          titulo: b.ad.titulo,
          crescimento: b.crescimento,
          extra: [{ label: 'Crescimento', valor: formatarNumero(b.crescimento, 0) }]
        }))
        .filter((p) => p.x !== null && p.y !== null),
    [comCrescimento, eixoY]
  );

  const labelEixoY =
    FEATURES_TEXTO.find((f) => f.chave === eixoY)?.label || eixoY;

  return (
    <div className="space-y-6">
      {base.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-4">
          Nenhum anúncio tem features de texto calculadas ainda. Elas são geradas
          no momento em que o anúncio é cadastrado (ou numa recaptura completa,
          pelo botão "Recapturar dados completos" dentro do anúncio).
        </div>
      )}

      {scatters.map((s) => (
        <ChartCard
          key={s.chave}
          titulo={s.titulo}
          subtitulo="Linha de tendência por mínimos quadrados; inclinação e r no rodapé"
          pergunta={s.pergunta}
          vazio={
            s.pontos.length === 0
              ? 'Precisa de anúncios com features de texto e 2 ou mais capturas de visitantes.'
              : null
          }
          tabela={{
            colunas: ['Anúncio', s.rotuloX, 'Crescimento'],
            linhas: s.pontos.map((p) => [p.titulo, formatarNumero(p.x, 0), formatarNumero(p.y, 0)])
          }}
        >
          <ScatterAnalitico
            pontos={s.pontos}
            rotuloX={s.rotuloX}
            rotuloY="Crescimento de visitantes"
            corPor="desempenho"
            valorDesempenho={(p) => p.y}
            linhaZeroY
          />
        </ChartCard>
      ))}

      <ChartCard
        titulo="⚖️ O que os 25% melhores escrevem de diferente"
        subtitulo="Média de cada feature no top 25% vs bottom 25% em crescimento"
        pergunta="Qual característica do texto mais separa os vencedores dos últimos?"
        vazio={
          comparacao.length === 0
            ? 'Precisa de pelo menos 4 anúncios com features de texto e histórico de visitantes.'
            : null
        }
        nota="Valores mostrados como índice, com o bottom 25% = 100 — as features têm escalas incompatíveis (caracteres, emojis, nota de sentimento) e não caberiam no mesmo eixo em valor absoluto. Passe o mouse para ver os valores reais."
        tabela={{
          colunas: ['Feature', 'Top 25% (média)', 'Bottom 25% (média)', 'Diferença'],
          linhas: comparacao.map((c) => [
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
          dados={comparacao}
          rotuloA="Top 25%"
          rotuloB="Bottom 25%"
          altura={Math.max(320, comparacao.length * 26)}
        />
      </ChartCard>

      <ChartCard
        titulo="🔥 Matriz de correlação — texto × desempenho"
        subtitulo="Coeficiente de Pearson entre cada feature de texto e cada métrica de resultado"
        pergunta="Qual feature de texto tem a relação mais forte com o resultado?"
        vazio={
          comCrescimento.length < MINIMO_CORRELACAO
            ? `Correlações só ficam informativas com uns 20–30 anúncios. Hoje há ${comCrescimento.length} com features e histórico — a matriz aparece a partir de ${MINIMO_CORRELACAO}.`
            : null
        }
        nota="Azul = relação positiva, vermelho = negativa, cinza = ~zero. Células com poucos pares aparecem como “—”. Com amostra pequena, um único anúncio atípico move qualquer coeficiente."
      >
        <HeatmapCorrelacao linhas={matriz.linhas} colunas={matriz.colunas} minimoAmostra={MINIMO_CORRELACAO} />
      </ChartCard>

      <ChartCard
        titulo={`🎯 Sentimento × ${labelEixoY}`}
        subtitulo="Cor dos pontos pela faixa de crescimento (quartis)"
        pergunta="Os vencedores se concentram em alguma combinação de tom e vocabulário?"
        vazio={
          dispersao2D.length === 0
            ? 'Precisa de anúncios com sentimento e a feature escolhida calculados.'
            : null
        }
        acoes={
          <select
            value={eixoY}
            onChange={(e) => setEixoY(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          >
            {FEATURES_TEXTO.filter((f) => f.chave !== 'sentiment_score').map((f) => (
              <option key={f.chave} value={f.chave}>
                {f.label}
              </option>
            ))}
          </select>
        }
        tabela={{
          colunas: ['Anúncio', 'Sentimento', labelEixoY, 'Crescimento'],
          linhas: dispersao2D.map((p) => [
            p.titulo,
            formatarNumero(p.x, 2),
            formatarNumero(p.y, 2),
            formatarNumero(p.crescimento, 0)
          ])
        }}
      >
        <ScatterAnalitico
          pontos={dispersao2D}
          rotuloX="Sentimento (−1 a +1)"
          rotuloY={labelEixoY}
          decimaisX={2}
          decimaisY={2}
          tendencia={false}
          corPor="desempenho"
          valorDesempenho={(p) => p.crescimento}
          altura={340}
        />
      </ChartCard>
    </div>
  );
}
