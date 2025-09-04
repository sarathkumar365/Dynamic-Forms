"use client";
import React from "react";

type ViewMode = 'auto' | 'chart' | 'table' | 'both';
export type ChartType = 'barV' | 'barH' | 'pie' | 'line';

export default function ResultsView({ result, viewMode = 'auto', chartType = 'barV' }: { result: any | null; viewMode?: ViewMode; chartType?: ChartType }) {
  if (!result) return null;
  const hasSeries = !!(result.series && result.series.labels?.length);
  const hasValue = result.value !== undefined;
  const hasTable = Array.isArray(result.table) && result.table.length > 0;

  const wantChart = viewMode === 'chart' || viewMode === 'both' || (viewMode === 'auto' && (hasSeries || hasValue));
  const wantTable = viewMode === 'table' || viewMode === 'both' || (viewMode === 'auto' && hasTable);
  const renderedChart = wantChart && (hasSeries || hasValue);
  const renderedTable = wantTable && hasTable;

  return (
    <div className="space-y-3">
      {renderedChart && (
        hasSeries ? (
          <div className="flex justify-center">
            {chartType === 'barH' ? (
              <BarH labels={result.series.labels} data={result.series.data} />
            ) : chartType === 'pie' ? (
              <Pie labels={result.series.labels} data={result.series.data} />
            ) : chartType === 'line' ? (
              <Line labels={result.series.labels} data={result.series.data} />
            ) : (
              <BarV labels={result.series.labels} data={result.series.data} />
            )}
          </div>
        ) : hasValue ? (
          <div className="rounded-lg border p-3 text-sm text-center">
            Value: <span className="font-mono">{String(result.value)}</span>
          </div>
        ) : null
      )}

      {renderedTable && (
        <div className="overflow-auto rounded-lg border">
          <table className="table">
            <thead>
              <tr>
                {Object.keys(result.table[0]).map((h: string) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.table.map((row: any, idx: number) => (
                <tr key={idx}>
                  {Object.values(row).map((v: any, i: number) => (
                    <td key={i} className="text-sm">
                      {String(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fallback: show KPI when only a single value is available and nothing else was rendered */}
      {!renderedChart && !renderedTable && hasValue && !hasSeries && !hasTable && (
        <div className="rounded-lg border p-3 text-sm text-center">
          Value: <span className="font-mono">{String(result.value)}</span>
        </div>
      )}
    </div>
  );
}

const palette = [
  '#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#0ea5e9',
  '#22c55e', '#a855f7', '#eab308', '#f97316', '#10b981'
];

function BarH({ labels, data }: { labels: string[]; data: number[] }) {
  const max = Math.max(1, ...data);
  return (
    <div className="w-full flex flex-col items-center">
      {labels.map((l, i) => (
        <div key={i} className="w-full max-w-[720px] flex items-center gap-3 my-1 px-2">
          <div className="w-40 truncate text-xs text-right" title={l}>{l}</div>
          <div className="relative h-4 flex-1 bg-gray-100 rounded">
            <div className="absolute left-0 top-0 bottom-0 rounded" style={{ width: `${(data[i] / max) * 100}%`, backgroundColor: palette[i % palette.length] }} />
          </div>
          <div className="w-16 text-right text-xs">{data[i]}</div>
        </div>
      ))}
    </div>
  );
}

function BarV({ labels, data }: { labels: string[]; data: number[] }) {
  const max = Math.max(1, ...data);
  return (
    <div className="w-full overflow-x-auto flex justify-center">
      <div className="h-48 flex items-end gap-3 px-2">
        {data.map((v, i) => (
          <div key={i} className="flex flex-col items-center" style={{ minWidth: 28 }}>
            <div className="text-[10px] mb-1">{v}</div>
            <div className="h-36 w-5 bg-gray-100 rounded relative overflow-hidden">
              <div className="absolute bottom-0 left-0 right-0 rounded-t" style={{ height: `${(v / max) * 100}%`, backgroundColor: palette[i % palette.length] }} />
            </div>
            <div className="w-12 truncate text-[10px] mt-1 text-center" title={labels[i]}>{labels[i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pie({ labels, data }: { labels: string[]; data: number[] }) {
  const total = data.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  const stops = data.map((v, i) => {
    const start = acc / total * 100; acc += v; const end = acc / total * 100;
    return `${palette[i % palette.length]} ${start}% ${end}%`;
  }).join(', ');
  return (
    <div className="flex items-center gap-4">
      <div className="w-40 h-40 rounded-full" style={{ background: `conic-gradient(${stops})` }} />
      <div className="space-y-1">
        {labels.map((l, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: palette[i % palette.length] }} />
            <span className="truncate max-w-[160px]" title={l}>{l}</span>
            <span className="text-gray-600">{data[i]}</span>
            <span className="text-gray-500">({Math.round((data[i]/total)*100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Line({ labels, data }: { labels: string[]; data: number[] }) {
  const max = Math.max(1, ...data);
  const width = Math.max(200, labels.length * 40);
  const height = 160;
  const pts = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * (width - 20) + 10;
    const y = height - (v / max) * (height - 20) - 10;
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="w-full overflow-x-auto flex justify-center">
      <svg width={width} height={height} className="bg-white">
        <polyline fill="none" stroke="#2563eb" strokeWidth="2" points={pts} />
        {data.map((v,i)=>{
          const x = (i / Math.max(1, data.length - 1)) * (width - 20) + 10;
          const y = height - (v / max) * (height - 20) - 10;
          return <circle key={i} cx={x} cy={y} r={3} fill={palette[i % palette.length]} />
        })}
      </svg>
      <div className="flex gap-3 px-3 justify-center w-full" style={{ maxWidth: width }}>
        {labels.map((l,i)=>(<div key={i} className="w-10 truncate text-[10px] text-center" title={l}>{l}</div>))}
      </div>
    </div>
  );
}
