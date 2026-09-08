"use client";

import React, { useState } from "react";
import { Database, Truck, ArrowRightLeft, AlertCircle, CheckCircle2, History, Plus, XCircle, Edit3 } from "lucide-react";

interface TanksViewProps {
  tanksData: any;
  onTransfer: (data: any) => Promise<any>;
  onCreateTank: (data: any) => Promise<any>;
  onUpdateTank: (data: any) => Promise<any>;
  canModify?: boolean;
}

export function TanksView({ tanksData, onTransfer, onCreateTank, onUpdateTank, canModify = false }: TanksViewProps) {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTank, setEditingTank] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const tanks = tanksData?.tanks || [];
  const transfers = tanksData?.transfers || [];

  const [sourceId, setSourceId] = useState(tanks[0]?.id || 1);
  const [destId, setDestId] = useState(tanks[3]?.id || 4); // default CC01
  const [quantity, setQuantity] = useState("5000");
  const [operator, setOperator] = useState("Bamba Mamadou");
  const [notes, setNotes] = useState("Rechargement camion citerne avant départ tournée Mine");

  // Formulaire de création d'une nouvelle cuve ou citerne
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"Cuve Fixe Station" | "Camion Citerne Mobile">("Cuve Fixe Station");
  const [newCapacity, setNewCapacity] = useState("50000");
  const [newCurrentLevel, setNewCurrentLevel] = useState("0");
  const [newLocation, setNewLocation] = useState("Station Service Usine");
  const [newMinAlert, setNewMinAlert] = useState("");
  const [newOperator, setNewOperator] = useState("Bamba Mamadou");

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(sourceId) === Number(destId)) {
      alert("Veuillez sélectionner deux cuves/citernes différentes.");
      return;
    }
    const res = await onTransfer({
      action: "transfer",
      sourceTankId: sourceId,
      destTankId: destId,
      quantity: Number(quantity),
      operator,
      notes
    });
    if (res?.error) {
      alert(res.error);
      return;
    }
    setShowTransferModal(false);
  };

  const resetCreateForm = () => {
    setNewCode("");
    setNewName("");
    setNewType("Cuve Fixe Station");
    setNewCapacity("50000");
    setNewCurrentLevel("0");
    setNewLocation("Station Service Usine");
    setNewMinAlert("");
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCode.trim()) {
      alert("Veuillez saisir un code / identifiant (ex: Cuve004 ou CC03).");
      return;
    }
    if (!newName.trim()) {
      alert("Veuillez saisir un nom pour la cuve ou la citerne.");
      return;
    }
    const cap = Number(newCapacity);
    if (!cap || cap <= 0) {
      alert("La capacité maximale doit être un nombre positif.");
      return;
    }
    const level = Number(newCurrentLevel) || 0;
    if (level < 0 || level > cap) {
      alert(`Le niveau initial doit être compris entre 0 et ${cap} L.`);
      return;
    }
    if (!newLocation.trim()) {
      alert("Veuillez saisir une localisation.");
      return;
    }

    setSubmitting(true);
    const res = await onCreateTank({
      action: "create",
      code: newCode.trim(),
      name: newName.trim(),
      type: newType,
      capacity: cap,
      currentLevel: level,
      location: newLocation.trim(),
      minAlertLevel: newMinAlert ? Number(newMinAlert) : undefined,
      operator: newOperator
    });
    setSubmitting(false);

    if (res?.error) {
      alert(res.error);
      return;
    }

    setShowCreateModal(false);
    resetCreateForm();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Database className="w-6 h-6 text-amber-500" />
            <span>Parc Stockage CML : Cuves Station Service & Camions Citernes</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Les camions citernes chargent depuis la station et effectuent la distribution dans les zones d&apos;extraction (Mine, Forage, Laverie).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une Cuve / Citerne</span>
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center space-x-2"
          >
            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
            <span>Nouveau Transfert</span>
          </button>
        </div>
      </div>

      {/* Grid of Tanks & Tanker Trucks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tanks.map((tank: any) => {
          const pct = Math.min(100, Math.max(0, Math.round((tank.currentLevel / tank.capacity) * 100)));
          const isStation = tank.type === "Cuve Fixe Station";
          const isLow = pct < 25;

          return (
            <div
              key={tank.id}
              className={`bg-white rounded-2xl p-5 border shadow-sm transition-all flex flex-col justify-between ${
                isLow ? "border-red-300 bg-red-50/10" : "border-slate-200 hover:shadow-md"
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isStation ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {isStation ? <Database className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">{tank.code}</h3>
                      <p className="text-xs text-slate-500 font-medium">{tank.name}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isStation ? "bg-amber-100 text-amber-900" : "bg-blue-100 text-blue-900"
                    }`}
                  >
                    {isStation ? "Fixe Station" : "Citerne Mobile"}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-600">Niveau Actuel :</span>
                    <span className="text-slate-900 font-extrabold">
                      {new Intl.NumberFormat("fr-FR").format(tank.currentLevel)} L / {new Intl.NumberFormat("fr-FR").format(tank.capacity)} L ({pct}%)
                    </span>
                  </div>
                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200/60 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        pct > 50
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                          : pct > 25
                          ? "bg-gradient-to-r from-amber-500 to-amber-600"
                          : "bg-gradient-to-r from-red-500 to-red-600 animate-pulse"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-1 text-slate-500">
                  <div className="flex justify-between">
                    <span>Localisation :</span>
                    <span className="font-semibold text-slate-700">{tank.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Seuil d&apos;alerte min :</span>
                    <span className="font-medium text-slate-600">{new Intl.NumberFormat("fr-FR").format(tank.minAlertLevel)} L</span>
                  </div>
                </div>
              </div>

              {isLow && (
                <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded-xl text-[11px] font-bold text-red-800 flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Alerte : Niveau bas ({pct}%). Prévoir réapprovisionnement.</span>
                </div>
              )}

              {canModify && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTank(tank);
                      setShowEditModal(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center space-x-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {tanks.length === 0 && (
          <div className="col-span-full p-8 text-center text-slate-400 font-medium bg-white rounded-2xl border border-slate-200">
            Aucune cuve ou citerne enregistrée. Cliquez sur &laquo; Ajouter une Cuve / Citerne &raquo; pour commencer.
          </div>
        )}
      </div>

      {/* Transfer History Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
          <History className="w-5 h-5 text-amber-500" />
          <span>Historique des Transferts de Carburant (Cuves vers Camions Citernes)</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                <th className="py-2.5">Date</th>
                <th className="py-2.5">Origine (Source)</th>
                <th className="py-2.5">Destination</th>
                <th className="py-2.5 text-right">Volume Transféré (L)</th>
                <th className="py-2.5">Opérateur</th>
                <th className="py-2.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 font-medium">
                    Aucun transfert enregistré dans la session actuelle.
                  </td>
                </tr>
              )}
              {transfers.map((tr: any) => (
                <tr key={tr.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 font-bold text-slate-700">
                    {tr.date ? new Date(tr.date).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="py-2.5 font-extrabold text-amber-700">{tr.sourceTankCode}</td>
                  <td className="py-2.5 font-extrabold text-blue-700">{tr.destTankCode}</td>
                  <td className="py-2.5 text-right font-extrabold text-slate-900">
                    {new Intl.NumberFormat("fr-FR").format(tr.quantity)} L
                  </td>
                  <td className="py-2.5 font-medium text-slate-700">{tr.operator}</td>
                  <td className="py-2.5 text-slate-500">{tr.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Tank/Citerne Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 animate-fadeIn">
            <div className="p-5 bg-slate-900 text-white rounded-t-3xl flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Plus className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-black">Ajouter une Cuve ou un Camion Citerne</h3>
                  <p className="text-[11px] text-slate-300">Créer un nouvel équipement de stockage carburant CML</p>
                </div>
              </div>
              <button onClick={() => { setShowCreateModal(false); resetCreateForm(); }} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Type d&apos;équipement</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewType("Cuve Fixe Station");
                      if (!newLocation || newLocation === "Mobile – Distribution zones") setNewLocation("Station Service Usine");
                    }}
                    className={`p-2.5 rounded-xl border-2 font-bold flex items-center justify-center space-x-2 transition-all ${
                      newType === "Cuve Fixe Station"
                        ? "bg-amber-50 border-amber-400 text-amber-900"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}
                  >
                    <Database className="w-4 h-4" />
                    <span>Cuve Fixe Station</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewType("Camion Citerne Mobile");
                      if (!newLocation || newLocation === "Station Service Usine") setNewLocation("Mobile – Distribution zones");
                    }}
                    className={`p-2.5 rounded-xl border-2 font-bold flex items-center justify-center space-x-2 transition-all ${
                      newType === "Camion Citerne Mobile"
                        ? "bg-blue-50 border-blue-400 text-blue-900"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>Camion Citerne Mobile</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">
                    Code / Identifiant {newType === "Cuve Fixe Station" ? "(ex: Cuve004)" : "(ex: CC03)"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder={newType === "Cuve Fixe Station" ? "Cuve004" : "CC03"}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-extrabold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Nom</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={newType === "Cuve Fixe Station" ? "Cuve004 – Station service" : "CC03 – Camion Citerne 18 000 L"}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Capacité Maximale (L)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    step="100"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-extrabold text-sm"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Niveau Initial (L)</label>
                  <input
                    type="number"
                    min={0}
                    step="100"
                    value={newCurrentLevel}
                    onChange={(e) => setNewCurrentLevel(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Localisation</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder={newType === "Cuve Fixe Station" ? "Station Service Usine" : "Mobile – Distribution zones"}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Seuil d&apos;alerte min (L)</label>
                  <input
                    type="number"
                    min={0}
                    step="100"
                    value={newMinAlert}
                    onChange={(e) => setNewMinAlert(e.target.value)}
                    placeholder="Auto (20% de la capacité)"
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Opérateur / Responsable</label>
                  <input
                    type="text"
                    required
                    value={newOperator}
                    onChange={(e) => setNewOperator(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md disabled:opacity-60"
                >
                  {submitting ? "Création..." : "Créer l'équipement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tank/Citerne Modal */}
      {showEditModal && editingTank && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 animate-fadeIn">
            <div className="p-5 bg-slate-900 text-white rounded-t-3xl flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-black">Modifier {editingTank.code}</h3>
                  <p className="text-[11px] text-slate-300">Mettre à jour les informations de la cuve ou du camion citerne</p>
                </div>
              </div>
              <button onClick={() => { setShowEditModal(false); setEditingTank(null); }} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);
                const res = await onUpdateTank({
                  id: editingTank.id,
                  code: editingTank.code,
                  name: editingTank.name,
                  type: editingTank.type,
                  capacity: Number(editingTank.capacity),
                  currentLevel: Number(editingTank.currentLevel),
                  location: editingTank.location,
                  minAlertLevel: Number(editingTank.minAlertLevel),
                  operator: newOperator
                });
                setSubmitting(false);
                if (res?.error) {
                  alert(res.error);
                  return;
                }
                setShowEditModal(false);
                setEditingTank(null);
              }}
              className="p-6 space-y-3 text-xs"
            >
              <div>
                <label className="font-bold text-slate-700">Type d&apos;équipement</label>
                <select
                  value={editingTank.type}
                  onChange={(e) => setEditingTank({ ...editingTank, type: e.target.value })}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold"
                >
                  <option value="Cuve Fixe Station">Cuve Fixe Station</option>
                  <option value="Camion Citerne Mobile">Camion Citerne Mobile</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Code / Identifiant</label>
                  <input
                    type="text"
                    required
                    value={editingTank.code}
                    onChange={(e) => setEditingTank({ ...editingTank, code: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-extrabold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Nom</label>
                  <input
                    type="text"
                    required
                    value={editingTank.name}
                    onChange={(e) => setEditingTank({ ...editingTank, name: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Capacité Maximale (L)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingTank.capacity}
                    onChange={(e) => setEditingTank({ ...editingTank, capacity: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-extrabold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Niveau Actuel (L)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingTank.currentLevel}
                    onChange={(e) => setEditingTank({ ...editingTank, currentLevel: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Localisation</label>
                <input
                  type="text"
                  required
                  value={editingTank.location}
                  onChange={(e) => setEditingTank({ ...editingTank, location: e.target.value })}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Seuil d&apos;alerte min (L)</label>
                <input
                  type="number"
                  min={0}
                  value={editingTank.minAlertLevel}
                  onChange={(e) => setEditingTank({ ...editingTank, minAlertLevel: e.target.value })}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingTank(null); }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md disabled:opacity-60"
                >
                  {submitting ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-fadeIn text-xs">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center space-x-2">
              <ArrowRightLeft className="w-5 h-5 text-amber-500" />
              <span>Transférer du Carburant</span>
            </h3>

            <form onSubmit={handleTransferSubmit} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700">Cuve ou Citerne Source</label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(Number(e.target.value))}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold text-amber-800"
                >
                  {tanks.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.code} ({new Intl.NumberFormat("fr-FR").format(t.currentLevel)} L dispo)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Cuve ou Citerne Destination</label>
                <select
                  value={destId}
                  onChange={(e) => setDestId(Number(e.target.value))}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold text-blue-800"
                >
                  {tanks.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.code} ({t.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Quantité à Transférer (L)</label>
                <input
                  type="number"
                  required
                  step="100"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-extrabold text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Opérateur Magasinier</label>
                <input
                  type="text"
                  required
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Notes & Justification</label>
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
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md"
                >
                  Effectuer le Transfert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
