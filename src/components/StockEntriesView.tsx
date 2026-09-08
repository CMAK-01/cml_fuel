"use client";

import React, { useState } from "react";
import { TrendingUp, Plus, Thermometer, ShieldCheck, Clock, Layers } from "lucide-react";

interface StockEntriesViewProps {
  entries: any[];
  tanks: any[];
  suppliers: any[];
  onAddEntry: (data: any) => Promise<void>;
}

export function StockEntriesView({ entries, tanks, suppliers, onAddEntry }: StockEntriesViewProps) {
  const [showModal, setShowModal] = useState(false);

  const [supplierId, setSupplierId] = useState<number>(suppliers[0]?.id || 0);
  const [tankId, setTankId] = useState<number>(tanks[0]?.id || 0);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("08:15");
  const [blNumber, setBlNumber] = useState("");
  const [rawQuantity, setRawQuantity] = useState("35000");
  const [temperature, setTemperature] = useState("37.5");
  const [unitPrice, setUnitPrice] = useState("855");
  const [operator, setOperator] = useState("Koné Seydou");
  const [notes, setNotes] = useState("Livraison citerne semi-remorque TotalEnergies");

  // Real-time thermal dilatation calculation (ISO 15°C)
  // Dilatation coeff = 0.00085 / °C
  const rawQ = Number(rawQuantity) || 0;
  const temp = Number(temperature) || 15;
  const correctedQ = Math.round(rawQ * (1 - (temp - 15) * 0.00085));
  const diffQ = correctedQ - rawQ;
  const totalAmount = rawQ * Number(unitPrice || 855);

  const selSupplier = suppliers.find((s) => s.id === Number(supplierId)) || suppliers[0];
  const selTank = tanks.find((t) => t.id === Number(tankId)) || tanks[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rawQ <= 0) {
      alert("La quantité reçue doit être positive.");
      return;
    }
    await onAddEntry({
      date,
      time,
      supplierId: selSupplier?.id,
      supplierName: selSupplier?.name || "Fournisseur",
      tankId: selTank?.id,
      blNumber,
      rawQuantity: rawQ,
      temperature: temp,
      unitPrice: Number(unitPrice),
      operator,
      notes
    });
    setShowModal(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-amber-500" />
            <span>Réceptions de Stock & Correction Thermique ISO 15°C</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            À 38°C en Côte d&apos;Ivoire, le gasoil se dilate. Le calcul du volume corrigé à 15°C évite les écarts inexpliqués et met à jour automatiquement la cuve sélectionnée.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Saisir une Réception (BL)</span>
        </button>
      </div>

      {/* Stock Entries Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-3.5">Date & Heure</th>
                <th className="p-3.5">N° BL & Fournisseur</th>
                <th className="p-3.5">Cuve Réception</th>
                <th className="p-3.5 text-right">Vol. Brut Reçu</th>
                <th className="p-3.5 text-center">Temp. (°C)</th>
                <th className="p-3.5 text-right">Vol. Corrigé 15°C</th>
                <th className="p-3.5 text-right">Montant (FCFA)</th>
                <th className="p-3.5">Opérateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((en) => (
                <tr key={en.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">{en.date}</div>
                    <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{en.time}</span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-extrabold text-slate-900">{en.blNumber}</div>
                    <div className="text-slate-600 font-medium">{en.supplierName}</div>
                  </td>
                  <td className="p-3.5 font-bold text-amber-700">{en.tankCode}</td>
                  <td className="p-3.5 text-right font-bold text-slate-700">
                    {new Intl.NumberFormat("fr-FR").format(en.rawQuantity)} L
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                      {en.temperature}°C
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="font-extrabold text-emerald-700 text-sm">
                      {new Intl.NumberFormat("fr-FR").format(en.correctedQuantity)} L
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold">
                      {en.correctedQuantity - en.rawQuantity} L dil.
                    </div>
                  </td>
                  <td className="p-3.5 text-right font-extrabold text-slate-900">
                    {new Intl.NumberFormat("fr-FR").format(en.totalAmount)} FCFA
                  </td>
                  <td className="p-3.5 font-medium text-slate-700">{en.operator}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 animate-fadeIn text-xs">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center space-x-2">
              <Thermometer className="w-5 h-5 text-amber-500" />
              <span>Saisir une Réception de Carburant (BL CML)</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Date Livraison</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Heure (obligatoire)</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Fournisseur Carburant</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(Number(e.target.value))}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Cuve de Destination</label>
                  <select
                    value={tankId}
                    onChange={(e) => setTankId(Number(e.target.value))}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold text-amber-800"
                  >
                    {tanks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} ({new Intl.NumberFormat("fr-FR").format(t.currentLevel)} L dispo)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Numéro de BL (Bon Livraison)</label>
                  <input
                    type="text"
                    required
                    value={blNumber}
                    onChange={(e) => setBlNumber(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Prix Unitaire (FCFA/L)</label>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Quantité Brute Reçue (L)</label>
                  <input
                    type="number"
                    required
                    step="10"
                    value={rawQuantity}
                    onChange={(e) => setRawQuantity(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-extrabold text-sm"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Température de Dépote (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="38.0"
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-extrabold text-amber-600 text-sm"
                  />
                </div>
              </div>

              {/* Real-time correction preview */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900">Volume Corrigé à 15°C (ISO standard) :</span>
                  <span className="font-extrabold text-emerald-700 text-base">
                    {new Intl.NumberFormat("fr-FR").format(correctedQ)} L
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-emerald-800">
                  <span>Écart de dilatation thermique : <strong className="font-bold">{diffQ} L</strong></span>
                  <span>Ajouté à la cuve : <strong>{selTank?.code}</strong></span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Notes / Observation</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shadow-lg"
                >
                  Enregistrer et Créditer {correctedQ} L
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
