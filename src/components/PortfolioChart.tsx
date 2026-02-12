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

export function PortfolioChart({ data, height = 240 }: Props) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500"
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
  const padding = { top: 16, right: 16, bottom: 32, left: 48 };
  const width = 400;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const x = (i: number) => padding.left + (i / Math.max(1, data.length - 1)) * chartWidth;
  const y = (v: number) => padding.top + chartHeight - ((v - min) / range) * chartHeight;

  const pathPoints = data.map((d, i) => `${x(i)},${y(d.cumulative)}`);
  const pathD = pathPoints.length > 0 ? `M ${pathPoints.join(" L ")}` : "";
  const zeroY = y(0);
  const showZero = min < 0 && max > 0;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[320px] max-w-full"
        preserveAspectRatio="xMidYMid meet"
      >
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
        <path
          d={pathD}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-emerald-500"
        />
        <path
          d={pathD + ` L ${x(data.length - 1)} ${chartHeight + padding.top} L ${padding.left} ${chartHeight + padding.top} Z`}
          fill="currentColor"
          fillOpacity={0.08}
          className="text-emerald-500"
        />
        {data.map((d, i) => (
          <g key={d.date}>
            <circle
              cx={x(i)}
              cy={y(d.cumulative)}
              r={i === data.length - 1 ? 4 : 2}
              fill="currentColor"
              className={d.cumulative >= 0 ? "text-emerald-500" : "text-red-500"}
            />
          </g>
        ))}
        <text
          x={padding.left}
          y={height - 8}
          className="fill-gray-400 text-[10px]"
        >
          {data[0]?.label ?? ""}
        </text>
        <text
          x={width - padding.right}
          y={height - 8}
          textAnchor="end"
          className="fill-gray-400 text-[10px]"
        >
          {data[data.length - 1]?.label ?? ""}
        </text>
      </svg>
    </div>
  );
}
