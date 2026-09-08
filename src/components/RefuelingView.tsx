"use client";

import React, { useState } from "react";
import { 
  Fuel, 
  Plus, 
  AlertTriangle, 
  Lock, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Edit3, 
  Camera, 
  PenTool,
  Search,
  Building2
} from "lucide-react";
import { SERVICES_CML } from "@/lib/seed-engines";

interface RefuelingViewProps {
  refuelings: any[];
  engines: any[];
  tanks: any[];
  drivers: any[];
  onAdd: (data: any) => Promise<boolean | void>;
  onUpdate: (data: any) => Promise<boolean | void>;
  canModify?: boolean;
}

export function RefuelingView({ refuelings, engines, tanks, drivers, onAdd, onUpdate, canModify = false }: RefuelingViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editReason, setEditReason] = useState("");
  const [editObservation, setEditObservation] = useState("");
  const [search, setSearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [engineId, setEngineId] = useState<number>(0);
  const [driverId, setDriverId] = useState<number>(0);
  const [tankId, setTankId] = useState<number>(0);
  // Initialisés de façon paresseuse (fonction) pour rester purs au render
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("08:30");
  const [meterReading, setMeterReading] = useState("");
  const [previousMeterReading, setPreviousMeterReading] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("855");
  const [refuelingPoint, setRefuelingPoint] = useState("À la station service");
  const [service, setService] = useState("Exploitation Minière");
  const [operator, setOperator] = useState("Koné Seydou");
  const [observation, setObservation] = useState("");
  const [supervisorValidation, setSupervisorValidation] = useState("");
  // Instant de référence capturé une seule fois (state lazy) pour le calcul du verrou 24h
  const [renderTime] = useState(() => Date.now());

  // Synchroniser les sélections dès que les données sont chargées (évite les IDs obsolètes)
  // Les setState sont reportés en microtâche pour ne pas provoquer de cascade render synchrone.
  React.useEffect(() => {
    if (engines.length > 0 && !engines.some(e => e.id === engineId)) {
      queueMicrotask(() => setEngineId(engines[0].id));
    }
  }, [engines, engineId]);

  // Pré-remplir automatiquement le service selon l'engin sélectionné (l'utilisateur peut le modifier)
  React.useEffect(() => {
    const engine = engines.find(e => e.id === engineId);
    if (engine?.department && SERVICES_CML.includes(engine.department)) {
      queueMicrotask(() => setService(engine.department));
    }
  }, [engineId, engines]);
  React.useEffect(() => {
    if (drivers.length > 0 && !drivers.some(d => d.id === driverId)) {
      queueMicrotask(() => setDriverId(drivers[0].id));
    }
  }, [drivers, driverId]);
  React.useEffect(() => {
    if (tanks.length > 0 && !tanks.some(t => t.id === tankId)) {
      queueMicrotask(() => setTankId(tanks[0].id));
    }
  }, [tanks, tankId]);

  // Find selected objects
  const selEngine = engines.find((e) => e.id === Number(engineId)) || engines[0];
  const selTank = tanks.find((t) => t.id === Number(tankId)) || tanks[0];
  const isLV = selEngine?.unit === "L/100km";

  // Auto computations
  const q = Number(quantity) || 0;
  const p = Number(unitPrice) || 855;
  const totalAmount = Math.round(q * p);

  const meter = Number(meterReading) || 0;
  const prevMeter = Number(previousMeterReading) || Number(selEngine?.currentHoursOrKm || 0);
  const workDone = Math.max(0.1, meter - prevMeter);

  let computedCons = 0;
  if (workDone > 0 && q > 0) {
    computedCons = isLV ? Number(((q / workDone) * 100).toFixed(2)) : Number((q / workDone).toFixed(2));
  }

  // Check time hour
  const hour = parseInt(time.split(":")[0] || "8", 10);
  const isOutsideHours = hour < 6 || hour >= 20;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validations client avec messages clairs
    if (!selEngine) {
      setFormError("Aucun engin sélectionné. Sélectionnez un engin dans la liste.");
      return;
    }
    if (!selTank) {
      setFormError("Aucune cuve/citerne sélectionnée.");
      return;
    }
    if (q <= 0) {
      setFormError("La quantité distribuée doit être supérieure à 0 litre.");
      return;
    }
    if (meter <= prevMeter) {
      setFormError(
        `COMPTEUR INCOHÉRENT : le nouveau relevé (${meter}) doit être SUPÉRIEUR à l'ancien compteur (${prevMeter} ${isLV ? "km" : "h"}). ` +
        `Saisissez le relevé actuel de ${isLV ? "l'odomètre" : "l'horamètre"} de l'engin ${selEngine.code} — ex : ${prevMeter + 8}.`
      );
      return;
    }
    if (selTank.currentLevel < q) {
      setFormError(`STOCK INSUFFISANT dans ${selTank.code} : ${new Intl.NumberFormat("fr-FR").format(selTank.currentLevel)} L disponibles pour une demande de ${q} L. Choisissez une autre cuve ou effectuez un transfert.`);
      return;
    }
    if (q > 500 && !supervisorValidation.trim()) {
      if (!confirm("Attention : Ravitaillement > 500 L sans nom de superviseur. Confirmer quand même ? Une alerte 'Validation Requise' sera émise.")) {
        return;
      }
    }

    setSubmitting(true);
    const selDriver = drivers.find(d => d.id === Number(driverId)) || drivers[0];
    const success = await onAdd({
      date,
      time,
      engineId: selEngine.id,
      driverId: selDriver?.id,
      driverName: selDriver ? `${selDriver.firstName} ${selDriver.lastName}` : "Chauffeur",
      meterReading: meter,
      previousMeterReading: prevMeter,
      quantity: q,
      unitPrice: p,
      tankId: selTank.id,
      refuelingPoint,
      service,
      operator,
      observation,
      supervisorValidation
    });
    setSubmitting(false);

    if (success === false) {
      // L'erreur serveur est déjà affichée par le parent ; on garde le modal ouvert
      setFormError("La saisie a été refusée par le serveur — voir le message ci-dessus. Corrigez puis revalidez.");
      return;
    }

    setShowModal(false);
    setQuantity("");
    setMeterReading("");
    setSupervisorValidation("");
    setFormError(null);
  };

  const handleOpenEdit = (rec: any) => {
    if (!canModify) {
      alert("Modification refusée : seuls l'Administrateur et le Directeur QHSE peuvent modifier une information.");
      return;
    }
    setEditingRecord(rec);
    setEditObservation(rec.observation || "");
    setEditReason("");
  };

  const handleSaveEdit = async () => {
    if (!canModify) {
      alert("Modification refusée : seuls l'Administrateur et le Directeur QHSE peuvent modifier une information.");
      return;
    }
    if (!editingRecord) return;
    const recordTime = new Date(editingRecord.createdAt || Date.now()).getTime();
    const isOver24h = (Date.now() - recordTime) > 24 * 3600 * 1000 || editingRecord.isLocked;

    if (isOver24h && !editReason.trim()) {
      alert("Cet enregistrement a plus de 24h (verrouillé). Vous devez obligatoirement saisir une justification d'audit.");
      return;
    }

    await onUpdate({
      id: editingRecord.id,
      observation: editObservation,
      lastModifiedReason: editReason || "Correction autorisée"
    });
    setEditingRecord(null);
  };

  const filteredRefs = refuelings.filter(r => 
    r.engineCode?.toLowerCase().includes(search.toLowerCase()) ||
    r.refuelingCode?.toLowerCase().includes(search.toLowerCase()) ||
    r.driverName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Fuel className="w-6 h-6 text-amber-500" />
            <span>Historique & Saisie des Ravitaillements (Déduction Auto du Stock)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Plage horaire autorisée CML : 06h00–20h00. Double validation obligatoire &gt; 500 L. Verrouillage inaltérable après 24h.
          </p>
        </div>
        <button
          onClick={() => {
            if (selEngine) setPreviousMeterReading(String(selEngine.currentHoursOrKm || 0));
            setShowModal(true);
          }}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Ravitaillement</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par engin, code ravitaillement, chauffeur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs w-full focus:outline-none text-slate-800 font-medium"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold hidden sm:block">
          Total : {filteredRefs.length} opérations enregistrées
        </div>
      </div>

      {/* Refuelings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-3">Date / Heure</th>
                <th className="p-3">Engin</th>
                <th className="p-3">Chauffeur</th>
                <th className="p-3">Compteur</th>
                <th className="p-3">Cuve / Point</th>
                <th className="p-3">Service</th>
                <th className="p-3 text-right">Volume (L)</th>
                <th className="p-3 text-right">Conso. Réelle</th>
                <th className="p-3 text-center">Alerte</th>
                <th className="p-3 text-center">Statut 24h</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRefs.map((r) => {
                const recordTime = new Date(r.createdAt || r.date || 0).getTime();
                const isOver24h = r.isLocked || (recordTime > 0 && (renderTime - recordTime) > 24 * 3600 * 1000);

                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{r.date}</div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{r.time}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-extrabold text-slate-900">{r.engineCode}</div>
                      <div className="text-[10px] text-slate-400">{r.refuelingCode}</div>
                    </td>
                    <td className="p-3 font-medium text-slate-700">{r.driverName}</td>
                    <td className="p-3 text-slate-600">
                      <div><strong className="text-slate-800">{r.meterReading}</strong> ({r.workDone} {r.engineCode?.startsWith("LV") ? "km" : "h"})</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{r.tankCode}</div>
                      <div className="text-[10px] text-slate-500">{r.refuelingPoint}</div>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-bold border border-indigo-200">
                        {r.service || r.engineDepartment || "—"}
                      </span>
                    </td>
                    <td className="p-3 text-right font-extrabold text-slate-900 text-sm">
                      {new Intl.NumberFormat("fr-FR").format(r.quantity)} L
                    </td>
                    <td className="p-3 text-right">
                      <span className="font-bold text-slate-800">
                        {r.realConsumption} {r.engineCode?.startsWith("LV") ? "L/100km" : "L/H"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.alertLevel === "Normal"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.alertLevel === "Surveillance"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800 font-extrabold"
                        }`}
                      >
                        {r.alertLevel}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {canModify ? (
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className={`inline-flex items-center space-x-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                          isOver24h
                            ? "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
                            : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                        }`}
                      >
                        {isOver24h ? <Lock className="w-3 h-3 text-slate-500" /> : <Edit3 className="w-3 h-3 text-blue-600" />}
                        <span>{isOver24h ? "Verrouillé (24h)" : "Modifier"}</span>
                      </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold">Lecture seule</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Saisie Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center space-x-2">
              <Fuel className="w-5 h-5 text-amber-500" />
              <span>Formulaire de Ravitaillement Terrain CML</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              La quantité distribuée sera immédiatement déduite de la cuve ou citerne sélectionnée.
            </p>

            {/* Bannière d'erreur visible dans le formulaire */}
            {formError && (
              <div className="mb-3 p-3.5 bg-red-50 border-2 border-red-400 rounded-2xl flex items-start space-x-2 text-xs animate-fadeIn">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-red-800">Validation impossible :</div>
                  <p className="text-red-700 font-medium mt-0.5">{formError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Date du ravitaillement</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Heure (Plage autorisée: 06h00–20h00)</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                  {isOutsideHours && (
                    <span className="text-[10px] text-red-600 font-bold flex items-center space-x-1 mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Attention : Hors plage horaire (06h-20h) → Alerte Critique émise !</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Engine & Driver */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Sélection Engin / Véhicule</label>
                  <select
                    value={engineId}
                    onChange={(e) => {
                      const eid = Number(e.target.value);
                      setEngineId(eid);
                      const found = engines.find(x => x.id === eid);
                      if (found) setPreviousMeterReading(String(found.currentHoursOrKm || 0));
                    }}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold bg-slate-50"
                  >
                    {engines.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.code} – {e.brand} {e.model} ({e.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Chauffeur / Opérateur</label>
                  <select
                    value={driverId}
                    onChange={(e) => setDriverId(Number(e.target.value))}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                  >
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.firstName} {d.lastName} ({d.matricule})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tank selection & Point */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Cuve ou Citerne de Prélèvement</label>
                  <select
                    value={tankId}
                    onChange={(e) => setTankId(Number(e.target.value))}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-900 bg-amber-50/50"
                  >
                    {tanks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} – {t.name} ({new Intl.NumberFormat("fr-FR").format(t.currentLevel)} L dispo)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Point de Ravitaillement</label>
                  <select
                    value={refuelingPoint}
                    onChange={(e) => setRefuelingPoint(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="À la station service">À la station service (Usine)</option>
                    <option value="Sur zone (citerne CC01/CC02)">Sur zone (par citerne mobile CC01/CC02)</option>
                  </select>
                </div>
              </div>

              {/* Service de rattachement de l'engin */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl">
                <label className="font-bold text-indigo-900 flex items-center space-x-2 mb-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Service auquel l'engin est rattaché (au moment du ravitaillement)</span>
                </label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full p-2.5 border-2 border-indigo-300 rounded-xl font-bold bg-white text-indigo-900"
                  required
                >
                  {SERVICES_CML.map((svc) => (
                    <option key={svc} value={svc}>{svc}</option>
                  ))}
                </select>
                <p className="text-[10px] text-indigo-700 mt-1.5 font-medium">
                  💡 Pré-rempli selon le département de l'engin ({selEngine?.department || "-"}). Modifiez si l'engin est temporairement affecté à un autre service.
                </p>
              </div>

              {/* Meter readings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">
                    Ancien Compteur ({isLV ? "km" : "horamètre"})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={previousMeterReading}
                    onChange={(e) => setPreviousMeterReading(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg bg-slate-100 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">
                    Nouveau Compteur Actuel ({isLV ? "km" : "horamètre"})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={meterReading}
                    onChange={(e) => setMeterReading(e.target.value)}
                    placeholder={`doit être > ${prevMeter} (ex: ${prevMeter + 10})`}
                    className={`mt-1 w-full p-2 border rounded-lg font-extrabold text-slate-900 ${
                      meterReading && meter <= prevMeter ? "border-red-500 bg-red-50" : "border-slate-300"
                    }`}
                  />
                  {meterReading && meter <= prevMeter && (
                    <span className="text-[10px] text-red-600 font-bold mt-0.5 block">
                      ⚠️ Doit être supérieur à l&apos;ancien compteur ({prevMeter} {isLV ? "km" : "h"})
                    </span>
                  )}
                  {meterReading && meter > prevMeter && (
                    <span className="text-[10px] text-emerald-600 font-bold mt-0.5 block">
                      ✅ Travail effectué : {(meter - prevMeter).toFixed(1)} {isLV ? "km" : "heures"}
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity & Auto computation */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700">Quantité Distribuée (L)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="ex: 420"
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-extrabold text-amber-600 text-sm"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Prix Unitaire (FCFA)</label>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Montant Total (FCFA)</label>
                  <div className="mt-1 p-2 bg-slate-200 rounded-lg font-extrabold text-slate-900 text-sm flex items-center">
                    {new Intl.NumberFormat("fr-FR").format(totalAmount)}
                  </div>
                </div>
              </div>

              {/* Dynamic consumption display */}
              {q > 0 && workDone > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-blue-800 font-bold">Calcul Conso. Réelle en temps réel : </span>
                    <span className="text-sm font-extrabold text-blue-950 ml-1">
                      {computedCons} {isLV ? "L/100km" : "L/H"}
                    </span>
                  </div>
                  <span className="text-blue-700 font-semibold">
                    Norme {selEngine?.code} : {selEngine?.normalConsumption} {selEngine?.unit}
                  </span>
                </div>
              )}

              {/* Double validation requirement > 500L */}
              {q > 500 && (
                <div className="p-3.5 bg-amber-100 border-2 border-amber-400 rounded-2xl animate-pulse text-xs">
                  <div className="flex items-center space-x-2 font-bold text-amber-900">
                    <ShieldCheck className="w-5 h-5 text-amber-700" />
                    <span>DOUBLE VALIDATION REQUISE (&gt; 500 Litres)</span>
                  </div>
                  <p className="text-amber-800 mt-1">
                    Conformément aux règles anti-fraude CML, ce volume important exige l&apos;approbation d&apos;un superviseur mine.
                  </p>
                  <input
                    type="text"
                    required={q > 500}
                    placeholder="Saisir Nom & Signature du Superviseur Mine (ex: Yao Patrice)"
                    value={supervisorValidation}
                    onChange={(e) => setSupervisorValidation(e.target.value)}
                    className="mt-2 w-full p-2 bg-white border border-amber-400 rounded-lg font-bold text-slate-900"
                  />
                </div>
              )}

              {/* Observation & photo simulation */}
              <div>
                <label className="font-bold text-slate-700">Observation / Conditions terrain</label>
                <input
                  type="text"
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="ex: Plein effectué en début de poste Fosse 1"
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormError(null); }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2.5 font-extrabold rounded-xl shadow-lg ${
                    submitting
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                  }`}
                >
                  {submitting ? "Enregistrement..." : `Valider et Déduire ${q ? `${q} L` : ""} du Stock`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal (24h Lock mechanism) */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-fadeIn text-xs">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Modification d&apos;Enregistrement d&apos;Audit</span>
            </h3>
            <p className="text-slate-500 mb-4">
              Opération : <strong className="text-slate-800">{editingRecord.refuelingCode}</strong> ({editingRecord.engineCode})
            </p>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700">Observation actuelle</label>
                <input
                  type="text"
                  value={editObservation}
                  onChange={(e) => setEditObservation(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="font-bold text-red-700 block mb-1">
                  Justification / Motif obligatoire (&gt; 24h verrouillé)
                </label>
                <textarea
                  rows={3}
                  required
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Expliquer pourquoi cet enregistrement historique est modifié (tracé en journal d'audit)..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-5">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md"
              >
                Sauvegarder dans l&apos;Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
