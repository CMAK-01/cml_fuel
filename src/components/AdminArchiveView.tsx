"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Archive, ShieldCheck, Lock, AlertTriangle, CheckCircle2, XCircle, FileLock2, Clock, ArrowRight, User, Send } from "lucide-react";

interface AdminArchiveViewProps {
  currentUser: { name: string; role: string; department: string };
  onArchiveComplete?: () => void;
}

export function AdminArchiveView({ currentUser, onArchiveComplete }: AdminArchiveViewProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [archives, setArchives] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [decisionModal, setDecisionModal] = useState<{ request: any; step: "achat" | "qhse" } | null>(null);
  const [decisionComment, setDecisionComment] = useState("");

  // Form demande (Admin)
  const [periodLabel, setPeriodLabel] = useState(`Clôture Carburant CML – ${new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [requestNotes, setRequestNotes] = useState("Demande de clôture de période pour démarrage d'un nouveau cycle de suivi carburant.");
  const [resetOperationalData, setResetOperationalData] = useState(true);

  const isAdmin = currentUser.role === "Administrateur";
  const isAchat = currentUser.role === "Responsable Achat";
  const isQhse = currentUser.role === "Directeur QHSE";

  const safeJson = async (res: Response) => {
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      throw new Error(`Réponse serveur inattendue (HTTP ${res.status}). Rafraîchissez la page (Ctrl+F5).`);
    }
    return res.json();
  };

  const loadData = useCallback(async () => {
    try {
      const [reqRes, arcRes] = await Promise.all([
        fetch("/api/archive-requests"),
        fetch("/api/archive")
      ]);
      const reqData = await safeJson(reqRes);
      const arcData = await safeJson(arcRes);
      if (Array.isArray(reqData)) setRequests(reqData);
      if (Array.isArray(arcData)) setArchives(arcData);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    // Le chargement (donc ses setState) est reporté en microtâche pour ne pas
    // déclencher de cascade render synchrone pendant l'effet.
    queueMicrotask(() => { void loadData(); });
  }, [loadData]);

  // ADMIN : créer la demande
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/archive-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodLabel, startDate: startDate || null, endDate,
          requestedBy: currentUser.name,
          requestedByRole: currentUser.role,
          requestNotes, resetOperationalData
        })
      });
      const json = await safeJson(res);
      if (json.error) alert("❌ " + json.error);
      else {
        alert(json.message);
        setShowRequestModal(false);
        await loadData();
      }
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ADMIN : importer une sauvegarde JSON complète
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset pour permettre le même fichier deux fois
    if (!file) return;
    if (!isAdmin) {
      alert("Import réservé à l'Administrateur.");
      return;
    }
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup?.data) {
        alert("❌ Fichier invalide : ce n'est pas une sauvegarde CML (structure 'data' manquante).");
        return;
      }
      const refCount = backup.data.refuelings?.length || 0;
      const stockCount = backup.data.stockEntries?.length || 0;
      if (!confirm(`Importer la sauvegarde du ${backup.exportedAt ? new Date(backup.exportedAt).toLocaleString("fr-FR") : "?"} ?\n\nContenu : ${refCount} ravitaillements, ${stockCount} réceptions stock, ${backup.data.engines?.length || 0} engins.\n\nLes données seront fusionnées (aucun doublon créé).`)) {
        return;
      }
      setLoading(true);
      const res = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backup,
          requestedBy: currentUser.name,
          requestedByRole: currentUser.role
        })
      });
      const json = await safeJson(res);
      if (json.error) alert("❌ " + json.error);
      else {
        alert(json.message);
        await loadData();
        if (onArchiveComplete) onArchiveComplete();
      }
    } catch (err: any) {
      alert("Erreur de lecture du fichier : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ADMIN : restaurer les données depuis un snapshot d'archive
  const handleRestore = async (archive: any) => {
    if (!isAdmin) {
      alert("Restauration réservée à l'Administrateur.");
      return;
    }
    if (!confirm(`Restaurer les données de l'archive ${archive.archiveCode} (${archive.totalRefuelings} ravitaillements, ${new Intl.NumberFormat("fr-FR").format(archive.totalLiters || 0)} L) ?\n\nLes données seront ré-importées dans l'application actuelle.`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/archive/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archiveId: archive.id,
          requestedBy: currentUser.name,
          requestedByRole: currentUser.role
        })
      });
      const json = await safeJson(res);
      if (json.error) alert("❌ " + json.error);
      else {
        alert(json.message);
        await loadData();
        if (onArchiveComplete) onArchiveComplete();
      }
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ACHAT / QHSE : valider ou rejeter
  const handleDecision = async (approve: boolean) => {
    if (!decisionModal) return;
    setLoading(true);
    try {
      const step = decisionModal.step;
      const res = await fetch("/api/archive-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: decisionModal.request.id,
          action: approve ? `validate_${step}` : `reject_${step}`,
          validatorName: currentUser.name,
          validatorRole: currentUser.role,
          comment: decisionComment
        })
      });
      const json = await safeJson(res);
      if (json.error) alert("❌ " + json.error);
      else {
        alert(json.message);
        setDecisionModal(null);
        setDecisionComment("");
        await loadData();
        if (onArchiveComplete) onArchiveComplete();
      }
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Stepper visuel du circuit
  const WorkflowStepper = ({ req }: { req: any }) => {
    const steps = [
      { label: "Demande Admin", done: true, name: req.requestedBy, date: req.requestDate },
      { label: "Validation Achat", done: req.achatDecision === "Validée", rejected: req.achatDecision === "Rejetée", name: req.achatValidatorName, date: req.achatDecisionDate, pending: req.status === "En attente Achat" },
      { label: "Validation QHSE", done: req.qhseDecision === "Validée", rejected: req.qhseDecision === "Rejetée", name: req.qhseValidatorName, date: req.qhseDecisionDate, pending: req.status === "En attente QHSE" },
      { label: "Archive Scellée", done: req.status === "Exécutée & Scellée", name: req.archiveCode }
    ];
    return (
      <div className="flex items-center flex-wrap gap-1">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div className={`flex flex-col items-center px-2 py-1.5 rounded-lg border text-center min-w-[90px] ${
              s.rejected ? "bg-red-50 border-red-300" :
              s.done ? "bg-emerald-50 border-emerald-300" :
              s.pending ? "bg-amber-50 border-amber-400 animate-pulse" :
              "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center space-x-1">
                {s.rejected ? <XCircle className="w-3.5 h-3.5 text-red-600" /> :
                 s.done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> :
                 s.pending ? <Clock className="w-3.5 h-3.5 text-amber-600" /> :
                 <Clock className="w-3.5 h-3.5 text-slate-300" />}
                <span className={`text-[10px] font-bold ${s.rejected ? "text-red-800" : s.done ? "text-emerald-800" : s.pending ? "text-amber-800" : "text-slate-400"}`}>
                  {s.label}
                </span>
              </div>
              {s.name && <span className="text-[9px] text-slate-500 font-medium mt-0.5 truncate max-w-[85px]">{s.name}</span>}
            </div>
            {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const pendingForMe = requests.filter(r =>
    (isAchat && r.status === "En attente Achat") ||
    (isQhse && r.status === "En attente QHSE")
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-red-950 to-slate-900 rounded-2xl p-6 text-white border border-red-900/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 uppercase tracking-wider flex items-center space-x-1 w-fit">
            <Lock className="w-3.5 h-3.5" />
            <span>Circuit de Validation d'Archivage CML</span>
          </span>
          <h1 className="text-2xl font-extrabold mt-2 tracking-tight">Archivage Périodique – Workflow Séquentiel</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl">
            <strong className="text-amber-400">Étape 1 :</strong> l'Administrateur crée la demande →{" "}
            <strong className="text-indigo-300">Étape 2 :</strong> le Responsable Achat valide depuis son compte →{" "}
            <strong className="text-emerald-300">Étape 3 :</strong> le Directeur QHSE donne la validation finale, qui déclenche automatiquement le scellage et la purge.
            Chaque validateur doit être <strong>connecté avec son propre rôle</strong> (menu RBAC en haut à droite).
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowRequestModal(true)}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg flex items-center space-x-2"
            >
              <Send className="w-5 h-5" />
              <span>Créer une Demande d'Archivage</span>
            </button>
            <a
              href="/api/backup"
              download
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl border border-slate-700 shadow-lg flex items-center justify-center space-x-2"
            >
              <FileLock2 className="w-4 h-4 text-emerald-400" />
              <span>💾 Sauvegarde JSON</span>
            </a>
            <label className="px-5 py-3 bg-blue-700 hover:bg-blue-600 text-white font-bold text-sm rounded-xl shadow-lg flex items-center justify-center space-x-2 cursor-pointer">
              <FileLock2 className="w-4 h-4 text-blue-200" />
              <span>📤 Importer Sauvegarde</span>
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportBackup}
              />
            </label>
          </div>
        )}
      </div>

      {/* Bandeau "à valider" pour Achat / QHSE */}
      {pendingForMe.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-2 text-amber-900 text-sm font-bold">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>{pendingForMe.length} demande(s) d'archivage en attente de VOTRE validation ({currentUser.role}) — voir ci-dessous ⬇️</span>
          </div>
        </div>
      )}

      {/* Conseil persistance des données */}
      {isAdmin && (
        <div className="bg-blue-50 border border-blue-300 rounded-2xl p-4 text-xs text-blue-900 flex items-start space-x-2">
          <FileLock2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong>Bonne pratique CML – Protection des données :</strong> téléchargez régulièrement une
            <strong> 💾 Sauvegarde JSON</strong> (bouton ci-dessus), surtout en fin de journée.
            En cas de changement d&apos;environnement, de mise à jour de l&apos;application ou d&apos;incident,
            utilisez <strong>📤 Importer Sauvegarde</strong> pour restaurer instantanément toutes vos données
            (ravitaillements, stocks, alertes, engins) sans créer de doublons.
          </div>
        </div>
      )}

      {/* Info rôle */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs flex items-center space-x-2">
        <User className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="text-slate-600">
          Connecté en tant que : <strong className="text-slate-900">{currentUser.name}</strong> — rôle <strong className="text-slate-900">{currentUser.role}</strong>.
          {isAdmin && " Vous pouvez créer des demandes d'archivage."}
          {isAchat && " Vous pouvez valider/rejeter les demandes à l'étape Achat (1/2)."}
          {isQhse && " Vous pouvez valider/rejeter les demandes à l'étape QHSE (2/2 – validation finale qui exécute l'archivage)."}
          {!isAdmin && !isAchat && !isQhse && " Consultation seule — les actions sont réservées à l'Administrateur, au Responsable Achat et au Directeur QHSE."}
        </span>
      </div>

      {/* Demandes en cours & historique du workflow */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <span>Demandes d'Archivage & Circuit de Validation</span>
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {requests.length === 0 && (
            <div className="p-8 text-center text-slate-400 font-medium text-xs">
              Aucune demande d'archivage. {isAdmin ? "Créez la première demande via le bouton ci-dessus." : "L'Administrateur doit d'abord créer une demande."}
            </div>
          )}
          {requests.map((req) => (
            <div key={req.id} className="p-5 space-y-3 hover:bg-slate-50/50">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-extrabold text-slate-900 text-sm">{req.requestCode}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      req.status === "Exécutée & Scellée" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                      req.status === "Rejetée" ? "bg-red-100 text-red-800 border border-red-300" :
                      "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    <strong>{req.periodLabel}</strong> ({req.startDate || "—"} → {req.endDate})
                    {req.requestNotes && <span className="text-slate-400"> • {req.requestNotes}</span>}
                  </div>
                </div>

                {/* Boutons d'action selon le rôle et l'étape */}
                <div className="flex items-center space-x-2 shrink-0">
                  {isAchat && req.status === "En attente Achat" && (
                    <button
                      onClick={() => setDecisionModal({ request: req, step: "achat" })}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Traiter (Validation Achat 1/2)</span>
                    </button>
                  )}
                  {isQhse && req.status === "En attente QHSE" && (
                    <button
                      onClick={() => setDecisionModal({ request: req, step: "qhse" })}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Traiter (Validation Finale QHSE 2/2)</span>
                    </button>
                  )}
                  {!isAchat && req.status === "En attente Achat" && (
                    <span className="text-[11px] text-slate-500 font-semibold px-3 py-1.5 bg-slate-100 rounded-lg">
                      ⏳ En attente : Responsable Achat
                    </span>
                  )}
                  {!isQhse && req.status === "En attente QHSE" && (
                    <span className="text-[11px] text-slate-500 font-semibold px-3 py-1.5 bg-slate-100 rounded-lg">
                      ⏳ En attente : Directeur QHSE
                    </span>
                  )}
                </div>
              </div>

              <WorkflowStepper req={req} />

              {(req.achatComment || req.qhseComment) && (
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  {req.achatComment && <div>💬 <strong className="text-indigo-700">Achat ({req.achatValidatorName}):</strong> {req.achatComment}</div>}
                  {req.qhseComment && <div>💬 <strong className="text-emerald-700">QHSE ({req.qhseValidatorName}):</strong> {req.qhseComment}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Archives scellées */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <FileLock2 className="w-5 h-5 text-amber-600" />
            <span>Archives Scellées CML</span>
          </h3>
          <span className="text-xs text-slate-500 font-semibold">{archives.length} lot(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Période</th>
                <th className="p-3.5">Circuit de validation</th>
                <th className="p-3.5 text-right">Volume</th>
                <th className="p-3.5 text-right">Montant FCFA</th>
                <th className="p-3.5">Date scellage</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {archives.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-medium">Aucune archive scellée.</td></tr>
              )}
              {archives.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="p-3.5">
                    <div className="font-mono font-extrabold text-slate-900">{a.archiveCode}</div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${a.status === "Restauré" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"}`}>{a.status}</span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-slate-800">{a.periodLabel}</div>
                    <div className="text-[11px] text-slate-500">{a.startDate || "—"} → {a.endDate}</div>
                  </td>
                  <td className="p-3.5 text-[11px]">
                    <div><strong className="text-slate-700">Admin:</strong> {a.archivedBy}</div>
                    <div><strong className="text-indigo-700">Achat ✓:</strong> {a.achatValidatorName}</div>
                    <div><strong className="text-emerald-700">QHSE ✓:</strong> {a.qhseValidatorName}</div>
                  </td>
                  <td className="p-3.5 text-right font-extrabold text-slate-900">{new Intl.NumberFormat("fr-FR").format(a.totalLiters || 0)} L</td>
                  <td className="p-3.5 text-right font-bold text-slate-800">{new Intl.NumberFormat("fr-FR").format(a.totalAmountFcfa || 0)} FCFA</td>
                  <td className="p-3.5 text-slate-600">{new Date(a.createdAt).toLocaleString("fr-FR")}</td>
                  <td className="p-3.5 text-center">
                    {isAdmin && a.hasSnapshot && a.status !== "Restauré" ? (
                      <button
                        onClick={() => handleRestore(a)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] rounded-lg shadow"
                      >
                        ♻️ Restaurer les données
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400">{a.status === "Restauré" ? "Déjà restaurée" : "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal : ADMIN crée la demande */}
      {showRequestModal && (
        <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-amber-200 max-h-[92vh] overflow-y-auto animate-fadeIn">
            <div className="p-6 border-b border-amber-100 bg-amber-50/50 rounded-t-3xl">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                <Send className="w-5 h-5 text-amber-600" />
                <span>Nouvelle Demande d'Archivage (Étape 1/3)</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Votre demande sera envoyée au <strong>Responsable Achat</strong> puis au <strong>Directeur QHSE</strong>. 
                L'archivage ne s'exécutera qu'après leurs deux validations.
              </p>
            </div>
            <form onSubmit={handleCreateRequest} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-800">Libellé de la période à archiver</label>
                <input type="text" required value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Date début</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Date fin / clôture</label>
                  <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg font-bold" />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">Motif / notes de la demande</label>
                <textarea rows={3} value={requestNotes} onChange={(e) => setRequestNotes(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-xl" />
              </div>
              <label className="flex items-start space-x-3 p-3 bg-amber-50 border border-amber-300 rounded-xl cursor-pointer">
                <input type="checkbox" checked={resetOperationalData} onChange={(e) => setResetOperationalData(e.target.checked)} className="mt-0.5" />
                <span className="text-[11px] text-amber-900">
                  <strong>Purger les données opérationnelles après validation QHSE</strong> (ravitaillements, stocks, alertes, audit). 
                  Les fiches Engins, Chauffeurs, Cuves et Fournisseurs sont conservées.
                </span>
              </label>
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowRequestModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
                <button type="submit" disabled={loading}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shadow-md">
                  {loading ? "Envoi..." : "📨 Envoyer au Responsable Achat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal : décision Achat / QHSE */}
      {decisionModal && (
        <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`bg-white rounded-3xl max-w-lg w-full shadow-2xl border max-h-[92vh] overflow-y-auto animate-fadeIn ${
            decisionModal.step === "achat" ? "border-indigo-200" : "border-emerald-200"
          }`}>
            <div className={`p-6 border-b rounded-t-3xl ${
              decisionModal.step === "achat" ? "border-indigo-100 bg-indigo-50/50" : "border-emerald-100 bg-emerald-50/50"
            }`}>
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                <ShieldCheck className={`w-5 h-5 ${decisionModal.step === "achat" ? "text-indigo-600" : "text-emerald-600"}`} />
                <span>{decisionModal.step === "achat" ? "Validation Responsable Achat (Étape 2/3)" : "Validation Finale Directeur QHSE (Étape 3/3)"}</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Demande <strong className="font-mono">{decisionModal.request.requestCode}</strong> — {decisionModal.request.periodLabel}
                <br />Demandée par : <strong>{decisionModal.request.requestedBy}</strong> (Administrateur)
                {decisionModal.step === "qhse" && (
                  <><br />✓ Déjà validée par : <strong className="text-indigo-700">{decisionModal.request.achatValidatorName}</strong> (Achat)</>
                )}
              </p>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="font-bold text-slate-700 mb-1">Vous signez en tant que :</div>
                <div className="font-extrabold text-slate-900 text-sm">{currentUser.name}</div>
                <div className="text-slate-500">{currentUser.role} — {currentUser.department}</div>
                <div className="text-[10px] text-slate-400 mt-1">Signature électronique horodatée et scellée au journal d'audit.</div>
              </div>

              {decisionModal.step === "qhse" && decisionModal.request.resetOperationalData && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-800 font-semibold">
                  ⚠️ Votre validation est FINALE : elle déclenche immédiatement le scellage de l'archive et la purge des données opérationnelles (ravitaillements, stocks, alertes, audit).
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700">Commentaire / avis motivé</label>
                <textarea rows={3} value={decisionComment} onChange={(e) => setDecisionComment(e.target.value)}
                  placeholder={decisionModal.step === "achat" ? "ex : Conforme aux procédures Achats, BL vérifiés." : "ex : Conforme QHSE, archivage autorisé."}
                  className="mt-1 w-full p-2 border border-slate-300 rounded-xl" />
              </div>

              <div className="flex justify-between space-x-3 pt-2">
                <button onClick={() => handleDecision(false)} disabled={loading}
                  className="px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-800 font-extrabold rounded-xl border border-red-300">
                  ❌ Rejeter la demande
                </button>
                <div className="flex space-x-2">
                  <button onClick={() => { setDecisionModal(null); setDecisionComment(""); }} disabled={loading}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl">
                    Annuler
                  </button>
                  <button onClick={() => handleDecision(true)} disabled={loading}
                    className={`px-5 py-2.5 text-white font-extrabold rounded-xl shadow-md ${
                      decisionModal.step === "achat" ? "bg-indigo-600 hover:bg-indigo-500" : "bg-emerald-600 hover:bg-emerald-500"
                    }`}>
                    {loading ? "Traitement..." : decisionModal.step === "achat" ? "✅ Valider & Transmettre au QHSE" : "✅ Validation Finale & Exécution"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
