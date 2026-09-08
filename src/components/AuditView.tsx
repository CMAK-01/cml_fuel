"use client";

import React, { useState } from "react";
import { ShieldAlert, Search, Lock, UserCheck, Clock } from "lucide-react";

interface AuditViewProps {
  logs: any[];
}

export function AuditView({ logs }: AuditViewProps) {
  const [search, setSearch] = useState("");

  const filtered = logs.filter(
    (l) =>
      l.user?.toLowerCase().includes(search.toLowerCase()) ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.entityId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            <span>Journal d&apos;Audit & Sécurité Inaltérable CML</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Toutes les saisies, modifications d&apos;enregistrements (&gt;24h) et transferts sont horodatés et cryptés en base de données sans possibilité de suppression.
          </p>
        </div>
        <div className="px-3.5 py-1.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center space-x-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>Lecture Seule (Inaltérable)</span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher utilisateur, action, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs w-full focus:outline-none text-slate-800 font-medium"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold">
          {filtered.length} événements enregistrés
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <th className="p-3.5">Horodatage</th>
                <th className="p-3.5">Utilisateur & Rôle</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Entité & ID</th>
                <th className="p-3.5">Ancienne Valeur</th>
                <th className="p-3.5">Nouvelle Valeur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((lg) => (
                <tr key={lg.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 font-bold text-slate-700">
                    {lg.timestamp ? new Date(lg.timestamp).toLocaleString("fr-FR") : "—"}
                  </td>
                  <td className="p-3.5">
                    <div className="font-extrabold text-slate-900">{lg.user}</div>
                    <div className="text-[10px] text-slate-500">{lg.role}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold text-[11px]">
                      {lg.action}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-slate-800">{lg.entity}</div>
                    <div className="text-[10px] text-amber-600 font-mono">{lg.entityId}</div>
                  </td>
                  <td className="p-3.5 text-slate-500 font-mono text-[11px] max-w-xs truncate">
                    {lg.oldValue || "-"}
                  </td>
                  <td className="p-3.5 text-emerald-700 font-mono font-bold text-[11px] max-w-xs truncate">
                    {lg.newValue || "-"}
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
