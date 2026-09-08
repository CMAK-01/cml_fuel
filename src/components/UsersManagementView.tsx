"use client";

import React, { useState } from "react";
import { Users, Plus, ShieldCheck, Mail, Building2, Search, UserPlus, XCircle, Edit3 } from "lucide-react";

interface UsersManagementViewProps {
  users: any[];
  currentUser: { name: string; role: string; department: string };
  onAddUser: (data: any) => Promise<any>;
  onUpdateUser: (data: any) => Promise<any>;
}

const ROLES = [
  "Administrateur",
  "Directeur QHSE",
  "DAF",
  "Responsable Achat",
  "Responsable Station",
  "Utilisateur"
];

const DEPARTMENTS = [
  "Direction Générale",
  "QHSE & Conformité",
  "Direction Administrative & Financière",
  "Achats & Approvisionnements",
  "Station Service & Stockage",
  "Exploitation Minière",
  "Traitement (Usine 1)",
  "Traitement (Usine 2)",
  "Maintenance",
  "Logistique",
  "Administration",
  "Sécurité",
  "Ressource Humaine",
  "Direction Technique",
  "CML"
];

export function UsersManagementView({ users, currentUser, onAddUser, onUpdateUser }: UsersManagementViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Utilisateur",
    department: "Exploitation Minière"
  });

  // Création/consultation : Admin + Directeur QHSE + DAF
  // Modification d'informations existantes : uniquement Admin + Directeur QHSE
  const canManage = ["Administrateur", "Directeur QHSE", "DAF"].includes(currentUser.role);
  const canEdit = currentUser.role === "Administrateur" || currentUser.role === "Directeur QHSE";

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      String(u.name || "").toLowerCase().includes(q) ||
      String(u.email || "").toLowerCase().includes(q) ||
      String(u.role || "").toLowerCase().includes(q) ||
      String(u.department || "").toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    if (!canManage) {
      alert("Accès réservé à l'Administrateur, au Directeur QHSE ou au DAF.");
      return;
    }
    setMode("create");
    setEditingId(null);
    setForm({ name: "", email: "", password: "", role: "Utilisateur", department: "Exploitation Minière" });
    setShowModal(true);
  };

  const openEdit = (user: any) => {
    if (!canEdit) {
      alert("Modification refusée : seuls l'Administrateur et le Directeur QHSE peuvent modifier une information.");
      return;
    }
    setMode("edit");
    setEditingId(user.id);
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "Utilisateur",
      department: user.department || "CML"
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "create" && !canManage) {
      alert("Accès refusé : seuls Administrateur, Directeur QHSE et DAF peuvent créer des utilisateurs.");
      return;
    }
    if (mode === "edit" && !canEdit) {
      alert("Modification refusée : seuls l'Administrateur et le Directeur QHSE peuvent modifier une information.");
      return;
    }

    setSubmitting(true);
    let result: any;

    if (mode === "create") {
      result = await onAddUser({
        ...form,
        createdBy: currentUser.name,
        createdByRole: currentUser.role
      });
    } else {
      result = await onUpdateUser({
        id: editingId,
        ...form,
        updatedBy: currentUser.name,
        updatedByRole: currentUser.role
      });
    }

    setSubmitting(false);

    if (result?.error) {
      alert(result.error);
      return;
    }

    setShowModal(false);
    setEditingId(null);
    setForm({ name: "", email: "", password: "", role: "Utilisateur", department: "Exploitation Minière" });
    alert(mode === "create" ? "✅ Utilisateur ajouté avec succès." : "✅ Utilisateur modifié avec succès.");
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Users className="w-6 h-6 text-amber-500" />
            <span>Gestion des Utilisateurs CML</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ajoutez ou modifiez un utilisateur à tout moment. Les droits d’accès sont appliqués selon le rôle choisi.
          </p>
        </div>
        <button
          onClick={openCreate}
          className={`px-5 py-2.5 font-extrabold text-sm rounded-xl shadow-md flex items-center space-x-2 ${
            canManage ? "bg-amber-500 hover:bg-amber-400 text-slate-950" : "bg-slate-200 text-slate-500 cursor-not-allowed"
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un utilisateur</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom, email, rôle, service..."
            className="bg-transparent w-full text-xs focus:outline-none font-medium text-slate-800"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold">
          {filteredUsers.length} utilisateur(s) affiché(s)
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <th className="p-3.5">Utilisateur</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Rôle</th>
                <th className="p-3.5">Service / Département</th>
                <th className="p-3.5">Créé le</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80">
                  <td className="p-3.5">
                    <div className="font-extrabold text-slate-900">{u.name}</div>
                    <div className="text-[10px] text-slate-400">ID #{u.id}</div>
                  </td>
                  <td className="p-3.5 text-slate-700 font-medium">
                    <span className="inline-flex items-center space-x-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{u.email}</span>
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                      u.role === "Administrateur" ? "bg-red-100 text-red-800 border-red-300" :
                      u.role === "Directeur QHSE" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                      u.role === "DAF" ? "bg-purple-100 text-purple-800 border-purple-300" :
                      u.role === "Responsable Achat" ? "bg-indigo-100 text-indigo-800 border-indigo-300" :
                      u.role === "Responsable Station" ? "bg-blue-100 text-blue-800 border-blue-300" :
                      "bg-amber-100 text-amber-800 border-amber-300"
                    }`}>
                      <ShieldCheck className="w-3 h-3" />
                      <span>{u.role}</span>
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-700 font-medium">
                    <span className="inline-flex items-center space-x-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{u.department || "CML"}</span>
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-500">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("fr-FR") : "-"}
                  </td>
                  <td className="p-3.5 text-center">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold inline-flex items-center space-x-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Modifier</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-semibold">Lecture seule</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 animate-fadeIn">
            <div className="p-5 bg-slate-900 text-white rounded-t-3xl flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                {mode === "create" ? <UserPlus className="w-5 h-5 text-amber-400" /> : <Edit3 className="w-5 h-5 text-amber-400" />}
                <div>
                  <h3 className="text-base font-black">
                    {mode === "create" ? "Ajouter un utilisateur CML" : "Modifier un utilisateur CML"}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {mode === "create" ? "Création" : "Modification"} par {currentUser.name} ({currentUser.role})
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-800">Nom complet</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Kouamé Jean"
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800">Email professionnel</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ex: utilisateur@cml.ci"
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-900"
                />
              </div>

              {mode === "create" && (
                <div>
                  <label className="font-bold text-slate-800">Mot de passe initial</label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="12 caractères minimum"
                    className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl font-medium text-slate-900"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800">Rôle</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-slate-50 text-slate-900"
                  >
                    {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800">Service / Département</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-slate-50 text-slate-900"
                  >
                    {DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-semibold">
                Rappel des droits : Utilisateur = uniquement ravitaillement. Responsable Station et Responsable Achat = ravitaillement, parc engins et cuves. Administrateur, Directeur QHSE et DAF = accès complet.
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md disabled:opacity-60"
                >
                  {submitting
                    ? (mode === "create" ? "Création..." : "Enregistrement...")
                    : (mode === "create" ? "Créer l'utilisateur" : "Enregistrer les modifications")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
