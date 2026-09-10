import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar
} from 'recharts';

export function CorrelationChart({ data, featureName, visitors }) {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        Sem dados para exibir
      </div>
    );
  }

  // Prepara dados para scatter chart
  const scatterData = data.map((ad, idx) => ({
    x: ad[featureName] || 0,
    y: visitors[idx] || 0,
    titulo: ad.titulo || 'Sem título'
  }));

  // Calcula correlação
  const meanX = scatterData.reduce((sum, d) => sum + d.x, 0) / scatterData.length;
  const meanY = scatterData.reduce((sum, d) => sum + d.y, 0) / scatterData.length;

  let numerador = 0, denomX = 0, denomY = 0;
  scatterData.forEach(d => {
    const dx = d.x - meanX;
    const dy = d.y - meanY;
    numerador += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  });

  const r = Math.sqrt(denomX * denomY) > 0
    ? (numerador / Math.sqrt(denomX * denomY)).toFixed(3)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-2">{featureName} vs Visitors</h3>
      <p className="text-sm text-gray-600 mb-4">
        Correlação de Pearson: <span className="font-semibold">{r}</span>
      </p>

      <div className="flex justify-center">
        <ScatterChart width={500} height={300} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name={featureName} />
          <YAxis type="number" dataKey="y" name="Visitors" />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload?.[0]) {
                return (
                  <div className="bg-white p-2 border rounded shadow-lg text-xs">
                    <p>{payload[0].payload.titulo}</p>
                    <p>{featureName}: {payload[0].value}</p>
                    <p>Visitors: {payload[0].payload.y}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Scatter name={featureName} data={scatterData} fill="#8884d8" />
        </ScatterChart>
      </div>
    </div>
  );
}
