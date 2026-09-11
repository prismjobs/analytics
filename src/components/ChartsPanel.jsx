import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ZAxis
} from 'recharts';
import { calcularCrescimento, precoOutcall1Hora, numeroDeFotos } from '../lib/metrics';

const COR_POSITIVO = '#16a34a';
const COR_NEGATIVO = '#dc2626';
const COR_NEUTRO = '#9ca3af';
const COR_PONTO = '#2563eb';

function corPorCrescimento(valor) {
  if (valor > 0) return COR_POSITIVO;
  if (valor < 0) return COR_NEGATIVO;
  return COR_NEUTRO;
}

export function ChartsPanel({ ads }) {
  // Só entram nos gráficos anúncios com crescimento calculável (2+ capturas).
  // Isso é intencional: com 1 captura só não há "performance" pra comparar.
  const comCrescimento = useMemo(
    () =>
      ads
        .map((ad) => ({ ad, crescimento: calcularCrescimento(ad) }))
        .filter((x) => x.crescimento !== null),
    [ads]
  );

  const dadosRanking = useMemo(
    () =>
      [...comCrescimento]
        .sort((a, b) => b.crescimento.absoluto - a.crescimento.absoluto)
        .slice(0, 15)
        .map((x) => ({
          nome: x.ad.titulo?.length > 28 ? x.ad.titulo.slice(0, 28) + '…' : x.ad.titulo,
          tituloCompleto: x.ad.titulo,
          crescimento: x.crescimento.absoluto
        })),
    [comCrescimento]
  );

  const dadosFotos = useMemo(
    () =>
      comCrescimento.map((x) => ({
        x: numeroDeFotos(x.ad),
        y: x.crescimento.absoluto,
        titulo: x.ad.titulo
      })),
    [comCrescimento]
  );

  const dadosPreco = useMemo(
    () =>
      comCrescimento
        .map((x) => ({
          x: precoOutcall1Hora(x.ad),
          y: x.crescimento.absoluto,
          titulo: x.ad.titulo
        }))
        .filter((d) => d.x !== null),
    [comCrescimento]
  );

  if (comCrescimento.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500 text-sm">
        Ainda não há anúncios com pelo menos 2 capturas de visitantes.
        Atualize os anúncios em dias diferentes para começar a ver os
        gráficos de performance aqui.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== RANKING DE CRESCIMENTO ===== */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-1">🏆 Ranking de crescimento</h3>
        <p className="text-xs text-gray-500 mb-4">
          Visitantes ganhos da 1ª até a última captura — top {dadosRanking.length} anúncios
        </p>
        <ResponsiveContainer width="100%" height={Math.max(300, dadosRanking.length * 32)}>
          <BarChart data={dadosRanking} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis type="category" dataKey="nome" width={200} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [value, 'Crescimento']}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.tituloCompleto || ''}
            />
            <Bar dataKey="crescimento" radius={[0, 4, 4, 0]}>
              {dadosRanking.map((entry, i) => (
                <Cell key={i} fill={corPorCrescimento(entry.crescimento)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ===== FOTOS x CRESCIMENTO ===== */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-1">📷 Fotos × Crescimento</h3>
          <p className="text-xs text-gray-500 mb-4">
            Cada ponto é um anúncio. Existe um número de fotos que se destaca?
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="Nº de fotos" allowDecimals={false} />
              <YAxis type="number" dataKey="y" name="Crescimento" />
              <ZAxis range={[60, 60]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const p = payload[0].payload;
                  return (
                    <div className="bg-white p-2 border rounded shadow-lg text-xs max-w-[200px]">
                      <p className="font-medium truncate">{p.titulo}</p>
                      <p>Fotos: {p.x}</p>
                      <p>Crescimento: {p.y}</p>
                    </div>
                  );
                }}
              />
              <Scatter data={dadosFotos} fill={COR_PONTO} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* ===== PREÇO x CRESCIMENTO ===== */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-1">💷 Preço (outcall 1h) × Crescimento</h3>
          <p className="text-xs text-gray-500 mb-4">
            {dadosPreco.length > 0
              ? 'Existe uma faixa de preço que performa melhor?'
              : 'Nenhum anúncio com preço outcall de 1h capturado ainda.'}
          </p>
          {dadosPreco.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name="Preço (£)" unit="£" />
                <YAxis type="number" dataKey="y" name="Crescimento" />
                <ZAxis range={[60, 60]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const p = payload[0].payload;
                    return (
                      <div className="bg-white p-2 border rounded shadow-lg text-xs max-w-[200px]">
                        <p className="font-medium truncate">{p.titulo}</p>
                        <p>Preço: £{p.x}</p>
                        <p>Crescimento: {p.y}</p>
                      </div>
                    );
                  }}
                />
                <Scatter data={dadosPreco} fill={COR_PONTO} />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Gráficos calculados apenas com anúncios que já têm 2 ou mais capturas
        de visitantes ({comCrescimento.length} de {ads.length} anúncios nesta
        visão).
      </p>
    </div>
  );
}
