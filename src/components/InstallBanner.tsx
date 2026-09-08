"use client";

import React, { useEffect, useState } from "react";
import { Monitor, Smartphone, Download, X, CheckCircle2 } from "lucide-react";

interface InstallBannerProps {
  onOpenInstall: () => void;
}

export function InstallBanner({ onOpenInstall }: InstallBannerProps) {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    if (standalone) {
      queueMicrotask(() => setIsStandalone(true));
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Fallback: show banner after 2s even if no prompt (Safari iOS / Firefox)
    const timer = setTimeout(() => {
      if (!standalone) setVisible(true);
    }, 2200);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  if (!visible || isStandalone) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
      }
    } else {
      onOpenInstall();
    }
  };

  return (
    <div className="fixed bottom-4 left-0 right-0 z-[60] px-4 animate-fadeIn">
      <div className="max-w-5xl mx-auto bg-slate-950 text-white rounded-2xl shadow-2xl border border-amber-500/30 p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3 text-left">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg shadow">
            CML
          </div>
          <div>
            <div className="font-extrabold text-sm flex items-center space-x-2">
              <span>Installer l’application CML Fuel Pro</span>
              <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 rounded-full font-bold">Windows • Android • iOS</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              1 clic = app native sur bureau & téléphone, fonctionne <strong>hors ligne</strong> dans les fosses minières.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Installer maintenant</span>
          </button>
          <button
            onClick={onOpenInstall}
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700"
          >
            Voir guide
          </button>
          <button
            onClick={() => setVisible(false)}
            className="p-2 text-slate-400 hover:text-white"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
