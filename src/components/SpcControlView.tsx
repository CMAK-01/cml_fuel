"use client";

// ============================================================================
// Module "Contrôle Statistique des Consommations" – CML Fuel Management Pro
// Vue complète : filtres, KPI, cartes SPC (I, MR, CUSUM, EWMA), histogramme,
// box plot, analyse de tendance, tableau des anomalies WECO, diagnostics
// automatiques, alertes et exports (PDF / Excel / CSV / Impression).
// ============================================================================

import React, { useMemo, useState } from "react";
import {
  BarChart3,
  Filter,
  RotateCcw,
  FileText,
  Download,
  Printer,
  Gauge,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  Sigma,
  Activity,
  Sparkles,
  ChevronDown
} from "lucide-react";
import {
  mean,
  median,
  stdDevSample,
  coefficientOfVariation,
  computeIChart,
  computeMRChart,
  detectWecoViolations,
  computeCusum,
  computeEwma,
  computeTrend,
  computeHistogram,
  boxplotStats,
  runDiagnostics,
  computeGlobalAlertLevel,
  type SpcPoint,
  type GlobalAlertLevel
} from "@/lib/spc-stats";
import {
  SpcIChart,
  SpcMRChart,
  SpcCusumChart,
  SpcEwmaChart,
  SpcTrendChart,
  SpcHistogram,
  SpcBoxPlot
} from "@/components/spc/SpcCharts";
import { SpcAnomaliesTable, type AnomalyRow } from "@/components/spc/SpcAnomaliesTable";

interface SpcControlViewProps {
  refuelings: any[];
  engines: any[];
  drivers: any[];
}

interface FiltersState {
  dateFrom: string;
  dateTo: string;
  department: string;
  engineCode: string;
  engineType: string;
  brand: string;
  model: string;
  site: string;
  pump: string;
  driver: string;
}

const DEFAULT_FILTERS: FiltersState = {
  dateFrom: "",
  dateTo: "",
  department: "TOUS",
  engineCode: "TOUS",
  engineType: "TOUS",
  brand: "TOUS",
  model: "TOUS",
  site: "TOUS",
  pump: "TOUS",
  driver: "TOUS"
};

function uniqueSorted(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v && String(v).trim() !== ""))).sort((a, b) =>
    a.localeCompare(b)
  );
}

const ALERT_BANNER_STYLES: Record<GlobalAlertLevel, string> = {
  "Vert": "bg-emerald-50 border-emerald-300 text-emerald-900",
  "Orange": "bg-amber-50 border-amber-300 text-amber-900",
  "Rouge": "bg-red-50 border-red-400 text-red-900",
  "Rouge foncé": "bg-red-900 border-red-950 text-white"
};

const DIAGNOSTIC_STYLES: Record<string, string> = {
  info: "bg-blue-50 border-blue-200 text-blue-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  danger: "bg-red-50 border-red-300 text-red-900",
  critical: "bg-red-900 border-red-950 text-white"
};

export function SpcControlView({ refuelings, engines, drivers }: SpcControlViewProps) {
  const [pendingFilters, setPendingFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(DEFAULT_FILTERS);

  // --------------------------------------------------------------------
  // Références croisées Engin -> fiche technique
  // --------------------------------------------------------------------
  const engineByCode = useMemo(() => {
    const map = new Map<string, any>();
    engines.forEach((e) => map.set(e.code, e));
    return map;
  }, [engines]);

  // --------------------------------------------------------------------
  // Options des filtres, dérivées des données existantes (aucun doublon)
  // --------------------------------------------------------------------
  const filterOptions = useMemo(() => {
    return {
      departments: uniqueSorted(refuelings.map((r) => r.service).concat(engines.map((e) => e.department))),
      engineCodes: uniqueSorted(refuelings.map((r) => r.engineCode)),
      engineTypes: uniqueSorted(engines.map((e) => e.type)),
      brands: uniqueSorted(engines.map((e) => e.brand)),
      models: uniqueSorted(engines.map((e) => e.model)),
      sites: uniqueSorted(refuelings.map((r) => r.refuelingPoint)),
      pumps: uniqueSorted(refuelings.map((r) => r.tankCode)),
      drivers: uniqueSorted(refuelings.map((r) => r.driverName))
    };
  }, [refuelings, engines]);

  // --------------------------------------------------------------------
  // Application des filtres sur l'historique des ravitaillements
  // --------------------------------------------------------------------
  const filteredRefuelings = useMemo(() => {
    const f = appliedFilters;
    return refuelings.filter((r) => {
      const eng = engineByCode.get(r.engineCode);
      const dept = r.service || eng?.department;
      if (f.dateFrom && String(r.date) < f.dateFrom) return false;
      if (f.dateTo && String(r.date) > f.dateTo) return false;
      if (f.department !== "TOUS" && dept !== f.department) return false;
      if (f.engineCode !== "TOUS" && r.engineCode !== f.engineCode) return false;
      if (f.engineType !== "TOUS" && eng?.type !== f.engineType) return false;
      if (f.brand !== "TOUS" && eng?.brand !== f.brand) return false;
      if (f.model !== "TOUS" && eng?.model !== f.model) return false;
      if (f.site !== "TOUS" && r.refuelingPoint !== f.site) return false;
      if (f.pump !== "TOUS" && r.tankCode !== f.pump) return false;
      if (f.driver !== "TOUS" && r.driverName !== f.driver) return false;
      return true;
    });
  }, [refuelings, appliedFilters, engineByCode]);

  // --------------------------------------------------------------------
  // Agrégation journalière : 1 point = 1 jour (moyenne des consommations)
  // --------------------------------------------------------------------
  const { series, dailyMeta } = useMemo(() => {
    const map = new Map<string, { values: number[]; engines: Set<string>; departments: Set<string>; deviations: number[] }>();

    filteredRefuelings.forEach((r) => {
      const key = String(r.date);
      if (!map.has(key)) {
        map.set(key, { values: [], engines: new Set(), departments: new Set(), deviations: [] });
      }
      const bucket = map.get(key)!;
      const val = Number(r.realConsumption) || 0;
      if (val > 0) bucket.values.push(val);
      bucket.engines.add(r.engineCode);
      const eng = engineByCode.get(r.engineCode);
      bucket.departments.add(r.service || eng?.department || "N/A");
      bucket.deviations.push(Number(r.deviationPercent) || 0);
    });

    const seriesResult: SpcPoint[] = Array.from(map.entries())
      .map(([date, bucket]) => ({ date, value: mean(bucket.values) }))
      .filter((p) => p.value > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    return { series: seriesResult, dailyMeta: map };
  }, [filteredRefuelings, engineByCode]);

  // --------------------------------------------------------------------
  // Calculs statistiques complets (SPC)
  // --------------------------------------------------------------------
  const stats = useMemo(() => {
    const values = series.map((p) => p.value);
    const iChart = computeIChart(series);
    const mrChart = computeMRChart(series);
    const weco = detectWecoViolations(series, iChart.cl, iChart.sigma);
    const cusum = computeCusum(series, iChart.cl, iChart.sigma);
    const ewma = computeEwma(series, iChart.cl, iChart.sigma, 0.2);
    const trend = computeTrend(series);
    const histogram = computeHistogram(values, 10);
    const boxplot = boxplotStats(values);
    const cv = coefficientOfVariation(values);
    const outOfControlCount = iChart.points.filter((p) => p.isOutOfControl).length;
    const ewmaOutOfControlCount = ewma.points.filter((p) => p.isOutOfControl).length;
    const allDeviations = Array.from(dailyMeta.values()).flatMap((m) => m.deviations);
    const avgDeviation = mean(allDeviations);
    const distinctEngines = new Set(filteredRefuelings.map((r) => r.engineCode)).size;

    const diagnostics = runDiagnostics({
      cv,
      wecoViolationsCount: weco.length,
      outOfControlCount,
      trendSlope: trend.slope,
      trendR2: trend.r2,
      cusumDrift: cusum.driftDetected,
      averageDeviationPercent: avgDeviation,
      distinctEngineCount: distinctEngines,
      observationsCount: series.length
    });

    const globalAlertLevel = computeGlobalAlertLevel({
      outOfControlCount,
      wecoViolationsCount: weco.length,
      cusumDrift: cusum.driftDetected,
      ewmaOutOfControlCount
    });

    return {
      values,
      iChart,
      mrChart,
      weco,
      cusum,
      ewma,
      trend,
      histogram,
      boxplot,
      cv,
      outOfControlCount,
      ewmaOutOfControlCount,
      avgDeviation,
      distinctEngines,
      diagnostics,
      globalAlertLevel,
      n: series.length,
      meanValue: mean(values),
      medianValue: median(values),
      minValue: values.length ? Math.min(...values) : 0,
      maxValue: values.length ? Math.max(...values) : 0,
      stdDev: stdDevSample(values)
    };
  }, [series, dailyMeta, filteredRefuelings]);

  // --------------------------------------------------------------------
  // Construction du tableau des anomalies (WECO + Individus + CUSUM + EWMA)
  // --------------------------------------------------------------------
  const anomalyRows: AnomalyRow[] = useMemo(() => {
    const rows: AnomalyRow[] = [];

    series.forEach((p, i) => {
      const iPoint = stats.iChart.points[i];
      const wecoAtI = stats.weco.filter((w) => w.index === i);
      const cusumPoint = stats.cusum.points[i];
      const ewmaPoint = stats.ewma.points[i];

      const reasons: string[] = [];
      const ruleLabels: string[] = [];
      let severityRank = 0;

      if (iPoint?.isOutOfControl) {
        reasons.push("Point hors contrôle (au-delà de ±3σ) sur la carte des individuels");
        severityRank = Math.max(severityRank, 4);
      }
      wecoAtI.forEach((w) => {
        ruleLabels.push(w.rule);
        reasons.push(w.description);
        const rank = w.rule === "Règle 1" ? 4 : w.rule === "Règle 2" ? 3 : 2;
        severityRank = Math.max(severityRank, rank);
      });
      if (cusumPoint?.isDrift) {
        reasons.push("Dérive lente détectée par la carte CUSUM");
        severityRank = Math.max(severityRank, 4);
      }
      if (ewmaPoint?.isOutOfControl) {
        reasons.push("Point hors limites dynamiques sur la carte EWMA");
        severityRank = Math.max(severityRank, 3);
      }

      if (reasons.length === 0) return;

      const meta = dailyMeta.get(p.date);
      const engineList = meta ? Array.from(meta.engines) : [];
      const deptList = meta ? Array.from(meta.departments) : [];
      const severity: AnomalyRow["severity"] =
        severityRank >= 4 ? "Critique" : severityRank === 3 ? "Élevée" : severityRank === 2 ? "Modérée" : "Faible";

      rows.push({
        date: p.date,
        engines: engineList.length > 1 ? `${engineList[0]} (+${engineList.length - 1})` : engineList[0] || "-",
        department: deptList.length > 1 ? `${deptList[0]} (+${deptList.length - 1})` : deptList[0] || "-",
        consumption: p.value,
        anomalyType: ruleLabels.length ? ruleLabels.join(", ") : cusumPoint?.isDrift ? "Dérive CUSUM" : "Anomalie EWMA",
        wecoRule: ruleLabels.join(", "),
        severity,
        comment: reasons.join(" | ")
      });
    });

    return rows;
  }, [series, stats, dailyMeta]);

  // --------------------------------------------------------------------
  // Actions filtres
  // --------------------------------------------------------------------
  const applyFilters = () => setAppliedFilters(pendingFilters);
  const resetFilters = () => {
    setPendingFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  };
  const updatePending = (key: keyof FiltersState, value: string) =>
    setPendingFilters((prev) => ({ ...prev, [key]: value }));

  // --------------------------------------------------------------------
  // Exports
  // --------------------------------------------------------------------
  const handleExportCsv = () => {
    let content = "Date;Valeur;CL;LCS;LCI;MR;CUSUM+;CUSUM-;EWMA\n";
    series.forEach((p, i) => {
      content += `${p.date};${p.value.toFixed(3)};${stats.iChart.cl.toFixed(3)};${stats.iChart.ucl.toFixed(3)};${stats.iChart.lcl.toFixed(3)};${stats.mrChart.points[i]?.value ?? ""};${stats.cusum.points[i]?.cusumPos.toFixed(3)};${stats.cusum.points[i]?.cusumNeg.toFixed(3)};${stats.ewma.points[i]?.ewma.toFixed(3)}\n`;
    });
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SPC_Series_Journaliere_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    let content = "Date;Engin(s);Departement;Consommation;Type anomalie;Regle WECO;Gravite;Commentaires\n";
    anomalyRows.forEach((r) => {
      content += `${r.date};${r.engines};${r.department};${r.consumption.toFixed(2)};${r.anomalyType};${r.wecoRule};${r.severity};${r.comment}\n`;
    });
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SPC_Anomalies_CML_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Rapport SPC – Contrôle Statistique des Consommations CML</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #1e293b; }
            h1 { color: #0f172a; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; }
            .kpi { display: flex; flex-wrap: wrap; gap: 12px; margin: 20px 0; }
            .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #f8fafc; min-width: 140px; }
            .label { color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: bold; }
            .value { color: #0f172a; font-size: 18px; font-weight: 900; margin-top: 4px; }
            table { border-collapse: collapse; margin-top: 20px; width: 100%; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 11px; }
            th { background: #f8fafc; font-weight: bold; color: #334155; }
            .diag { padding: 8px 12px; border-radius: 8px; background: #fef3c7; margin-bottom: 6px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Compagnie Minière du Littoral (CML) – Contrôle Statistique des Consommations</h1>
          <p>Date de génération : ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}</p>
          <div class="kpi">
            <div class="card"><div class="label">Observations</div><div class="value">${stats.n}</div></div>
            <div class="card"><div class="label">Moyenne</div><div class="value">${stats.meanValue.toFixed(2)}</div></div>
            <div class="card"><div class="label">Médiane</div><div class="value">${stats.medianValue.toFixed(2)}</div></div>
            <div class="card"><div class="label">Écart-type</div><div class="value">${stats.stdDev.toFixed(2)}</div></div>
            <div class="card"><div class="label">CV (%)</div><div class="value">${stats.cv.toFixed(1)}%</div></div>
            <div class="card"><div class="label">Anomalies</div><div class="value">${anomalyRows.length}</div></div>
            <div class="card"><div class="label">Violations WECO</div><div class="value">${stats.weco.length}</div></div>
            <div class="card"><div class="label">Niveau d'alerte</div><div class="value">${stats.globalAlertLevel}</div></div>
          </div>
          <h3>Diagnostics automatiques</h3>
          ${stats.diagnostics.map((d) => `<div class="diag">${d.message}</div>`).join("")}
          <h3>Tableau des anomalies détectées</h3>
          <table>
            <thead>
              <tr><th>Date</th><th>Engin(s)</th><th>Département</th><th>Consommation</th><th>Type</th><th>Règle WECO</th><th>Gravité</th></tr>
            </thead>
            <tbody>
              ${anomalyRows.map((r) => `<tr><td>${r.date}</td><td>${r.engines}</td><td>${r.department}</td><td>${r.consumption.toFixed(2)}</td><td>${r.anomalyType}</td><td>${r.wecoRule}</td><td>${r.severity}</td></tr>`).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-amber-500" />
            <span>Contrôle Statistique des Consommations</span>
            <span className="px-2 py-0.5 text-[10px] font-black bg-indigo-100 text-indigo-800 rounded-full">SPC Pro</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Surveillance automatique des consommations journalières par cartes de contrôle Shewhart, CUSUM, EWMA et règles Western Electric.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExportPdf} className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
          <button onClick={handleExportExcel} className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5">
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button onClick={handleExportCsv} className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5">
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button onClick={handlePrint} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center space-x-1.5">
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
            <Filter className="w-4 h-4 text-amber-500" />
            <span>Filtres d&apos;analyse</span>
          </h3>
          <button onClick={resetFilters} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center space-x-1">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="font-bold text-slate-700">Période (début)</label>
            <input
              type="date"
              value={pendingFilters.dateFrom}
              onChange={(e) => updatePending("dateFrom", e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-medium"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700">Période (fin)</label>
            <input
              type="date"
              value={pendingFilters.dateTo}
              onChange={(e) => updatePending("dateTo", e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-medium"
            />
          </div>
          <FilterSelect label="Département" value={pendingFilters.department} options={filterOptions.departments} onChange={(v) => updatePending("department", v)} />
          <FilterSelect label="Engin" value={pendingFilters.engineCode} options={filterOptions.engineCodes} onChange={(v) => updatePending("engineCode", v)} />
          <FilterSelect label="Type d'engin" value={pendingFilters.engineType} options={filterOptions.engineTypes} onChange={(v) => updatePending("engineType", v)} />
          <FilterSelect label="Marque" value={pendingFilters.brand} options={filterOptions.brands} onChange={(v) => updatePending("brand", v)} />
          <FilterSelect label="Modèle" value={pendingFilters.model} options={filterOptions.models} onChange={(v) => updatePending("model", v)} />
          <FilterSelect label="Site" value={pendingFilters.site} options={filterOptions.sites} onChange={(v) => updatePending("site", v)} />
          <FilterSelect label="Pompe / Cuve" value={pendingFilters.pump} options={filterOptions.pumps} onChange={(v) => updatePending("pump", v)} />
          <FilterSelect label="Conducteur" value={pendingFilters.driver} options={filterOptions.drivers} onChange={(v) => updatePending("driver", v)} />
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={applyFilters} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-md flex items-center space-x-2">
            <Sparkles className="w-4 h-4" />
            <span>Actualiser les analyses</span>
          </button>
        </div>
      </div>

      {/* Bandeau d'alerte global */}
      <div className={`rounded-2xl border-2 p-4 flex items-center justify-between flex-wrap gap-3 ${ALERT_BANNER_STYLES[stats.globalAlertLevel]}`}>
        <div className="flex items-center space-x-2.5">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <div>
            <div className="text-xs uppercase tracking-wider font-bold opacity-80">Niveau d&apos;alerte global du processus</div>
            <div className="text-lg font-black">{stats.globalAlertLevel}</div>
          </div>
        </div>
        <div className="text-xs font-semibold">
          {stats.n} observation(s) journalière(s) analysée(s) • {anomalyRows.length} anomalie(s) • {stats.weco.length} violation(s) WECO
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard icon={Gauge} label="Observations" value={stats.n.toString()} color="blue" />
        <KpiCard icon={Sigma} label="Moyenne" value={stats.meanValue.toFixed(2)} color="amber" />
        <KpiCard icon={Activity} label="Médiane" value={stats.medianValue.toFixed(2)} color="slate" />
        <KpiCard icon={TrendingUp} label="Minimum" value={stats.minValue.toFixed(2)} color="emerald" />
        <KpiCard icon={TrendingUp} label="Maximum" value={stats.maxValue.toFixed(2)} color="red" />
        <KpiCard icon={Sigma} label="Écart-type" value={stats.stdDev.toFixed(2)} color="indigo" />
        <KpiCard icon={Activity} label="Coeff. Variation" value={`${stats.cv.toFixed(1)}%`} color={stats.cv >= 25 ? "red" : stats.cv >= 15 ? "amber" : "emerald"} />
        <KpiCard icon={AlertTriangle} label="Anomalies détectées" value={anomalyRows.length.toString()} color={anomalyRows.length > 0 ? "red" : "emerald"} />
        <KpiCard icon={ShieldAlert} label="Violations WECO" value={stats.weco.length.toString()} color={stats.weco.length > 0 ? "amber" : "emerald"} />
      </div>

      {/* Diagnostics automatiques */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Diagnostic Automatique du Processus</span>
        </h3>
        <div className="space-y-2">
          {stats.diagnostics.map((d, i) => (
            <div key={i} className={`p-3 rounded-xl border text-xs font-semibold ${DIAGNOSTIC_STYLES[d.severity]}`}>
              {d.message}
            </div>
          ))}
        </div>
      </div>

      {/* Carte I */}
      <ChartCard title="Carte I – Individuals Chart" subtitle="Consommation journalière avec limites de contrôle à ±3σ">
        <SpcIChart result={stats.iChart} />
      </ChartCard>

      {/* Carte MR */}
      <ChartCard title="Carte MR – Moving Range" subtitle="Étendue mobile entre observations consécutives">
        <SpcMRChart result={stats.mrChart} />
      </ChartCard>

      {/* Carte CUSUM */}
      <ChartCard title="Carte CUSUM" subtitle="Détection des dérives lentes et progressives">
        <SpcCusumChart result={stats.cusum} />
        {stats.cusum.driftDetected && (
          <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-xl text-xs font-bold text-red-800 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Dérive détectée par la carte CUSUM : le cumul des écarts dépasse le seuil de décision H.</span>
          </div>
        )}
      </ChartCard>

      {/* Carte EWMA */}
      <ChartCard title="Carte EWMA (λ = 0.20)" subtitle="Moyenne mobile pondérée exponentiellement, sensible aux petites dérives">
        <SpcEwmaChart result={stats.ewma} cl={stats.iChart.cl} />
      </ChartCard>

      {/* Histogramme & Box Plot côte à côte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Histogramme des Consommations" subtitle="Distribution statistique des observations">
          <SpcHistogram bins={stats.histogram} meanValue={stats.meanValue} medianValue={stats.medianValue} />
        </ChartCard>
        <ChartCard title="Box Plot" subtitle="Quartiles, médiane et valeurs aberrantes">
          <SpcBoxPlot stats={stats.boxplot} />
        </ChartCard>
      </div>

      {/* Analyse de tendance */}
      <ChartCard title="Analyse de Tendance" subtitle="Régression linéaire et coefficient de détermination R²">
        <SpcTrendChart result={stats.trend} />
      </ChartCard>

      {/* Tableau des anomalies */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span>Tableau des Anomalies Détectées</span>
        </h3>
        <SpcAnomaliesTable rows={anomalyRows} />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Sous-composants réutilisables
// ----------------------------------------------------------------------------

function FilterSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="font-bold text-slate-700">{label}</label>
      <div className="relative mt-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-2 pr-7 border border-slate-300 rounded-lg font-medium bg-white text-slate-900 appearance-none"
        >
          <option value="TOUS">Tous</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}

const KPI_COLOR_STYLES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
  slate: "bg-slate-100 text-slate-700",
  emerald: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  indigo: "bg-indigo-50 text-indigo-700"
};

function KpiCard({
  icon: Icon,
  label,
  value,
  color
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${KPI_COLOR_STYLES[color] || KPI_COLOR_STYLES.slate}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-2 text-xl font-black text-slate-900">{value}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
