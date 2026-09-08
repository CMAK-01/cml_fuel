"use client";

import React, { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Download, Calendar, Filter, RotateCcw, Truck, BarChart3 } from "lucide-react";

interface ReportsViewProps {
  refuelings: any[];
  tanks: any[];
  engines: any[];
}

type ReportType = "QUOTIDIEN" | "HEBDOMADAIRE" | "MENSUEL" | "ANNUEL";
type FilterMode = "TOUT" | "JOUR" | "MOIS";

export function ReportsView({ refuelings, tanks, engines }: ReportsViewProps) {
  const [reportType, setReportType] = useState<ReportType>("MENSUEL");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("TOUT");
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEngineCode, setSelectedEngineCode] = useState<string>("TOUS");

  const selectedEngine = useMemo(() => {
    if (selectedEngineCode === "TOUS") return null;
    return engines.find((e) => e.code === selectedEngineCode) || null;
  }, [engines, selectedEngineCode]);

  const filteredRefuelings = useMemo(() => {
    return refuelings.filter((r) => {
      const d = String(r.date || "");
      const dateOk =
        filterMode === "JOUR" ? d === selectedDay :
        filterMode === "MOIS" ? d.startsWith(selectedMonth) :
        true;
      const engineOk = selectedEngineCode === "TOUS" || r.engineCode === selectedEngineCode;
      return dateOk && engineOk;
    });
  }, [refuelings, filterMode, selectedDay, selectedMonth, selectedEngineCode]);

  const totalLiters = filteredRefuelings.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
  const totalCost = filteredRefuelings.reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
  const avgConsumption = filteredRefuelings.length
    ? filteredRefuelings.reduce((acc, r) => acc + (Number(r.realConsumption) || 0), 0) / filteredRefuelings.length
    : 0;
  const maxConsumption = filteredRefuelings.length
    ? Math.max(...filteredRefuelings.map((r) => Number(r.realConsumption) || 0))
    : 0;
  const alertCount = filteredRefuelings.filter((r) => r.alertLevel && r.alertLevel !== "Normal").length;
  const servicesUsed = Array.from(new Set(filteredRefuelings.map((r) => r.service).filter(Boolean)));
  const driversUsed = Array.from(new Set(filteredRefuelings.map((r) => r.driverName).filter(Boolean)));

  const periodLabel =
    filterMode === "JOUR"
      ? `Jour du ${new Date(selectedDay).toLocaleDateString("fr-FR")}`
      : filterMode === "MOIS"
      ? `Mois de ${new Date(`${selectedMonth}-01`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`
      : "Toutes les périodes";

  const engineLabel = selectedEngine
    ? `${selectedEngine.code} – ${selectedEngine.brand} ${selectedEngine.model}`
    : "Tous les équipements";

  const resetFilter = () => {
    setFilterMode("TOUT");
    setSelectedEngineCode("TOUS");
  };

  const handleDownload = (format: "PDF" | "EXCEL") => {
    setDownloading(format);
    setTimeout(() => {
      if (format === "EXCEL") {
        let content = "Code Ravitaillement;Date;Heure;Engin;Type;Marque;Modele;Service;Chauffeur;Quantité (L);Prix (FCFA);Montant (FCFA);Conso Réelle;Norme;Ecart %;Alerte;Observation\n";
        filteredRefuelings.forEach((r) => {
          const eng = engines.find((e) => e.code === r.engineCode);
          content += `${r.refuelingCode};${r.date};${r.time};${r.engineCode};${eng?.category || ""};${eng?.brand || ""};${eng?.model || ""};${r.service || ""};${r.driverName};${r.quantity};${r.unitPrice};${r.totalAmount};${r.realConsumption};${r.referenceConsumption};${r.deviationPercent};${r.alertLevel};${r.observation || ""}\n`;
        });
        const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const enginePart = selectedEngineCode === "TOUS" ? "TOUS_ENGINS" : selectedEngineCode;
        const periodPart = filterMode === "JOUR" ? selectedDay : filterMode === "MOIS" ? selectedMonth : "TOUT";
        link.setAttribute("download", `Rapport_CML_${enginePart}_${reportType}_${filterMode}_${periodPart}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Rapport CML - ${engineLabel} - ${periodLabel}</title>
                <style>
                  body { font-family: Arial, sans-serif; padding: 30px; color: #1e293b; }
                  h1 { color: #0f172a; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; }
                  h2 { color: #334155; margin-top: 24px; }
                  .meta { color: #475569; font-size: 12px; margin-bottom: 6px; }
                  .kpi { display: flex; flex-wrap: wrap; gap: 12px; margin: 20px 0; }
                  .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #f8fafc; min-width: 130px; }
                  .label { color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: bold; }
                  .value { color: #0f172a; font-size: 18px; font-weight: 900; margin-top: 4px; }
                  table { border-collapse: collapse; margin-top: 20px; width: 100%; }
                  th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 11px; }
                  th { background: #f8fafc; font-weight: bold; color: #334155; }
                </style>
              </head>
              <body>
                <h1>Compagnie Minière du Littoral (CML) - Rapport Carburant ${reportType}</h1>
                <p class="meta">Équipement : <b>${engineLabel}</b></p>
                <p class="meta">Période : <b>${periodLabel}</b></p>
                <p class="meta">Date de génération : ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}</p>
                ${selectedEngine ? `
                  <h2>Fiche équipement</h2>
                  <p class="meta"><b>ID :</b> ${selectedEngine.code}</p>
                  <p class="meta"><b>Type :</b> ${selectedEngine.category || selectedEngine.type}</p>
                  <p class="meta"><b>Marque :</b> ${selectedEngine.brand}</p>
                  <p class="meta"><b>Modèle :</b> ${selectedEngine.model}</p>
                  <p class="meta"><b>Service par défaut :</b> ${selectedEngine.department}</p>
                  <p class="meta"><b>Consommation normale :</b> ${selectedEngine.normalConsumption} ${selectedEngine.unit}</p>
                ` : ""}
                <div class="kpi">
                  <div class="card"><div class="label">Opérations</div><div class="value">${filteredRefuelings.length}</div></div>
                  <div class="card"><div class="label">Volume total</div><div class="value">${new Intl.NumberFormat("fr-FR").format(totalLiters)} L</div></div>
                  <div class="card"><div class="label">Coût total</div><div class="value">${new Intl.NumberFormat("fr-FR").format(totalCost)} FCFA</div></div>
                  <div class="card"><div class="label">Conso moyenne</div><div class="value">${avgConsumption.toFixed(2)}</div></div>
                  <div class="card"><div class="label">Alertes</div><div class="value">${alertCount}</div></div>
                </div>
                <table>
                  <thead>
                    <tr><th>Date</th><th>Engin</th><th>Service</th><th>Chauffeur</th><th>Volume (L)</th><th>Conso réelle</th><th>Écart %</th><th>Alerte</th><th>Observation</th></tr>
                  </thead>
                  <tbody>
                    ${filteredRefuelings.map(r => `<tr><td>${r.date} ${r.time}</td><td><b>${r.engineCode}</b></td><td>${r.service || "-"}</td><td>${r.driverName}</td><td>${r.quantity} L</td><td>${r.realConsumption}</td><td>${r.deviationPercent || 0}%</td><td>${r.alertLevel}</td><td>${r.observation || "-"}</td></tr>`).join("")}
                  </tbody>
                </table>
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
      }
      setDownloading(null);
    }, 500);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 text-amber-500" />
            <span>Générateur de Rapports & Exports Officiels CML</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Filtrez par jour, mois et équipement pour obtenir un rapport complet sur un engin sélectionné.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleDownload("PDF")}
            disabled={!!downloading}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>{downloading === "PDF" ? "Génération..." : "Exporter PDF filtré"}</span>
          </button>
          <button
            onClick={() => handleDownload("EXCEL")}
            disabled={!!downloading}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>{downloading === "EXCEL" ? "Génération..." : "Exporter Excel filtré"}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
            <Filter className="w-4 h-4 text-amber-500" />
            <span>Filtres de rapport</span>
          </h3>
          <button
            onClick={resetFilter}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700">Mode de période</label>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as FilterMode)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-slate-50 text-slate-900"
            >
              <option value="TOUT">Toutes les dates</option>
              <option value="JOUR">Filtrer par jour</option>
              <option value="MOIS">Filtrer par mois</option>
            </select>
          </div>

          <div className={filterMode === "JOUR" ? "" : "opacity-40 pointer-events-none"}>
            <label className="font-bold text-slate-700">Choisir un jour précis</label>
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-slate-900"
            />
          </div>

          <div className={filterMode === "MOIS" ? "" : "opacity-40 pointer-events-none"}>
            <label className="font-bold text-slate-700">Choisir un mois</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-slate-900"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 flex items-center space-x-1">
              <Truck className="w-3.5 h-3.5 text-amber-600" />
              <span>Équipement / Engin</span>
            </label>
            <select
              value={selectedEngineCode}
              onChange={(e) => setSelectedEngineCode(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-slate-50 text-slate-900"
            >
              <option value="TOUS">Tous les équipements</option>
              {engines
                .slice()
                .sort((a, b) => String(a.code).localeCompare(String(b.code)))
                .map((e) => (
                  <option key={e.code} value={e.code}>
                    {e.code} – {e.brand} – {e.model}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-semibold flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-amber-600" />
          <span>Période : <strong>{periodLabel}</strong> — Équipement : <strong>{engineLabel}</strong> — {filteredRefuelings.length} opération(s).</span>
        </div>
      </div>

      {selectedEngine && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 border border-slate-700 shadow-lg">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400">Rapport complet équipement sélectionné</span>
              <h3 className="text-xl font-black mt-1">{selectedEngine.code} — {selectedEngine.brand}</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-4xl">{selectedEngine.model}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/10 rounded-xl p-3 border border-white/10"><div className="text-slate-400">Type</div><div className="font-bold">{selectedEngine.category || selectedEngine.type}</div></div>
              <div className="bg-white/10 rounded-xl p-3 border border-white/10"><div className="text-slate-400">Service par défaut</div><div className="font-bold">{selectedEngine.department}</div></div>
              <div className="bg-white/10 rounded-xl p-3 border border-white/10"><div className="text-slate-400">Norme</div><div className="font-bold">{selectedEngine.normalConsumption} {selectedEngine.unit}</div></div>
              <div className="bg-white/10 rounded-xl p-3 border border-white/10"><div className="text-slate-400">Capacité réservoir</div><div className="font-bold">{selectedEngine.tankCapacity} L</div></div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["QUOTIDIEN", "HEBDOMADAIRE", "MENSUEL", "ANNUEL"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            className={`p-4 rounded-2xl border text-left transition-all ${
              reportType === type
                ? "bg-amber-500 text-slate-950 border-amber-500 shadow-lg font-extrabold"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-semibold"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider opacity-80">Rapport CML</div>
            <div className="text-base mt-1">{type}</div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b pb-4 gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span>Aperçu Synthétique : Rapport {reportType}</span>
            </h3>
            <p className="text-xs text-slate-500">Période : {periodLabel} • Équipement : {engineLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
            <span className="p-2 bg-blue-50 rounded-xl text-blue-900">Opérations : {filteredRefuelings.length}</span>
            <span className="p-2 bg-amber-50 rounded-xl text-amber-900">Vol : {new Intl.NumberFormat("fr-FR").format(totalLiters)} L</span>
            <span className="p-2 bg-emerald-50 rounded-xl text-emerald-900">Coût : {new Intl.NumberFormat("fr-FR").format(totalCost)} FCFA</span>
            <span className="p-2 bg-slate-100 rounded-xl text-slate-800">Conso moy. : {avgConsumption.toFixed(2)}</span>
            <span className="p-2 bg-red-50 rounded-xl text-red-800">Alertes : {alertCount}</span>
          </div>
        </div>

        {selectedEngine && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200"><strong>Consommation max observée :</strong> {maxConsumption.toFixed(2)} {selectedEngine.unit}</div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200"><strong>Services utilisés :</strong> {servicesUsed.length ? servicesUsed.join(", ") : "—"}</div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200"><strong>Chauffeurs :</strong> {driversUsed.length ? driversUsed.join(", ") : "—"}</div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <th className="p-3">Date</th>
                <th className="p-3">Engin</th>
                <th className="p-3">Service</th>
                <th className="p-3">Chauffeur</th>
                <th className="p-3 text-right">Litres</th>
                <th className="p-3 text-right">Conso Réelle</th>
                <th className="p-3 text-right">Écart %</th>
                <th className="p-3 text-center">Statut Alerte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRefuelings.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    Aucun ravitaillement trouvé pour l’équipement et la période sélectionnés.
                  </td>
                </tr>
              )}
              {filteredRefuelings.slice(0, 100).map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-800">{r.date} {r.time}</td>
                  <td className="p-3 font-extrabold text-slate-900">{r.engineCode}</td>
                  <td className="p-3 text-slate-700 font-medium">{r.service || "-"}</td>
                  <td className="p-3 text-slate-700">{r.driverName}</td>
                  <td className="p-3 text-right font-bold text-slate-900">{r.quantity} L</td>
                  <td className="p-3 text-right font-medium">{r.realConsumption} {r.engineCode?.startsWith("V") ? "L/100km" : "L/H"}</td>
                  <td className="p-3 text-right font-medium">{Number(r.deviationPercent || 0).toFixed(1)}%</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.alertLevel === "Normal" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                      {r.alertLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
