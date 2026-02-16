"use client";

export type PortfolioPoint = {
  date: string;
  label: string;
  cumulative: number;
  pnl: number;
};

type Props = {
  data: PortfolioPoint[];
  height?: number;
};

function formatAmount(n: number): string {
  if (n === Math.floor(n) && Math.abs(n) < 1e12) return String(n);
  return n.toFixed(1);
}

export function PortfolioChart({ data, height = 240 }: Props) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-500 dark:text-gray-400"
        style={{ height }}
      >
        No trade data yet. Record win/loss on your analyses to see your portfolio curve.
      </div>
    );
  }

  const values = data.map((d) => d.cumulative);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const leftPadding = 52;
  const padding = { top: 20, right: 20, bottom: 44, left: leftPadding };
  const width = 500;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const x = (i: number) =>
    padding.left + (i / Math.max(1, data.length - 1)) * chartWidth;
  const y = (v: number) =>
    padding.top + chartHeight - ((v - min) / range) * chartHeight;

  const pathPoints = data.map((d, i) => `${x(i)},${y(d.cumulative)}`);
  const pathD = pathPoints.length > 0 ? `M ${pathPoints.join(" L ")}` : "";
  const zeroY = y(0);
  const showZero = min < 0 && max > 0;

  // Y-axis ticks (amount labels)
  const numYTicks = 5;
  const yTickValues: number[] = [];
  for (let i = 0; i <= numYTicks; i++) {
    yTickValues.push(min + (range * i) / numYTicks);
  }

  // X-axis date labels: show first, last, and up to 3 in between to avoid clutter
  const numXTicks = Math.min(data.length, 6);
  const xTickIndices: number[] = [];
  if (data.length <= 6) {
    for (let i = 0; i < data.length; i++) xTickIndices.push(i);
  } else {
    xTickIndices.push(0);
    for (let k = 1; k < numXTicks - 1; k++) {
      xTickIndices.push(Math.floor((k * (data.length - 1)) / (numXTicks - 1)));
    }
    xTickIndices.push(data.length - 1);
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[320px] max-w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Zero line */}
        {showZero && (
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="currentColor"
            strokeDasharray="4 2"
            strokeOpacity={0.3}
            className="text-gray-400"
          />
        )}
        {/* Area fill */}
        <path
          d={
            pathD +
            ` L ${x(data.length - 1)} ${chartHeight + padding.top} L ${padding.left} ${chartHeight + padding.top} Z`
          }
          fill="currentColor"
          fillOpacity={0.08}
          className="text-emerald-500"
        />
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-emerald-500"
        />
        {/* Y-axis labels (amount) */}
        {yTickValues.map((v) => (
          <g key={v}>
            <line
              x1={padding.left}
              y1={y(v)}
              x2={width - padding.right}
              y2={y(v)}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeDasharray="2 2"
            />
            <text
              x={padding.left - 8}
              y={y(v)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-gray-500 dark:fill-gray-400 text-[10px] tabular-nums"
            >
              {formatAmount(v)}
            </text>
          </g>
        ))}
        {/* X-axis labels (date) */}
        {xTickIndices.map((i) => {
          const point = data[i];
          if (!point) return null;
          return (
            <text
              key={`${point.date}-${i}`}
              x={x(i)}
              y={height - 12}
              textAnchor="middle"
              className="fill-gray-500 dark:fill-gray-400 text-[10px]"
            >
              {point.label}
            </text>
          );
        })}
        {/* Data points */}
        {data.map((d, i) => (
          <g key={d.date}>
            <circle
              cx={x(i)}
              cy={y(d.cumulative)}
              r={i === data.length - 1 ? 4 : 2}
              fill="currentColor"
              className={
                d.cumulative >= 0 ? "text-emerald-500" : "text-red-500"
              }
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
