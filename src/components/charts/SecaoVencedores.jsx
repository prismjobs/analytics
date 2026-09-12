import React, { useMemo, useState } from 'react';
import { ChartCard } from './ChartCard';
import { Quadrantes } from './Quadrantes';
import { RankingBarras } from './RankingBarras';
import { RadarPerfil } from './RadarPerfil';
import {
  calcularCrescimento,
  numeroDeFotos,
  numeroDeServicos,
  precoOutcall1Hora,
  completudePreco,
  valorDeFeatureTexto,
  scoreComposto,
  normalizar,
  PESOS_SCORE_PADRAO
} from '../../lib/metrics';
import { formatarNumero, encurtar } from '../../lib/viz';

// Eixos Y disponíveis para o quadrante. X é sempre o crescimento: é o
// resultado, e o que muda de pergunta é o fundamento comparado a ele.
const EIXOS_Y = [
  { chave: 'fotos', label: 'Nº de fotos', obter: numeroDeFotos, decimais: 0 },
  {
    chave: 'descricao',
    label: 'Comprimento da descrição',
    obter: (ad) => valorDeFeatureTexto(ad, 'desc_length'),
    decimais: 0
  },
  { chave: 'preco', label: 'Preço outcall 1h (£)', obter: precoOutcall1Hora, decimais: 0 },
  { chave: 'servicos', label: 'Nº de serviços', obter: numeroDeServicos, decimais: 0 }
];

const TOPO_RADAR = 6;

// Rótulos legíveis para os pesos do score (as chaves internas são sem acento).
const NOMES_PESOS = {
  crescimento: 'crescimento',
  fotos: 'fotos',
  preco: 'completude de preço',
  descricao: 'descrição',
  servicos: 'serviços'
};

export function SecaoVencedores({ ads }) {
  const [eixoY, setEixoY] = useState('fotos');
  const eixo = EIXOS_Y.find((e) => e.chave === eixoY) || EIXOS_Y[0];

  const pontos = useMemo(
    () =>
      ads
        .map((ad) => ({
          x: calcularCrescimento(ad)?.absoluto ?? null,
          y: eixo.obter(ad),
          titulo: ad.titulo,
          extra: [{ label: 'Visitantes hoje', valor: formatarNumero(ad.visitors_atual, 0) }]
        }))
        .filter((p) => p.x !== null && p.y !== null),
    [ads, eixo]
  );

  const scores = useMemo(() => scoreComposto(ads), [ads]);

  const rankingScore = useMemo(
    () =>
      scores.slice(0, 20).map((s) => ({
        nome: encurtar(s.ad.titulo, 30),
        tituloCompleto: s.ad.titulo,
        valor: s.score,
        extra: [
          {
            label: 'Crescimento',
            valor:
              s.bruto.crescimento !== null ? formatarNumero(s.bruto.crescimento, 0) : '— (1 captura)'
          },
          { label: 'Fotos', valor: s.bruto.fotos ?? '—' },
          {
            label: 'Completude de preço',
            valor: s.bruto.preco !== null ? `${formatarNumero(s.bruto.preco * 100, 0)}%` : '—'
          },
          { label: 'Serviços', valor: s.bruto.servicos ?? '—' }
        ]
      })),
    [scores]
  );

  // Radar em pequenos múltiplos: um card por anúncio, todos nos mesmos eixos
  // normalizados de 0 a 100 dentro do conjunto analisado.
  const radares = useMemo(() => {
    const selecionados = scores.slice(0, TOPO_RADAR);
    if (selecionados.length === 0) return [];

    const dimensoes = [
      { eixo: 'Fotos', obter: (ad) => numeroDeFotos(ad), decimais: 0 },
      {
        eixo: 'Descrição',
        obter: (ad) => valorDeFeatureTexto(ad, 'desc_length'),
        decimais: 0
      },
      { eixo: 'Serviços', obter: (ad) => numeroDeServicos(ad), decimais: 0 },
      {
        eixo: 'Sentimento',
        obter: (ad) => valorDeFeatureTexto(ad, 'sentiment_score'),
        decimais: 2
      },
      { eixo: 'Preço completo', obter: (ad) => completudePreco(ad), decimais: 2 },
      {
        eixo: 'Crescimento',
        obter: (ad) => calcularCrescimento(ad)?.absoluto ?? null,
        decimais: 0
      }
    ];

    // Normaliza dentro do conjunto SELECIONADO, para a forma do radar
    // comparar os finalistas entre si.
    const normalizadosPorDimensao = dimensoes.map((d) => ({
      ...d,
      valores: selecionados.map((s) => d.obter(s.ad)),
      escala: normalizar(selecionados.map((s) => d.obter(s.ad)))
    }));

    return selecionados.map((s, i) => ({
      titulo: s.ad.titulo,
      score: s.score,
      eixos: normalizadosPorDimensao.map((d) => ({
        eixo: d.eixo,
        valor: d.escala[i] === null ? 0 : d.escala[i] * 100,
        real: d.valores[i] === null ? '—' : formatarNumero(d.valores[i], d.decimais)
      }))
    }));
  }, [scores]);

  const pesosTexto = Object.entries(PESOS_SCORE_PADRAO)
    .map(([chave, peso]) => `${NOMES_PESOS[chave] || chave} ${Math.round(peso * 100)}%`)
    .join(' · ');

  return (
    <div className="space-y-6">
      <ChartCard
        titulo="🎯 Quadrante de seleção — quem estudar a fundo"
        subtitulo={`X = crescimento de visitantes · Y = ${eixo.label} · cortes nas medianas`}
        pergunta="Quem cresce por mérito do anúncio, e quem cresce apesar dele?"
        vazio={
          pontos.length < 3
            ? `Precisa de pelo menos 3 anúncios com crescimento e ${eixo.label.toLowerCase()} capturados. Hoje há ${pontos.length}.`
            : null
        }
        nota="Os cortes são as medianas, então metade dos anúncios cai de cada lado independentemente de outliers. Com 3 ou 4 semanas de capturas os quadrantes ficam bem mais estáveis."
        acoes={
          <select
            value={eixoY}
            onChange={(e) => setEixoY(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          >
            {EIXOS_Y.map((e) => (
              <option key={e.chave} value={e.chave}>
                Y: {e.label}
              </option>
            ))}
          </select>
        }
        tabela={{
          colunas: ['Anúncio', 'Crescimento', eixo.label],
          linhas: pontos.map((p) => [
            p.titulo,
            formatarNumero(p.x, 0),
            formatarNumero(p.y, eixo.decimais)
          ])
        }}
      >
        <Quadrantes
          pontos={pontos}
          rotuloX="Crescimento de visitantes"
          rotuloY={eixo.label}
        />
      </ChartCard>

      <ChartCard
        titulo="🏅 Score composto"
        subtitulo={`Resultado + fundamentos, normalizados de 0 a 100 · pesos: ${pesosTexto}`}
        pergunta="Quem tem o melhor conjunto — e não só o melhor número isolado?"
        vazio={
          rankingScore.length === 0
            ? 'Nenhum anúncio com dados suficientes para compor o score ainda.'
            : null
        }
        nota="Cada componente é normalizado de 0 a 1 dentro do conjunto atual, então o score é RELATIVO: ele muda quando você adiciona anúncios. Componentes que faltam num anúncio têm o peso redistribuído, em vez de contarem como zero."
        tabela={{
          colunas: ['Anúncio', 'Score', 'Crescimento', 'Fotos', 'Completude de preço', 'Serviços'],
          linhas: rankingScore.map((d) => [
            d.tituloCompleto,
            formatarNumero(d.valor, 1),
            d.extra[0].valor,
            d.extra[1].valor,
            d.extra[2].valor,
            d.extra[3].valor
          ])
        }}
      >
        <RankingBarras dados={rankingScore} rotuloValor="Score (0–100)" decimais={1} />
      </ChartCard>

      <ChartCard
        titulo="🕸️ Perfil dos finalistas"
        subtitulo={`Um radar por anúncio, mesmos eixos, normalizados dentro do grupo dos ${radares.length} melhores`}
        pergunta="Os melhores têm a mesma forma, ou cada um vence por um caminho diferente?"
        vazio={
          radares.length === 0
            ? 'Nenhum anúncio com dados suficientes para montar o perfil ainda.'
            : null
        }
        nota="Cards separados em vez de várias áreas sobrepostas num radar só: com 5+ séries empilhadas nada mais é legível. Passe o mouse num vértice para ver o valor real."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {radares.map((r, i) => (
            <RadarPerfil
              key={i}
              titulo={`${i + 1}. ${encurtar(r.titulo, 34)}`}
              subtitulo={`Score ${formatarNumero(r.score, 1)}`}
              eixos={r.eixos}
            />
          ))}
        </div>
      </ChartCard>
    </div>
  );
}
