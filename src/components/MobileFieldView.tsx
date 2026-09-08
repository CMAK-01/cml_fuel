"use client";

import React, { useState } from "react";
import { Smartphone, Camera, PenTool, Fuel, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";

interface MobileFieldViewProps {
  engines: any[];
  tanks: any[];
  drivers: any[];
  onAddRefueling: (data: any) => Promise<boolean | void>;
  onBackToDesktop: () => void;
}

export function MobileFieldView({ engines, tanks, drivers, onAddRefueling, onBackToDesktop }: MobileFieldViewProps) {
  const [step, setStep] = useState<"SELECT" | "FORM" | "SIGN" | "SUCCESS">("SELECT");
  const [selectedEngine, setSelectedEngine] = useState<any>(engines[0] || null);
  const [meter, setMeter] = useState("");
  const [qty, setQty] = useState("");
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [signatureDone, setSignatureDone] = useState(false);
  const [observation, setObservation] = useState("");

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEngine || !qty) return;
    const result = await onAddRefueling({
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      engineId: selectedEngine.id,
      driverId: drivers[0]?.id || 1,
      driverName: drivers[0]?.lastName || "Opérateur Mobile",
      meterReading: Number(meter || (selectedEngine.currentHoursOrKm || 0) + 10),
      previousMeterReading: Number(selectedEngine.currentHoursOrKm || 0),
      quantity: Number(qty),
      unitPrice: 855,
      tankId: tanks[3]?.id || tanks[0]?.id || 1, // CC01 default for field
      refuelingPoint: "Sur zone (citerne CC01/CC02)",
      operator: "Opérateur Terrain Mobile CML",
      observation: observation || "Saisie mobile terrain Fosse 1",
      photoMeterUrl: photoCaptured ? "/photos/compteur_terrain.jpg" : undefined,
      signatureUrl: signatureDone ? "/signatures/sign_mobile.png" : undefined
    });
    if (result !== false) {
      setStep("SUCCESS");
    }
  };

  return (
    <div className="max-w-md mx-auto bg-slate-950 text-white rounded-3xl p-6 shadow-2xl border-4 border-slate-800 my-4 animate-fadeIn">
      {/* Smartphone Status Bar simulation */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-3 mb-4 font-mono">
        <span>CML FIELD MOBILE v2.4</span>
        <span className="flex items-center space-x-1 font-bold text-amber-400">
          <Smartphone className="w-3.5 h-3.5" />
          <span>4G CML-MINE</span>
        </span>
      </div>

      {step === "SELECT" && (
        <div className="space-y-4">
          <div className="text-center py-2">
            <h3 className="text-lg font-extrabold text-white">Saisie Rapide Terrain</h3>
            <p className="text-xs text-slate-400 mt-1">Sélectionnez l&apos;engin à ravitailler sur zone</p>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {engines.slice(0, 10).map((eng) => (
              <button
                key={eng.id}
                onClick={() => {
                  setSelectedEngine(eng);
                  setStep("FORM");
                }}
                className="w-full text-left p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition-all"
              >
                <div>
                  <div className="font-extrabold text-amber-400 text-sm">{eng.code}</div>
                  <div className="text-xs text-slate-300">{eng.brand} {eng.model}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                    {eng.unit}
                  </span>
                  <div className="text-[11px] text-slate-500 mt-1">{eng.currentHoursOrKm || 0} {eng.unit === "L/100km" ? "km" : "h"}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "FORM" && selectedEngine && (
        <form onSubmit={handleQuickSubmit} className="space-y-4 text-xs">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
            <button
              type="button"
              onClick={() => setStep("SELECT")}
              className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="font-extrabold text-amber-400 text-sm">{selectedEngine.code}</div>
              <div className="text-[11px] text-slate-400">{selectedEngine.brand} {selectedEngine.model}</div>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-bold">Nouveau relevé compteur ({selectedEngine.unit === "L/100km" ? "km" : "horamètre"})</label>
            <input
              type="number"
              step="0.1"
              required
              placeholder={`Précédent: ${selectedEngine.currentHoursOrKm || 0}`}
              value={meter}
              onChange={(e) => setMeter(e.target.value)}
              className="mt-1 w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl font-extrabold text-white text-base focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-amber-400 font-bold">Quantité Distribuée (Litres)</label>
            <input
              type="number"
              step="0.1"
              required
              placeholder="ex: 380"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1 w-full p-3.5 bg-slate-900 border border-amber-500 rounded-xl font-extrabold text-amber-400 text-lg focus:outline-none"
            />
          </div>

          {/* Photo Compteur Simulation */}
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Camera className={`w-5 h-5 ${photoCaptured ? "text-emerald-400" : "text-slate-400"}`} />
              <div>
                <div className="font-bold text-white">Photo Compteur</div>
                <div className="text-[10px] text-slate-400">{photoCaptured ? "Capturée par APN" : "Prendre photo justificative"}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPhotoCaptured(!photoCaptured)}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] ${photoCaptured ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-slate-800 text-white"}`}
            >
              {photoCaptured ? "✓ OK" : "Capturer"}
            </button>
          </div>

          {/* Signature Tactile Simulation */}
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <PenTool className={`w-5 h-5 ${signatureDone ? "text-emerald-400" : "text-slate-400"}`} />
              <div>
                <div className="font-bold text-white">Signature Chauffeur</div>
                <div className="text-[10px] text-slate-400">{signatureDone ? "Signé numériquement" : "Validation par signature"}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSignatureDone(!signatureDone)}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] ${signatureDone ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-slate-800 text-white"}`}
            >
              {signatureDone ? "✓ Signé" : "Signer"}
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-2xl text-sm shadow-lg shadow-amber-500/20"
          >
            Valider et Transmettre CML
          </button>
        </form>
      )}

      {step === "SUCCESS" && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40 animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-extrabold text-white">Ravitaillement Enregistré !</h3>
          <p className="text-xs text-slate-400">
            Le volume a été immédiatement déduit de la citerne CC01 et synchronisé avec le serveur CML.
          </p>
          <button
            onClick={() => {
              setQty("");
              setMeter("");
              setPhotoCaptured(false);
              setSignatureDone(false);
              setStep("SELECT");
            }}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
          >
            Nouveau Ravitaillement Mobile
          </button>
        </div>
      )}
    </div>
  );
}
