"use client";

import React, { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { NavigationTabs } from "@/components/NavigationTabs";
import { LoginView } from "@/components/LoginView";
import { InstallBanner } from "@/components/InstallBanner";
import { canAccess, canModify, getDefaultTab, ROLE_PROFILES } from "@/lib/permissions";

// ----------------------------------------------------------------------------
// Lazy loading des vues d'onglets : chaque module n'est téléchargé qu'à la 1re
// ouverture de son onglet. Le bundle initial reste léger (Navbar, Tabs, Login).
// ssr:false car ce sont des vues client interactives pilotées par l'état local.
// ----------------------------------------------------------------------------
const ViewLoading = () => (
  <div className="grid place-items-center py-24 text-slate-500">
    <div className="flex flex-col items-center space-y-3">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-semibold">Chargement du module…</span>
    </div>
  </div>
);

const DashboardView = dynamic(() => import("@/components/DashboardView").then(m => ({ default: m.DashboardView })), { ssr: false, loading: ViewLoading });
const EnginesView = dynamic(() => import("@/components/EnginesView").then(m => ({ default: m.EnginesView })), { ssr: false, loading: ViewLoading });
const RefuelingView = dynamic(() => import("@/components/RefuelingView").then(m => ({ default: m.RefuelingView })), { ssr: false, loading: ViewLoading });
const TanksView = dynamic(() => import("@/components/TanksView").then(m => ({ default: m.TanksView })), { ssr: false, loading: ViewLoading });
const StockEntriesView = dynamic(() => import("@/components/StockEntriesView").then(m => ({ default: m.StockEntriesView })), { ssr: false, loading: ViewLoading });
const SpcView = dynamic(() => import("@/components/SpcView").then(m => ({ default: m.SpcView })), { ssr: false, loading: ViewLoading });
const SpcControlView = dynamic(() => import("@/components/SpcControlView").then(m => ({ default: m.SpcControlView })), { ssr: false, loading: ViewLoading });
const DriversSuppliersView = dynamic(() => import("@/components/DriversSuppliersView").then(m => ({ default: m.DriversSuppliersView })), { ssr: false, loading: ViewLoading });
const AiPredictiveView = dynamic(() => import("@/components/AiPredictiveView").then(m => ({ default: m.AiPredictiveView })), { ssr: false, loading: ViewLoading });
const ReportsView = dynamic(() => import("@/components/ReportsView").then(m => ({ default: m.ReportsView })), { ssr: false, loading: ViewLoading });
const AuditView = dynamic(() => import("@/components/AuditView").then(m => ({ default: m.AuditView })), { ssr: false, loading: ViewLoading });
const MobileFieldView = dynamic(() => import("@/components/MobileFieldView").then(m => ({ default: m.MobileFieldView })), { ssr: false, loading: ViewLoading });
const AdminArchiveView = dynamic(() => import("@/components/AdminArchiveView").then(m => ({ default: m.AdminArchiveView })), { ssr: false, loading: ViewLoading });
const UsersManagementView = dynamic(() => import("@/components/UsersManagementView").then(m => ({ default: m.UsersManagementView })), { ssr: false, loading: ViewLoading });
const InstallAppModal = dynamic(() => import("@/components/InstallAppModal").then(m => ({ default: m.InstallAppModal })), { ssr: false, loading: ViewLoading });

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Data states
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [engines, setEngines] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [tanksData, setTanksData] = useState<any>({ tanks: [], transfers: [] });
  const [stockEntries, setStockEntries] = useState<any[]>([]);
  const [refuelings, setRefuelings] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [aiData, setAiData] = useState<any>(null);
  const [appUsers, setAppUsers] = useState<any[]>([]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [
        resDash,
        resEng,
        resDrv,
        resSup,
        resTnk,
        resStk,
        resRef,
        resAlt,
        resAud,
        resAi,
        resUsers
      ] = await Promise.all([
        fetch("/api/dashboard", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/engines", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/drivers", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/suppliers", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/tanks", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/stock-entries", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/refuelings", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/alerts", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/audit", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/ai-predictions", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/users", { cache: "no-store" }).then((r) => r.json())
      ]);

      if (resDash && !resDash.error) setDashboardData(resDash);
      if (Array.isArray(resEng)) setEngines(resEng);
      if (Array.isArray(resDrv)) setDrivers(resDrv);
      if (Array.isArray(resSup)) setSuppliers(resSup);
      if (resTnk && !resTnk.error) setTanksData(resTnk);
      if (Array.isArray(resStk)) setStockEntries(resStk);
      if (Array.isArray(resRef)) setRefuelings(resRef);
      if (Array.isArray(resAlt)) setAlerts(resAlt);
      if (Array.isArray(resAud)) setAuditLogs(resAud);
      if (resAi && !resAi.error) setAiData(resAi);
      if (Array.isArray(resUsers)) setAppUsers(resUsers);
    } catch (err) {
      console.error("Error loading CML data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (response.ok) {
          const { user } = await response.json();
          setCurrentUser(user);
          await fetchAllData();
        }
      } finally {
        setSessionChecked(true);
      }
    };
    void loadSession();

    // Register PWA Service Worker for offline terrain mode on Windows/Android/iOS
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("PWA Service Worker enregistré:", reg.scope))
        .catch((err) => console.error("Erreur SW:", err));
    }

    // Auto-show install guide on first visit (aide pour Windows/Android/iOS)
    const hasSeenInstall = localStorage.getItem("cml_install_guide_seen");
    if (!hasSeenInstall) {
      const timer = setTimeout(() => {
        setIsInstallModalOpen(true);
        localStorage.setItem("cml_install_guide_seen", "1");
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleRoleChange = (role: string) => {
    const profile = ROLE_PROFILES[role] || { name: "Utilisateur CML", dept: "CML" };
    setCurrentUser({
      role,
      name: profile.name,
      department: profile.dept
    });
    // Si l'onglet actuel n'est plus autorisé pour ce rôle → rediriger vers son onglet par défaut
    if (!canAccess(role, activeTab)) {
      setActiveTab(getDefaultTab(role));
    }
  };

  const handleResetData = async () => {
    if (!confirm("Voulez-vous réimporter toutes les données du fichier Excel 'Gestion carburant CML.xlsm' et réinitialiser les compteurs ?")) {
      return;
    }
    setIsResetting(true);
    try {
      await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceReset: true })
      });
      await fetchAllData();
      alert("Importation Excel réussie : Flotte d'engins, cuves, historiques et paramètres sont synchronisés.");
    } catch (err) {
      alert("Erreur lors de la réinitialisation Excel.");
    } finally {
      setIsResetting(false);
    }
  };

  // Action Handlers
  const handleAddEngine = async (data: any) => {
    await fetch("/api/engines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data })
    });
    await fetchAllData();
  };

  const handleUpdateEngine = async (data: any) => {
    if (!canModify(currentUser.role)) {
      alert("Modification refusée : seuls l'Administrateur et le Directeur QHSE peuvent modifier une information.");
      return { error: "Accès refusé" };
    }
    const res = await fetch("/api/engines", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data })
    });
    const json = await res.json();
    if (json.error) {
      alert(json.error);
      return json;
    }
    await fetchAllData();
    return json;
  };

  const handleAddRefueling = async (data: any): Promise<boolean> => {
    try {
      const res = await fetch("/api/refuelings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, operator: currentUser.name })
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        alert(`Erreur serveur (HTTP ${res.status}). Rafraîchissez la page (Ctrl+F5) et réessayez.`);
        return false;
      }
      const json = await res.json();
      if (json.error) {
        alert("❌ Ravitaillement refusé : " + json.error);
        return false;
      }
      await fetchAllData();
      return true;
    } catch (err: any) {
      alert("Erreur réseau : " + err.message);
      return false;
    }
  };

  const handleUpdateRefueling = async (data: any): Promise<boolean> => {
    if (!canModify(currentUser.role)) {
      alert("Modification refusée : seuls l'Administrateur et le Directeur QHSE peuvent modifier une information.");
      return false;
    }
    try {
      const res = await fetch("/api/refuelings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data })
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        alert(`Erreur serveur (HTTP ${res.status}). Rafraîchissez la page (Ctrl+F5).`);
        return false;
      }
      const json = await res.json();
      if (json.error) {
        alert(json.error);
        return false;
      }
      await fetchAllData();
      return true;
    } catch (err: any) {
      alert("Erreur réseau : " + err.message);
      return false;
    }
  };

  const handleTransferTank = async (data: any) => {
    const res = await fetch("/api/tanks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, operator: currentUser.name })
    });
    const json = await res.json();
    if (!json.error) {
      await fetchAllData();
    }
    return json;
  };

  const handleCreateTank = async (data: any) => {
    const res = await fetch("/api/tanks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, operator: data.operator || currentUser.name })
    });
    const json = await res.json();
    if (!json.error) {
      await fetchAllData();
    }
    return json;
  };

  const handleUpdateTank = async (data: any) => {
    if (!canModify(currentUser.role)) {
      alert("Modification refusée : seuls l'Administrateur et le Directeur QHSE peuvent modifier une information.");
      return { error: "Accès refusé" };
    }
    const res = await fetch("/api/tanks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data })
    });
    const json = await res.json();
    if (!json.error) {
      await fetchAllData();
    }
    return json;
  };

  const handleAddStockEntry = async (data: any) => {
    const res = await fetch("/api/stock-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, operator: currentUser.name })
    });
    const json = await res.json();
    if (json.error) {
      alert(json.error);
    } else {
      await fetchAllData();
    }
  };

  const handleAddDriver = async (data: any) => {
    await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data })
    });
    await fetchAllData();
  };

  const handleAddSupplier = async (data: any) => {
    await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    await fetchAllData();
  };

  const handleAddUser = async (data: any) => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok || json.error) return { error: json.error || "Erreur création utilisateur" };
    await fetchAllData();
    return json;
  };

  const handleUpdateUser = async (data: any) => {
    if (!canModify(currentUser.role)) {
      return { error: "Modification refusée : seuls l'Administrateur et le Directeur QHSE peuvent modifier une information." };
    }
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data })
    });
    const json = await res.json();
    if (!res.ok || json.error) return { error: json.error || "Erreur modification utilisateur" };
    await fetchAllData();
    return json;
  };

  const handleSelectEngineForSpc = async (engineCode: string) => {
    const res = await fetch(`/api/dashboard?engineCode=${encodeURIComponent(engineCode)}`);
    const json = await res.json();
    if (json.spcData) {
      setDashboardData((prev: any) => ({ ...prev, spcData: json.spcData }));
    }
  };

  const openAlertsCount = alerts.filter((a) => a.status === "Ouverte").length;

  if (!sessionChecked) {
    return <main className="min-h-screen grid place-items-center bg-slate-950 text-white">Vérification de la session…</main>;
  }

  if (!currentUser) {
    return <LoginView onAuthenticated={(user) => {
      setCurrentUser(user);
      void fetchAllData();
    }} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar
        currentUser={currentUser}
        onRoleChange={handleRoleChange}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetData={handleResetData}
        isResetting={isResetting}
        alertCount={openAlertsCount}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />

      <NavigationTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role={currentUser.role}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Garde RBAC : blocage si l'onglet n'est pas autorisé pour le rôle actif */}
        {!canAccess(currentUser.role, activeTab) && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-8 text-center animate-fadeIn">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="text-lg font-extrabold text-red-800">Accès non autorisé</h2>
            <p className="text-xs text-red-700 mt-2 max-w-md mx-auto">
              Votre rôle <strong>{currentUser.role}</strong> ne permet pas d&apos;accéder à ce module.
              Contactez l&apos;Administrateur CML pour une élévation de droits.
            </p>
            <button
              onClick={() => setActiveTab(getDefaultTab(currentUser.role))}
              className="mt-4 px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl"
            >
              Retour à mon espace autorisé
            </button>
          </div>
        )}

        {canAccess(currentUser.role, activeTab) && (
          <Suspense fallback={<ViewLoading />}>
            {activeTab === "dashboard" && (
              <DashboardView
                data={dashboardData}
                loading={loading}
                onNavigate={setActiveTab}
                onInstall={() => setIsInstallModalOpen(true)}
              />
            )}

            {activeTab === "engines" && (
              <EnginesView
                engines={engines}
                onAdd={handleAddEngine}
                onUpdate={handleUpdateEngine}
                canModify={canModify(currentUser.role)}
              />
            )}

            {activeTab === "refueling" && (
              <RefuelingView
                refuelings={refuelings}
                engines={engines}
                tanks={tanksData?.tanks || []}
                drivers={drivers}
                onAdd={handleAddRefueling}
                onUpdate={handleUpdateRefueling}
                canModify={canModify(currentUser.role)}
              />
            )}

            {activeTab === "tanks" && (
              <TanksView
                tanksData={tanksData}
                onTransfer={handleTransferTank}
                onCreateTank={handleCreateTank}
                onUpdateTank={handleUpdateTank}
                canModify={canModify(currentUser.role)}
              />
            )}

            {activeTab === "stock" && (
              <StockEntriesView
                entries={stockEntries}
                tanks={tanksData?.tanks || []}
                suppliers={suppliers}
                onAddEntry={handleAddStockEntry}
              />
            )}

            {activeTab === "spc" && (
              <SpcView
                engines={engines}
                spcData={dashboardData?.spcData}
                onSelectEngine={handleSelectEngineForSpc}
              />
            )}

            {activeTab === "spc-control" && (
              <SpcControlView
                refuelings={refuelings}
                engines={engines}
                drivers={drivers}
              />
            )}

            {activeTab === "drivers" && (
              <DriversSuppliersView
                drivers={drivers}
                suppliers={suppliers}
                onAddDriver={handleAddDriver}
                onAddSupplier={handleAddSupplier}
              />
            )}

            {activeTab === "users" && (
              <UsersManagementView
                users={appUsers}
                currentUser={currentUser}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
              />
            )}

            {activeTab === "ai" && (
              <AiPredictiveView
                aiData={aiData}
                loading={loading}
              />
            )}

            {activeTab === "reports" && (
              <ReportsView
                refuelings={refuelings}
                tanks={tanksData?.tanks || []}
                engines={engines}
              />
            )}

            {activeTab === "audit" && (
              <AuditView logs={auditLogs} />
            )}

            {activeTab === "admin" && (
              <AdminArchiveView
                currentUser={currentUser}
                onArchiveComplete={fetchAllData}
              />
            )}

            {activeTab === "mobile" && (
              <MobileFieldView
                engines={engines}
                tanks={tanksData?.tanks || []}
                drivers={drivers}
                onAddRefueling={handleAddRefueling}
                onBackToDesktop={() => setActiveTab(getDefaultTab(currentUser.role))}
              />
            )}
          </Suspense>
        )}
      </main>

      <InstallBanner onOpenInstall={() => setIsInstallModalOpen(true)} />

      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-semibold text-slate-300">
            CML Fuel Management System Pro • Compagnie Minière du Littoral (Manganèse Côte d&apos;Ivoire)
          </p>
          <p className="mt-1">
            Remplacement du fichier Excel &apos;Gestion carburant CML.xlsm&apos; • Compatible Windows, Android &amp; iOS PWA • &copy; 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
