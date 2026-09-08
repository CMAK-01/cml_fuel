"use client";

import React, { useState } from "react";
import { Users, Building2, Plus, Award, Phone, Mail, MapPin, Calendar, CheckCircle2 } from "lucide-react";

interface DriversSuppliersViewProps {
  drivers: any[];
  suppliers: any[];
  onAddDriver: (data: any) => Promise<void>;
  onAddSupplier: (data: any) => Promise<void>;
}

export function DriversSuppliersView({ drivers, suppliers, onAddDriver, onAddSupplier }: DriversSuppliersViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"drivers" | "suppliers">("drivers");
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  const [driverForm, setDriverForm] = useState({
    firstName: "",
    lastName: "",
    matricule: `CML-CH-${drivers.length + 1}`,
    phone: "0708091011",
    department: "Extraction Mine",
    licenseType: "Permis Engins Lourds (G)",
    licenseExpiry: "2028-12-31"
  });

  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    averagePricePerLiter: "855"
  });

  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddDriver(driverForm);
    setShowDriverModal(false);
    setDriverForm({
      firstName: "",
      lastName: "",
      matricule: `CML-CH-${drivers.length + 2}`,
      phone: "0708091011",
      department: "Extraction Mine",
      licenseType: "Permis Engins Lourds (G)",
      licenseExpiry: "2028-12-31"
    });
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddSupplier(supplierForm);
    setShowSupplierModal(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Subtab Switcher & Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveSubTab("drivers")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeSubTab === "drivers"
                ? "bg-slate-900 text-white shadow-md"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span>Chauffeurs & Opérateurs ({drivers.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab("suppliers")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeSubTab === "suppliers"
                ? "bg-slate-900 text-white shadow-md"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>Fournisseurs Carburant ({suppliers.length})</span>
          </button>
        </div>

        {activeSubTab === "drivers" ? (
          <button
            onClick={() => setShowDriverModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un Chauffeur</span>
          </button>
        ) : (
          <button
            onClick={() => setShowSupplierModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un Fournisseur</span>
          </button>
        )}
      </div>

      {/* Drivers Content */}
      {activeSubTab === "drivers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {drivers.map((drv) => {
            const isEfficient = (drv.efficiencyScore || 98) >= 97;
            return (
              <div
                key={drv.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">
                        {drv.firstName} {drv.lastName}
                      </h3>
                      <p className="text-xs text-amber-600 font-bold mt-0.5">{drv.matricule}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isEfficient ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {drv.efficiencyScore}% Éco
                    </span>
                  </div>

                  <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Département :</span>
                      <span className="font-semibold text-slate-800">{drv.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Type Permis :</span>
                      <span className="font-medium text-slate-700">{drv.licenseType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Exp. Permis :</span>
                      <span className="font-semibold text-slate-800 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{drv.licenseExpiry}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Consommation cumulée :</span>
                  <span className="font-extrabold text-slate-900">
                    {new Intl.NumberFormat("fr-FR").format(drv.totalConsumedLiters || 0)} L
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Suppliers Content */}
      {activeSubTab === "suppliers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {suppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">{sup.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{sup.contactPerson}</p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center space-x-2 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sup.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sup.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{sup.address}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Prix moyen CML: </span>
                  <strong className="text-emerald-700">{sup.averagePricePerLiter} FCFA/L</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Livré : </span>
                  <strong className="text-slate-900">{new Intl.NumberFormat("fr-FR").format(sup.totalDeliveredLiters || 0)} L</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Driver Modal */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-fadeIn text-xs">
            <h3 className="text-base font-bold text-slate-900 mb-3">Ajouter un Chauffeur / Opérateur Engin</h3>
            <form onSubmit={handleDriverSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Nom</label>
                  <input
                    type="text"
                    required
                    value={driverForm.lastName}
                    onChange={(e) => setDriverForm({ ...driverForm, lastName: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Prénoms</label>
                  <input
                    type="text"
                    required
                    value={driverForm.firstName}
                    onChange={(e) => setDriverForm({ ...driverForm, firstName: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Matricule</label>
                  <input
                    type="text"
                    required
                    value={driverForm.matricule}
                    onChange={(e) => setDriverForm({ ...driverForm, matricule: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Téléphone</label>
                  <input
                    type="text"
                    required
                    value={driverForm.phone}
                    onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Département</label>
                  <select
                    value={driverForm.department}
                    onChange={(e) => setDriverForm({ ...driverForm, department: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Extraction Mine">Extraction Mine</option>
                    <option value="Laverie / Traitement">Laverie / Traitement</option>
                    <option value="Forage & Dynamitage">Forage & Dynamitage</option>
                    <option value="Logistique & Pistes">Logistique & Pistes</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Expiration Permis</label>
                  <input
                    type="date"
                    required
                    value={driverForm.licenseExpiry}
                    onChange={(e) => setDriverForm({ ...driverForm, licenseExpiry: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDriverModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-fadeIn text-xs">
            <h3 className="text-base font-bold text-slate-900 mb-3">Ajouter un Fournisseur de Carburant</h3>
            <form onSubmit={handleSupplierSubmit} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700">Nom Entreprise</label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="ex: Oryx Energies Côte d'Ivoire"
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Contact / Responsable</label>
                  <input
                    type="text"
                    required
                    value={supplierForm.contactPerson}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Téléphone</label>
                  <input
                    type="text"
                    required
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700">Email</label>
                  <input
                    type="email"
                    required
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Prix Moyen (FCFA/L)</label>
                  <input
                    type="number"
                    required
                    value={supplierForm.averagePricePerLiter}
                    onChange={(e) => setSupplierForm({ ...supplierForm, averagePricePerLiter: e.target.value })}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Adresse</label>
                <input
                  type="text"
                  required
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
