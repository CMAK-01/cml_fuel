"use client";

import React from "react";
import { 
  LayoutDashboard, 
  Truck, 
  Fuel, 
  Database, 
  TrendingUp, 
  Activity, 
  Users, 
  Cpu, 
  FileSpreadsheet, 
  ShieldAlert, 
  Smartphone,
  Lock,
  BarChart3
} from "lucide-react";
import { canAccess } from "@/lib/permissions";

interface NavigationTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: string;
}

export function NavigationTabs({ activeTab, setActiveTab, role }: NavigationTabsProps) {
  const allTabs = [
    { id: "dashboard", label: "Tableau de Bord Exécutif", icon: LayoutDashboard, badge: "Power BI" },
    { id: "refueling", label: "Saisie Ravitaillement", icon: Fuel, badge: "Anti-fraude" },
    { id: "engines", label: "Parc Engins CML (150+)", icon: Truck },
    { id: "tanks", label: "Cuves & Citernes Mobiles", icon: Database },
    { id: "stock", label: "Réception Stock (ISO 15°C)", icon: TrendingUp, badge: "+Therm" },
    { id: "spc", label: "Analyse SPC Carburant", icon: Activity, badge: "Shewhart" },
    { id: "spc-control", label: "Contrôle Statistique", icon: BarChart3, badge: "SPC Pro" },
    { id: "drivers", label: "Chauffeurs & Fournisseurs", icon: Users },
    { id: "users", label: "Gestion Utilisateurs", icon: Users, badge: "RBAC" },
    { id: "ai", label: "IA & Prédictif", icon: Cpu, badge: "IA 2026" },
    { id: "reports", label: "Rapports & Exports", icon: FileSpreadsheet, badge: "PDF/Excel" },
    { id: "audit", label: "Audit & Tracabilité", icon: ShieldAlert },
    { id: "admin", label: "Administration & Archivage", icon: Lock, badge: "Admin" },
    { id: "mobile", label: "Terrain Mobile", icon: Smartphone, badge: "Terrain" },
  ];

  // Filtrage RBAC strict selon le rôle actif
  const tabs = allTabs.filter(t => canAccess(role, t.id));

  return (
    <div className="bg-slate-900 border-b border-slate-800 overflow-x-auto scrollbar-thin">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-slate-950" : "text-amber-400"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                      isActive
                        ? "bg-slate-950/20 text-slate-900"
                        : "bg-slate-800 text-amber-300 border border-slate-700"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
