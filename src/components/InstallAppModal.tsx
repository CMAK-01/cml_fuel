"use client";

import React, { useState, useEffect } from "react";
import { 
  Monitor, 
  Smartphone, 
  Download, 
  CheckCircle2, 
  X, 
  ShieldCheck, 
  WifiOff, 
  Cpu, 
  Share2, 
  PlusSquare,
  HelpCircle,
  ExternalLink
} from "lucide-react";

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstallAppModal({ isOpen, onClose }: InstallAppModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activePlatform, setActivePlatform] = useState<"WINDOWS" | "ANDROID" | "IOS">("WINDOWS");

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // setState reportés via microtâche pour éviter le cascade render synchrone
    if (window.matchMedia("(display-mode: standalone)").matches) {
      queueMicrotask(() => setIsInstalled(true));
    }

    // Auto detect OS
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/android/i.test(userAgent)) {
      queueMicrotask(() => setActivePlatform("ANDROID"));
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
      queueMicrotask(() => setActivePlatform("IOS"));
    } else {
      queueMicrotask(() => setActivePlatform("WINDOWS"));
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("Votre navigateur est prêt ou l'application est déjà installée. Suivez les instructions rapides ci-dessous pour votre système !");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-2xl shadow-lg">
              CML
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-widest">
                Multi-Plateforme • PWA & Natif
              </span>
              <h3 className="text-lg font-extrabold mt-1">Installer CML Fuel Management System Pro</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick status & 1-click install banner */}
        <div className="p-4 bg-amber-50 border-b border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5 text-amber-900">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>Application Universelle synchronisée</strong> : Fonctionne en mode hors-ligne terrain (<WifiOff className="inline w-3 h-3 text-amber-700" /> Service Worker) sur Windows, Android et iOS.
            </span>
          </div>
          {deferredPrompt ? (
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shadow-md transition-all whitespace-nowrap flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Installer en 1 Clic</span>
            </button>
          ) : isInstalled ? (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center space-x-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Déjà Installé</span>
            </span>
          ) : null}
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-2">
          <button
            onClick={() => setActivePlatform("WINDOWS")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
              activePlatform === "WINDOWS"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Monitor className="w-4 h-4 text-amber-400" />
            <span>Windows (Bureau / PC)</span>
          </button>
          <button
            onClick={() => setActivePlatform("ANDROID")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
              activePlatform === "ANDROID"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Android (Tablette / Mobile)</span>
          </button>
          <button
            onClick={() => setActivePlatform("IOS")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
              activePlatform === "IOS"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Smartphone className="w-4 h-4 text-blue-400" />
            <span>Apple iOS (iPhone / iPad)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs text-slate-700">
          {activePlatform === "WINDOWS" && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-slate-900">
                <Monitor className="w-6 h-6 text-amber-500" />
                <div>
                  <h4 className="text-sm font-extrabold">Installation Windows 10 & 11 (Application Bureau)</h4>
                  <p className="text-slate-500">Transforme l&apos;application web en logiciel de bureau autonome sans barre d&apos;adresse.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-[11px]">1</span>
                    <span>Installation Rapide (Google Chrome / Edge)</span>
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 ml-1">
                    <li>Ouvrez l&apos;application dans Chrome ou Microsoft Edge.</li>
                    <li>Cliquez sur l&apos;icône d&apos;installation <strong className="text-slate-900">(➕ ou écran)</strong> à droite de la barre d&apos;adresse (en haut à droite).</li>
                    <li>Cliquez sur <strong>« Installer CML Fuel Management Pro »</strong>.</li>
                    <li>L&apos;application s&apos;ajoute au menu Démarrer et sur votre bureau Windows !</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 text-slate-300 border border-slate-800 space-y-2">
                  <span className="font-bold text-white flex items-center space-x-1.5">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    <span>Compilation Package Natif (.EXE / Electron)</span>
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    Pour l&apos;équipe informatique CML, la configuration <code className="text-amber-400">electron-main.js</code> est incluse à la racine du projet.
                  </p>
                  <div className="p-2 bg-slate-950 rounded-lg font-mono text-[10px] text-emerald-400">
                    npm install electron --save-dev<br/>
                    npx electron .
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePlatform === "ANDROID" && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-slate-900">
                <Smartphone className="w-6 h-6 text-emerald-600" />
                <div>
                  <h4 className="text-sm font-extrabold">Installation Android (Tablettes Terrain & Smartphones)</h4>
                  <p className="text-slate-500">Idéal pour les superviseurs mine et opérateurs sur les engins.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                  <span className="font-bold text-emerald-950 flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-[11px]">1</span>
                    <span>Installation en 1 Clic (Chrome Android)</span>
                  </span>
                  <ul className="list-disc list-inside space-y-1.5 text-emerald-900 ml-1">
                    <li>Ouvrez Google Chrome sur votre smartphone ou tablette Android.</li>
                    <li>Appuyez sur le menu à trois points <strong className="text-emerald-950">(⋮)</strong> en haut à droite.</li>
                    <li>Sélectionnez <strong className="text-emerald-950">« Ajouter à l&apos;écran d&apos;accueil »</strong> ou <strong className="text-emerald-950">« Installer l&apos;application »</strong>.</li>
                    <li>L&apos;icône CML s&apos;installe instantanément parmi vos applications natives !</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 text-slate-300 border border-slate-800 space-y-2">
                  <span className="font-bold text-white flex items-center space-x-1.5">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span>Génération Fichier APK Natif (Capacitor)</span>
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    Le fichier de configuration <code className="text-emerald-400">capacitor.config.json</code> (<code className="text-slate-400">ci.cml.fuelmanagementpro</code>) est configuré.
                  </p>
                  <div className="p-2 bg-slate-950 rounded-lg font-mono text-[10px] text-amber-400">
                    npx cap add android<br/>
                    npx cap sync android<br/>
                    npx cap open android
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePlatform === "IOS" && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-slate-900">
                <Smartphone className="w-6 h-6 text-blue-600" />
                <div>
                  <h4 className="text-sm font-extrabold">Installation Apple iOS (iPhone & iPad Direction / QHSE)</h4>
                  <p className="text-slate-500">Affichage plein écran natif iOS avec cache hors-ligne Safari.</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
                <span className="font-bold text-blue-950 text-sm flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-xs">i</span>
                  <span>Procédure officielle Safari iOS (3 secondes)</span>
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-sm">
                    <div className="font-bold text-blue-900 mb-1 flex items-center space-x-1.5">
                      <Share2 className="w-4 h-4 text-blue-600" />
                      <span>Étape 1 : Partager</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Ouvrez l&apos;application dans <strong>Safari</strong> puis appuyez sur l&apos;icône <strong>Partager (carré avec flèche vers le haut)</strong> en bas de l&apos;écran.
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-sm">
                    <div className="font-bold text-blue-900 mb-1 flex items-center space-x-1.5">
                      <PlusSquare className="w-4 h-4 text-blue-600" />
                      <span>Étape 2 : Écran d&apos;accueil</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Faites défiler le menu vers le bas et sélectionnez <strong>« Sur l&apos;écran d&apos;accueil » (Add to Home Screen)</strong>.
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-sm">
                    <div className="font-bold text-blue-900 mb-1 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Étape 3 : Ajouter</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Appuyez sur <strong>« Ajouter »</strong> en haut à droite. L&apos;application CML se lance en plein écran comme une app App Store !
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-900 text-slate-300 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                <span>
                  Besoin de compiler le fichier natif <code className="text-blue-400 font-bold">.IPA</code> pour Xcode / App Store CML ?
                </span>
                <span className="font-mono text-[10px] bg-slate-800 px-2.5 py-1 rounded text-amber-400">
                  npx cap add ios &amp;&amp; npx cap sync
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Service Worker PWA actif &amp; prêt pour le terrain minier en Côte d&apos;Ivoire</span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Fermer la fenêtre
          </button>
        </div>
      </div>
    </div>
  );
}
