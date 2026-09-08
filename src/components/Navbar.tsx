"use client";

import React from "react";
import { 
  ShieldCheck, 
  RefreshCw, 
  UserCheck, 
  Building2, 
  Fuel,
  Bell,
  Download,
  Monitor,
  Smartphone
} from "lucide-react";

export interface CurrentUser {
  name: string;
  role: string;
  department: string;
}

interface NavbarProps {
  currentUser: CurrentUser;
  onRoleChange: (role: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onResetData: () => void;
  isResetting: boolean;
  alertCount: number;
  onOpenInstallModal: () => void;
}

const ROLES = [
  { role: "Administrateur", name: "Kouassi Jean-Baptiste", dept: "Direction Générale", color: "bg-red-600 text-white" },
  { role: "Directeur QHSE", name: "Traoré Aminata", dept: "QHSE & Conformité", color: "bg-emerald-700 text-white" },
  { role: "DAF", name: "N'Dri Sylvie", dept: "Direction Administrative & Financière", color: "bg-purple-600 text-white" },
  { role: "Responsable Achat", name: "Silué Bernard", dept: "Achats & Approvisionnements", color: "bg-indigo-600 text-white" },
  { role: "Responsable Station", name: "Koné Seydou", dept: "Station Service Carburant", color: "bg-amber-600 text-white" },
  { role: "Utilisateur", name: "Opérateur Terrain", dept: "Exploitation Mine", color: "bg-slate-600 text-white" }
];

export function Navbar({
  currentUser,
  onRoleChange,
  activeTab,
  setActiveTab,
  onResetData,
  isResetting,
  alertCount,
  onOpenInstallModal
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 font-bold text-slate-950 text-xl">
              CML
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">Fuel Management System</span>
                <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">PRO</span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Compagnie Minière du Littoral – Manganèse Côte d&apos;Ivoire</p>
            </div>
          </div>

          {/* Controls & Role Selector */}
          <div className="flex items-center space-x-3">
            {/* Multi-platform Install Button */}
            <button
              onClick={onOpenInstallModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all"
              title="Installer l'application sur Windows, Android ou iOS"
            >
              <div className="flex items-center space-x-0.5">
                <Monitor className="w-3.5 h-3.5" />
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <span className="hidden sm:inline">Installer (Win • Android • iOS)</span>
              <span className="sm:hidden">Installer App</span>
            </button>

            {/* Alert bell */}
            <button
              onClick={() => setActiveTab("dashboard")}
              className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300"
              title="Alertes actives"
            >
              <Bell className="w-5 h-5" />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                  {alertCount}
                </span>
              )}
            </button>

            {/* Reset Excel Button */}
            <button
              onClick={onResetData}
              disabled={isResetting}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
              <span>{isResetting ? "Synchronisation..." : "Excel CML"}</span>
            </button>

            {/* Role Switcher */}
            <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 font-medium">Rôle (RBAC) :</span>
                <span className="text-xs font-bold text-white">{currentUser.role}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
