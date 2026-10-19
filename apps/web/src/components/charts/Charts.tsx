"use client";

import React from "react";
import { CATEGORY_COLORS, formatINR } from "@/lib/formatters";
import { MonthlyTimelinePoint } from "@/lib/api";

export function CategoryDonutChart({
  items,
  totalSpend,
}: {
  items: { category: string; amount: number; share_pct: number; count: number }[];
  totalSpend: number;
}) {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  let cumulativePct = 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
      <div className="sm:col-span-5 flex justify-center">
        <svg viewBox="0 0 180 180" className="w-44 h-44" role="img" aria-label="Category spend split donut chart">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#FCE4EC" strokeWidth="22" />
          {items.map((item) => {
            const pct = Math.max(item.share_pct, 0);
            const dash = (pct / 100) * circumference;
            const offset = circumference - (cumulativePct / 100) * circumference;
            cumulativePct += pct;
            const color = CATEGORY_COLORS[item.category] || "#D81B60";
            return (
              <circle
                key={item.category}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth="22"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                transform="rotate(-90 90 90)"
              />
            );
          })}
          <text x="90" y="84" textAnchor="middle" className="fill-ink font-extrabold text-[13px]">
            {formatINR(totalSpend)}
          </text>
          <text x="90" y="102" textAnchor="middle" className="fill-muted font-semibold text-[9px]">
            Total Spend
          </text>
        </svg>
      </div>

      <div className="sm:col-span-7 space-y-2">
        {items.slice(0, 7).map((it) => {
          const color = CATEGORY_COLORS[it.category] || "#D81B60";
          return (
            <div key={it.category} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="font-semibold text-ink truncate">{it.category}</span>
                <span className="text-[11px] text-muted">({it.count})</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-ink">{formatINR(it.amount)}</span>
                <span className="w-11 text-right text-[11px] font-semibold text-primaryDark bg-soft px-1.5 py-0.5 rounded">
                  {it.share_pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ForecastTimelineChart({
  timeline,
}: {
  timeline: MonthlyTimelinePoint[];
}) {
  if (!timeline || timeline.length === 0) return null;

  const width = 560;
  const height = 210;
  const padL = 58;
  const padR = 28;
  const padT = 24;
  const padB = 36;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxVal = Math.max(
    ...timeline.map((p) => Math.max(p.upper_bound || 0, p.predicted || 0, p.actual || 0)),
    10000
  ) * 1.12;

  const xFor = (i: number) =>
    timeline.length === 1 ? padL + plotW / 2 : padL + (i / (timeline.length - 1)) * plotW;
  const yFor = (val: number) => padT + plotH - (val / maxVal) * plotH;

  const points = timeline.map((p, idx) => ({
    ...p,
    x: xFor(idx),
    yPred: yFor(p.predicted),
    yLow: yFor(p.lower_bound),
    yHigh: yFor(p.upper_bound),
  }));

  const linePath = points
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.yPred.toFixed(1)}`)
    .join(" ");

  const lastIdx = points.length - 1;
  const prevIdx = Math.max(0, lastIdx - 1);
  const bandPolygon = `${points[prevIdx].x},${points[prevIdx].yPred} ${points[lastIdx].x},${points[lastIdx].yHigh} ${points[lastIdx].x},${points[lastIdx].yLow}`;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label="Monthly historical spend and Prophet-style next-month forecast chart with 80% confidence interval"
      >
        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75, 1].map((frac, idx) => {
          const val = Math.round(maxVal * frac);
          const y = yFor(val);
          return (
            <g key={idx}>
              <line
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                stroke="#FCE4EC"
                strokeDasharray="4 4"
              />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-muted text-[9px] font-medium">
                ₹{Math.round(val / 1000)}k
              </text>
            </g>
          );
        })}

        {/* 80% Confidence Interval Cone for Forecast */}
        {points.length >= 2 && (
          <polygon points={bandPolygon} fill="rgba(216, 27, 96, 0.16)" />
        )}

        {/* Trend & Forecast Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#D81B60"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Data nodes */}
        {points.map((pt, i) => (
          <g key={pt.month}>
            {pt.is_forecast && (
              <line
                x1={pt.x}
                y1={pt.yHigh}
                x2={pt.x}
                y2={pt.yLow}
                stroke="#AD1457"
                strokeWidth="2"
                strokeDasharray="3 2"
              />
            )}
            <circle
              cx={pt.x}
              cy={pt.yPred}
              r={pt.is_forecast ? 6 : 5}
              fill={pt.is_forecast ? "#FFF0F5" : "#D81B60"}
              stroke="#D81B60"
              strokeWidth="3"
            />
            <text
              x={pt.x}
              y={pt.yPred - 10}
              textAnchor="middle"
              className="fill-ink text-[10px] font-bold"
            >
              {formatINR(pt.predicted)}
            </text>
            <text
              x={pt.x}
              y={height - 10}
              textAnchor="middle"
              className={`text-[10px] ${
                pt.is_forecast ? "fill-primary font-extrabold" : "fill-muted font-semibold"
              }`}
            >
              {pt.month} {pt.is_forecast ? "(Forecast)" : ""}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
