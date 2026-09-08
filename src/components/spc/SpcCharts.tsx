"use client";

// ============================================================================
// Composants graphiques du module "Contrôle Statistique des Consommations".
// Basés sur Recharts. Chaque graphique est autonome, typé et réutilisable.
// ============================================================================

import React from "react";
import {
  ComposedChart,
  LineChart,
  BarChart,
  Line,
  Bar,
  Area,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Dot
} from "recharts";
import type {
  IChartResult,
  MRChartResult,
  CusumResult,
  EwmaResult,
  TrendResult,
  HistogramBin,
  BoxplotStats
} from "@/lib/spc-stats";

const COLORS = {
  value: "#0f172a",
  ok: "#10b981",
  bad: "#dc2626",
  cl: "#f59e0b",
  ucl: "#dc2626",
  lcl: "#2563eb",
  cusumPos: "#dc2626",
  cusumNeg: "#2563eb",
  ewma: "#7c3aed",
  trend: "#059669",
  histogram: "#f59e0b"
};

function formatDateShort(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  } catch {
    return dateStr;
  }
}

// ----------------------------------------------------------------------------
// Carte I (Individuals Chart)
// ----------------------------------------------------------------------------

function IChartTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  const ecart = p.cl ? (((p.value - p.cl) / p.cl) * 100).toFixed(1) : "0";
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-[11px] space-y-1">
      <div className="font-extrabold text-slate-900">{p.date}</div>
      <div className="text-slate-700">Consommation : <b>{p.value?.toFixed(2)}</b></div>
      <div className="text-amber-700">Ligne centrale (CL) : {p.cl?.toFixed(2)}</div>
      <div className="text-red-600">LCS : {p.ucl?.toFixed(2)}</div>
      <div className="text-blue-600">LCI : {p.lcl?.toFixed(2)}</div>
      <div className={`font-bold ${Number(ecart) >= 0 ? "text-red-700" : "text-emerald-700"}`}>
        Écart vs moyenne : {ecart}%
      </div>
      {p.isOutOfControl && <div className="text-red-700 font-black">⚠ Point hors contrôle</div>}
    </div>
  );
}

function IChartDot(props: any) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined) return null;
  const color = payload.isOutOfControl ? COLORS.bad : COLORS.ok;
  return <circle cx={cx} cy={cy} r={payload.isOutOfControl ? 5 : 3.5} fill={color} stroke="#fff" strokeWidth={1} />;
}

export function SpcIChart({ result }: { result: IChartResult }) {
  const data = result.points.map((p) => ({
    date: formatDateShort(p.date),
    value: Number(p.value.toFixed(2)),
    cl: result.cl,
    ucl: result.ucl,
    lcl: result.lcl,
    isOutOfControl: p.isOutOfControl
  }));

  if (!data.length) return <EmptyChart label="Carte I" />;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip content={<IChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={result.ucl} stroke={COLORS.ucl} strokeDasharray="6 3" label={{ value: "LCS", fontSize: 10, fill: COLORS.ucl }} />
        <ReferenceLine y={result.cl} stroke={COLORS.cl} strokeDasharray="4 4" label={{ value: "CL", fontSize: 10, fill: COLORS.cl }} />
        <ReferenceLine y={result.lcl} stroke={COLORS.lcl} strokeDasharray="6 3" label={{ value: "LCI", fontSize: 10, fill: COLORS.lcl }} />
        <Line type="monotone" dataKey="value" name="Consommation journalière" stroke={COLORS.value} strokeWidth={1.5} dot={<IChartDot />} activeDot={{ r: 6 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ----------------------------------------------------------------------------
// Carte MR (Moving Range)
// ----------------------------------------------------------------------------

export function SpcMRChart({ result }: { result: MRChartResult }) {
  const data = result.points
    .filter((p) => p.value !== null)
    .map((p) => ({ date: formatDateShort(p.date), value: Number((p.value as number).toFixed(2)) }));

  if (!data.length) return <EmptyChart label="Carte MR" />;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={result.ucl} stroke={COLORS.ucl} strokeDasharray="6 3" label={{ value: "LCS(MR)", fontSize: 10, fill: COLORS.ucl }} />
        <ReferenceLine y={result.mrBar} stroke={COLORS.cl} strokeDasharray="4 4" label={{ value: "MR̄", fontSize: 10, fill: COLORS.cl }} />
        <ReferenceLine y={0} stroke={COLORS.lcl} label={{ value: "LCI(MR)=0", fontSize: 10, fill: COLORS.lcl }} />
        <Line type="monotone" dataKey="value" name="Étendue mobile (MR)" stroke="#334155" strokeWidth={1.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ----------------------------------------------------------------------------
// Carte CUSUM
// ----------------------------------------------------------------------------

export function SpcCusumChart({ result }: { result: CusumResult }) {
  const data = result.points.map((p) => ({
    date: formatDateShort(p.date),
    cusumPos: Number(p.cusumPos.toFixed(2)),
    cusumNeg: Number((-p.cusumNeg).toFixed(2)),
    isDrift: p.isDrift
  }));

  if (!data.length) return <EmptyChart label="Carte CUSUM" />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={result.h} stroke={COLORS.bad} strokeDasharray="6 3" label={{ value: "H+", fontSize: 10, fill: COLORS.bad }} />
        <ReferenceLine y={-result.h} stroke={COLORS.bad} strokeDasharray="6 3" label={{ value: "H-", fontSize: 10, fill: COLORS.bad }} />
        <ReferenceLine y={0} stroke="#94a3b8" />
        <Line type="monotone" dataKey="cusumPos" name="CUSUM+" stroke={COLORS.cusumPos} strokeWidth={2} dot={{ r: 2.5 }} />
        <Line type="monotone" dataKey="cusumNeg" name="CUSUM-" stroke={COLORS.cusumNeg} strokeWidth={2} dot={{ r: 2.5 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ----------------------------------------------------------------------------
// Carte EWMA
// ----------------------------------------------------------------------------

export function SpcEwmaChart({ result, cl }: { result: EwmaResult; cl: number }) {
  const data = result.points.map((p) => ({
    date: formatDateShort(p.date),
    ewma: Number(p.ewma.toFixed(2)),
    ucl: Number(p.ucl.toFixed(2)),
    lcl: Number(p.lcl.toFixed(2)),
    isOutOfControl: p.isOutOfControl
  }));

  if (!data.length) return <EmptyChart label="Carte EWMA" />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={cl} stroke={COLORS.cl} strokeDasharray="4 4" label={{ value: "CL", fontSize: 10, fill: COLORS.cl }} />
        <Line type="monotone" dataKey="ucl" name="LCS dynamique" stroke={COLORS.ucl} strokeWidth={1} dot={false} strokeDasharray="5 3" />
        <Line type="monotone" dataKey="lcl" name="LCI dynamique" stroke={COLORS.lcl} strokeWidth={1} dot={false} strokeDasharray="5 3" />
        <Line
          type="monotone"
          dataKey="ewma"
          name="EWMA (λ=0.20)"
          stroke={COLORS.ewma}
          strokeWidth={2}
          dot={(props: any) => {
            const { cx, cy, payload, index } = props;
            return (
              <circle
                key={`ewma-dot-${index}`}
                cx={cx}
                cy={cy}
                r={payload.isOutOfControl ? 5 : 3}
                fill={payload.isOutOfControl ? COLORS.bad : COLORS.ewma}
                stroke="#fff"
                strokeWidth={1}
              />
            );
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ----------------------------------------------------------------------------
// Analyse de tendance (régression linéaire)
// ----------------------------------------------------------------------------

export function SpcTrendChart({ result }: { result: TrendResult }) {
  const data = result.points.map((p) => ({
    date: formatDateShort(p.date),
    value: Number(p.value.toFixed(2)),
    trend: Number(p.trend.toFixed(2))
  }));

  if (!data.length) return <EmptyChart label="Analyse de tendance" />;

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="value" name="Consommation" stroke="#0f172a" strokeWidth={1.5} dot={{ r: 2.5 }} />
          <Line type="monotone" dataKey="trend" name="Tendance linéaire" stroke={COLORS.trend} strokeWidth={2} strokeDasharray="6 3" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-bold">
        <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">Équation : {result.equation}</span>
        <span className="px-2 py-1 rounded bg-slate-50 text-slate-800 border border-slate-200">R² : {result.r2.toFixed(3)}</span>
        <span className={`px-2 py-1 rounded border ${result.slope > 0 ? "bg-red-50 text-red-800 border-red-200" : "bg-blue-50 text-blue-800 border-blue-200"}`}>
          Tendance : {result.slope > 0 ? "Hausse" : result.slope < 0 ? "Baisse" : "Stable"}
        </span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Histogramme
// ----------------------------------------------------------------------------

export function SpcHistogram({ bins, meanValue, medianValue }: { bins: HistogramBin[]; meanValue: number; medianValue: number }) {
  if (!bins.length) return <EmptyChart label="Histogramme" />;
  const data = bins.map((b) => ({ label: b.label, count: b.count }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          <Bar dataKey="count" name="Nombre d'observations" fill={COLORS.histogram} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-bold">
        <span className="px-2 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200">Moyenne : {meanValue.toFixed(2)}</span>
        <span className="px-2 py-1 rounded bg-slate-50 text-slate-800 border border-slate-200">Médiane : {medianValue.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Box Plot (SVG personnalisé — Recharts ne propose pas de boxplot natif)
// ----------------------------------------------------------------------------

export function SpcBoxPlot({ stats }: { stats: BoxplotStats }) {
  if (stats.max === stats.min && stats.outliers.length === 0 && stats.q1 === 0 && stats.q3 === 0) {
    return <EmptyChart label="Box Plot" />;
  }

  const width = 480;
  const height = 160;
  const padding = 40;
  const domainMin = Math.min(stats.min, ...stats.outliers, stats.lowerFence);
  const domainMax = Math.max(stats.max, ...stats.outliers, stats.upperFence);
  const range = domainMax - domainMin || 1;

  const scaleX = (v: number) => padding + ((v - domainMin) / range) * (width - 2 * padding);
  const midY = height / 2;
  const boxHeight = 46;

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="mx-auto">
        {/* Ligne des moustaches (whiskers) */}
        <line x1={scaleX(stats.min)} y1={midY} x2={scaleX(stats.q1)} y2={midY} stroke="#334155" strokeWidth={1.5} />
        <line x1={scaleX(stats.q3)} y1={midY} x2={scaleX(stats.max)} y2={midY} stroke="#334155" strokeWidth={1.5} />
        <line x1={scaleX(stats.min)} y1={midY - 10} x2={scaleX(stats.min)} y2={midY + 10} stroke="#334155" strokeWidth={1.5} />
        <line x1={scaleX(stats.max)} y1={midY - 10} x2={scaleX(stats.max)} y2={midY + 10} stroke="#334155" strokeWidth={1.5} />

        {/* Boîte interquartile Q1-Q3 */}
        <rect
          x={scaleX(stats.q1)}
          y={midY - boxHeight / 2}
          width={Math.max(2, scaleX(stats.q3) - scaleX(stats.q1))}
          height={boxHeight}
          fill="#fef3c7"
          stroke="#f59e0b"
          strokeWidth={2}
          rx={4}
        />

        {/* Ligne médiane */}
        <line x1={scaleX(stats.median)} y1={midY - boxHeight / 2} x2={scaleX(stats.median)} y2={midY + boxHeight / 2} stroke="#b45309" strokeWidth={2.5} />

        {/* Outliers */}
        {stats.outliers.map((o, i) => (
          <circle key={i} cx={scaleX(o)} cy={midY} r={4} fill="#dc2626" stroke="#fff" strokeWidth={1} />
        ))}

        {/* Labels */}
        <text x={scaleX(stats.min)} y={midY + 26} fontSize="9" textAnchor="middle" fill="#64748b">Min {stats.min.toFixed(1)}</text>
        <text x={scaleX(stats.q1)} y={midY - boxHeight / 2 - 8} fontSize="9" textAnchor="middle" fill="#92400e">Q1 {stats.q1.toFixed(1)}</text>
        <text x={scaleX(stats.median)} y={midY - boxHeight / 2 - 8} fontSize="9" textAnchor="middle" fill="#b45309" fontWeight="bold">Médiane {stats.median.toFixed(1)}</text>
        <text x={scaleX(stats.q3)} y={midY - boxHeight / 2 - 8} fontSize="9" textAnchor="middle" fill="#92400e">Q3 {stats.q3.toFixed(1)}</text>
        <text x={scaleX(stats.max)} y={midY + 26} fontSize="9" textAnchor="middle" fill="#64748b">Max {stats.max.toFixed(1)}</text>
      </svg>
      {stats.outliers.length > 0 && (
        <p className="text-center text-[11px] text-red-700 font-bold mt-1">
          {stats.outliers.length} valeur(s) aberrante(s) détectée(s) : {stats.outliers.map((o) => o.toFixed(1)).join(", ")}
        </p>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Composant d'état vide (aucune donnée)
// ----------------------------------------------------------------------------

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-48 flex items-center justify-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl">
      Aucune donnée disponible pour « {label} » avec les filtres actuels.
    </div>
  );
}
