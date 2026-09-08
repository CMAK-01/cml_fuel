"use client";

import React from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Truck, 
  Fuel, 
  DollarSign, 
  Layers,
  Award,
  BarChart3,
  Flame,
  ShieldAlert
} from "lucide-react";

interface DashboardViewProps {
  data: any;
  loading: boolean;
  onNavigate: (tab: string) => void;
  onInstall?: () => void;
}

export function DashboardView({ data, loading, onNavigate, onInstall }: DashboardViewProps) {
  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const { kpis, rankings, charts } = data;

  const formatFCFA = (num: number) => {
    return new Intl.NumberFormat("fr-FR").format(num) + " FCFA";
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Executive Welcome & Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
            Vue Exécutive • Power BI BI-Analytics CML
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold mt-2 tracking-tight">
            Tableau de Bord Stratégique Flotte Manganèse
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Supervision en temps réel de plus de 150 engins de la Compagnie Minière du Littoral. Détection anti-vol et audit actif.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigate("refueling")}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/25 flex items-center space-x-2"
          >
            <Fuel className="w-4 h-4" />
            <span>Saisir Ravitaillement</span>
          </button>
          <button
            onClick={() => onNavigate("spc")}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-xl border border-slate-700 transition-all flex items-center space-x-2"
          >
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span>Analyse SPC</span>
          </button>
          {onInstall && (
            <button
              onClick={onInstall}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow flex items-center space-x-2"
            >
              <span>⬇️ Installer App (Win • Android • iOS)</span>
            </button>
          )}
        </div>
      </div>

      {/* Install App Card – visible, explique l’installation */}
      {onInstall && (
        <div className="bg-gradient-to-r from-amber-50 via-white to-emerald-50 rounded-2xl p-5 border-2 border-amber-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-amber-400 font-black flex items-center justify-center">CML</div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Application multi-plateforme • PWA CML</div>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5">Installer CML Fuel Pro sur Windows, Android & iPhone</h3>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                <strong>Windows :</strong> Chrome / Edge → icône <strong>⬇️ Installer</strong> à droite de la barre d’adresse (en haut) → « Installer CML Fuel Management Pro » → raccourci Bureau + menu Démarrer.<br/>
                <strong>Android :</strong> Chrome mobile → menu <strong>⋮</strong> → « Installer l’application » / « Ajouter à l’écran d’accueil ».<br/>
                <strong>iPhone / iPad :</strong> Safari → bouton <strong>Partager ⬆️</strong> en bas → « Sur l’écran d’accueil » → « Ajouter ».<br/>
                Une fois installée, l’app fonctionne <strong>hors ligne</strong> avec Service Worker, plein écran, icône native.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              onClick={onInstall}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-xl shadow"
            >
              📲 Ouvrir le guide d’installation
            </button>
            <button
              onClick={() => onNavigate("mobile")}
              className="px-4 py-3 bg-white border border-slate-300 text-slate-800 font-bold text-sm rounded-xl hover:bg-slate-50"
            >
              Mode Terrain Mobile
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Parc Engins Flotte</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{kpis.totalEngines}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              {kpis.activeEngines} actifs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Capacité totale surveillance en continu</p>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Consommation du Jour</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Fuel className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900">{kpis.todayLiters} L</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-2 text-slate-500">
            <span>Mois en cours : <strong className="text-slate-800">{new Intl.NumberFormat("fr-FR").format(kpis.monthLiters)} L</strong></span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Coût Carburant (FCFA)</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">{formatFCFA(kpis.monthCost)}</span>
          </div>
          <p className="text-xs text-emerald-700 font-medium mt-2">Prix moyen CML : 855 FCFA/L</p>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Stock Carburant Actuel</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{new Intl.NumberFormat("fr-FR").format(kpis.totalStockLiters)} L</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
              {Math.round((kpis.totalStockLiters / (kpis.totalCapacity || 184000)) * 100)}%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">3 Cuves fixes Station + 2 Camions Citernes</p>
        </div>
      </div>

      {/* Second KPI Row: Alerts & Losses vs Savings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-red-900/90 to-slate-900 text-white rounded-2xl p-5 border border-red-800/50 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-300">Alertes Ouvertes & Sécurité</span>
            <ShieldAlert className="w-6 h-6 text-red-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">{kpis.openAlertsCount} Alertes</span>
            <span className="text-xs font-bold bg-red-500/30 text-red-200 px-2.5 py-1 rounded-full">
              {kpis.overconsumptionRate}% surconsommation
            </span>
          </div>
          <p className="text-xs text-red-200/80 mt-2">Contrôle anti-vol et dérives statistiques actifs</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Pertes Estimées (Surconsommation)</span>
            <Flame className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-red-600">{formatFCFA(kpis.estimatedLossesFCFA)}</span>
            <p className="text-xs text-slate-500 mt-1">Écart cumulé au-dessus de la norme de référence (15%)</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Économies Réalisées (Éco-conduite)</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-emerald-600">{formatFCFA(kpis.estimatedSavingsFCFA)}</span>
            <p className="text-xs text-slate-500 mt-1">Gain grâce au suivi rigoureux de la flotte CML</p>
          </div>
        </div>
      </div>

      {/* Visual Chart Section: Consommation par Département */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
          <span>Consommation mensuelle par Département Mine (L)</span>
          <span className="text-xs font-normal text-slate-500">Données en temps réel de distribution</span>
        </h3>
        <div className="space-y-4">
          {Object.entries(charts?.departmentMap || {}).map(([dept, liters], idx) => {
            const maxVal = 50000;
            const pct = Math.min(100, Math.round((Number(liters) / maxVal) * 100));
            const colors = ["bg-amber-500", "bg-blue-600", "bg-emerald-600", "bg-purple-600", "bg-slate-700"];
            return (
              <div key={dept}>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800">{dept}</span>
                  <span className="text-slate-900 font-bold">{new Intl.NumberFormat("fr-FR").format(Number(liters))} L</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`${colors[idx % colors.length]} h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 10 Rankings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Machines Consommatrices */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Flame className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-slate-900">Top 10 Engins Consommateurs (Vol. total)</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">Litres distribués</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                  <th className="py-2">#</th>
                  <th className="py-2">Engin</th>
                  <th className="py-2">Département</th>
                  <th className="py-2 text-right">Consommation (L)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(rankings?.top10Consumers || []).map((eng: any, idx: number) => (
                  <tr key={eng.code} className="hover:bg-slate-50/80">
                    <td className="py-2.5 font-bold text-slate-500">{idx + 1}</td>
                    <td className="py-2.5">
                      <div className="font-bold text-slate-900">{eng.code}</div>
                      <div className="text-[11px] text-slate-500">{eng.name}</div>
                    </td>
                    <td className="py-2.5 text-slate-600">{eng.dept}</td>
                    <td className="py-2.5 text-right font-extrabold text-slate-900">
                      {new Intl.NumberFormat("fr-FR").format(eng.liters)} L
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 10 Surconsommateurs (plus grand écart %) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="text-base font-bold text-slate-900">Top 10 Surconsommateurs (Écart % vs Norme)</h3>
            </div>
            <span className="text-xs text-red-600 font-semibold">Surveillance requise</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                  <th className="py-2">Engin / Chauffeur</th>
                  <th className="py-2">Conso Réelle</th>
                  <th className="py-2">Norme</th>
                  <th className="py-2 text-right">Écart %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(rankings?.top10Overconsumers || []).map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-red-50/30">
                    <td className="py-2.5">
                      <div className="font-bold text-slate-900">{r.code}</div>
                      <div className="text-[11px] text-slate-500">{r.driver}</div>
                    </td>
                    <td className="py-2.5 font-bold text-slate-800">{r.realCons}</td>
                    <td className="py-2.5 text-slate-500">{r.normCons}</td>
                    <td className="py-2.5 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                        +{r.deviation}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top 10 Drivers & Savings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">Top 10 Chauffeurs Économes (Score Efficacité)</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                  <th className="py-2">Chauffeur</th>
                  <th className="py-2">Matricule</th>
                  <th className="py-2">Vol. consommé</th>
                  <th className="py-2 text-right">Score Efficacité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(rankings?.top10Drivers || []).map((d: any, idx: number) => (
                  <tr key={d.matricule} className="hover:bg-emerald-50/20">
                    <td className="py-2.5 font-bold text-slate-900">{d.name}</td>
                    <td className="py-2.5 text-slate-500">{d.matricule}</td>
                    <td className="py-2.5 text-slate-700">{new Intl.NumberFormat("fr-FR").format(d.consumed)} L</td>
                    <td className="py-2.5 text-right font-extrabold text-emerald-600">{d.efficiency}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">Top 10 Économies par Équipement (Estimées)</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                  <th className="py-2">Équipement</th>
                  <th className="py-2">Litres Économisés</th>
                  <th className="py-2 text-right">Gain Estimé (FCFA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(rankings?.top10Savings || []).map((s: any, idx: number) => (
                  <tr key={s.code} className="hover:bg-blue-50/20">
                    <td className="py-2.5">
                      <div className="font-bold text-slate-900">{s.code}</div>
                      <div className="text-[11px] text-slate-500">{s.name}</div>
                    </td>
                    <td className="py-2.5 font-semibold text-blue-600">+{new Intl.NumberFormat("fr-FR").format(s.savingsLiters)} L</td>
                    <td className="py-2.5 text-right font-extrabold text-slate-900">{formatFCFA(s.savingsFCFA)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
