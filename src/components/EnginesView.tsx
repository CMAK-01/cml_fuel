"use client";

import React, { useState } from "react";
import { Truck, Plus, Filter, Search, Edit3, PowerOff, ShieldCheck, Activity } from "lucide-react";

interface EnginesViewProps {
  engines: any[];
  onAdd: (data: any) => Promise<void>;
  onUpdate: (data: any) => Promise<void>;
  canModify?: boolean;
}

export function EnginesView({ engines, onAdd, onUpdate, canModify = false }: EnginesViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState("ALL");
  const [filterDept, setFilterDept] = useState("ALL");
  const [search, setSearch] = useState("");

  const emptyForm = {
    code: "",
    immatriculation: "",
    type: "Minier Lourd",
    category: "Pelle Hydraulique",
    brand: "Caterpillar",
    model: "",
    department: "Extraction Mine",
    assignment: "Fosse 1 Manganèse",
    normalConsumption: "50",
    tankCapacity: "800",
    currentHoursOrKm: "0",
    commissionDate: new Date().toISOString().split("T")[0],
    status: "Actif"
  };

  const [formData, setFormData] = useState(emptyForm);

  const filtered = engines.filter((e) => {
    const matchesSearch =
      e.code.toLowerCase().includes(search.toLowerCase()) ||
      e.immatriculation.toLowerCase().includes(search.toLowerCase()) ||
      e.brand.toLowerCase().includes(search.toLowerCase()) ||
      e.model.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "ALL" || e.type === filterType;
    const matchesDept = filterDept === "ALL" || e.department === filterDept;
    return matchesSearch && matchesType && matchesDept;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "create") {
      await onAdd(formData);
    } else {
      await onUpdate({ id: editingId, ...formData });
    }
    setShowModal(false);
    setMode("create");
    setEditingId(null);
    setFormData(emptyForm);
  };

  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (engine: any) => {
    if (!canModify) {
      alert("Modification refusée : seuls l'Administrateur et le Directeur QHSE peuvent modifier une information.");
      return;
    }
    setMode("edit");
    setEditingId(engine.id);
    setFormData({
      code: engine.code || "",
      immatriculation: engine.immatriculation || "",
      type: engine.type || "Minier Lourd",
      category: engine.category || "",
      brand: engine.brand || "",
      model: engine.model || "",
      department: engine.department || "Extraction Mine",
      assignment: engine.assignment || "",
      normalConsumption: String(engine.normalConsumption ?? "50"),
      tankCapacity: String(engine.tankCapacity ?? "800"),
      currentHoursOrKm: String(engine.currentHoursOrKm ?? "0"),
      commissionDate: engine.commissionDate || new Date().toISOString().split("T")[0],
      status: engine.status || "Actif"
    });
    setShowModal(true);
  };

  const handleDeactivate = async (engine: any) => {
    if (!canModify) {
      alert("Modification refusée : seuls l'Administrateur et le Directeur QHSE peuvent modifier une information.");
      return;
    }
    const newStatus = engine.status === "Actif" ? "Arrêté" : "Actif";
    await onUpdate({ id: engine.id, status: newStatus });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Actions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Truck className="w-6 h-6 text-amber-500" />
            <span>Gestion du Parc Engins CML (Flotte de +150 Équipements)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Suivi des engins miniers lourds (L/H via horamètre) et véhicules légers LV (L/100km via odomètre).
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter une Fiche Engin</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher code, immat, modèle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs w-full focus:outline-none text-slate-800 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 text-xs">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-600">Type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
            >
              <option value="ALL">Tous les types</option>
              <option value="Minier Lourd">Minier Lourd (L/H)</option>
              <option value="Véhicule Léger (LV)">Véhicule Léger LV (L/100km)</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 text-xs">
            <span className="font-semibold text-slate-600">Département:</span>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none"
            >
              <option value="ALL">Tous les départements</option>
              <option value="Extraction Mine">Extraction Mine</option>
              <option value="Laverie / Traitement">Laverie / Traitement</option>
              <option value="Forage & Dynamitage">Forage & Dynamitage</option>
              <option value="Logistique & Pistes">Logistique & Pistes</option>
              <option value="Direction & Administration">Direction & Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Engine Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((eng) => {
          const isLV = eng.unit === "L/100km";
          return (
            <div
              key={eng.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-base text-slate-900">{eng.code}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isLV ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {isLV ? "LV • L/100km" : "Minier • L/H"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Immat: <strong className="text-slate-700">{eng.immatriculation}</strong>
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      eng.status === "Actif"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : eng.status === "En Maintenance"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-red-100 text-red-800 border border-red-300"
                    }`}
                  >
                    {eng.status}
                  </span>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Marque & Modèle:</span>
                    <span className="font-bold text-slate-800">
                      {eng.brand} {eng.model}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Département:</span>
                    <span className="font-medium text-slate-700">{eng.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Affectation:</span>
                    <span className="font-medium text-slate-700">{eng.assignment}</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-slate-400 font-medium">Conso. Normale</div>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {eng.normalConsumption} {eng.unit}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100">
                    <div className="text-amber-700 font-medium flex items-center space-x-1">
                      <Activity className="w-3 h-3 text-amber-600" />
                      <span>Baseline 30J</span>
                    </div>
                    <div className="text-sm font-extrabold text-amber-900 mt-0.5">
                      {eng.baseline30d || eng.normalConsumption} {eng.unit}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                <span className="text-slate-400">Compteur: <strong className="text-slate-700">{eng.currentHoursOrKm || 0} {isLV ? "km" : "h"}</strong></span>
                <div className="flex items-center gap-2">
                  {canModify && (
                    <>
                      <button
                        onClick={() => openEdit(eng)}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold bg-amber-100 hover:bg-amber-200 text-amber-900"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Modifier</span>
                      </button>
                      <button
                        onClick={() => handleDeactivate(eng)}
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold transition-colors ${
                          eng.status === "Actif"
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                        }`}
                      >
                        <PowerOff className="w-3.5 h-3.5" />
                        <span>{eng.status === "Actif" ? "Désactiver" : "Activer"}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Engine Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 animate-fadeIn">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <Truck className="w-5 h-5 text-amber-500" />
              <span>{mode === "create" ? "Créer une Nouvelle Fiche Engin CML" : "Modifier la Fiche Engin CML"}</span>
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Code Engin (ex: EX-395-05)</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Immatriculation</label>
                  <input
                    type="text"
                    required
                    value={formData.immatriculation}
                    onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Type de Suivi</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Minier Lourd">Minier Lourd (L/H via Horamètre)</option>
                    <option value="Véhicule Léger (LV)">Véhicule Léger LV (L/100km via Odomètre)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Catégorie</label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="ex: Tombereau, Pick-up"
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Marque</label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Modèle</label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Département</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Extraction Mine">Extraction Mine</option>
                    <option value="Laverie / Traitement">Laverie / Traitement</option>
                    <option value="Forage & Dynamitage">Forage & Dynamitage</option>
                    <option value="Logistique & Pistes">Logistique & Pistes</option>
                    <option value="Direction & Administration">Direction & Administration</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Conso Normale ({formData.type === "Véhicule Léger (LV)" ? "L/100km" : "L/H"})</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.normalConsumption}
                    onChange={(e) => setFormData({ ...formData, normalConsumption: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setMode("create");
                    setEditingId(null);
                    setFormData(emptyForm);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md"
                >
                  {mode === "create" ? "Créer l'engin" : "Enregistrer les modifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
