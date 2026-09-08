import { NextResponse } from "next/server";
import { db } from "@/db";
import { archiveRequests, dataArchives, refuelings, stockEntries, alerts, auditLogs, tankTransfers } from "@/db/schema";
import { sql, desc, eq, and, gte, lte } from "drizzle-orm";
import { getSessionFromRequest } from "@/lib/auth";
import { generateBusinessCode } from "@/lib/codes";

export async function GET() {
  try {
    const list = await db.select().from(archiveRequests).orderBy(desc(archiveRequests.id));
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// Étape 0 : L'Administrateur crée la DEMANDE d'archivage
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { periodLabel, startDate, endDate, requestNotes, resetOperationalData } = body;
    const user = getSessionFromRequest(req);

    if (user?.role !== "Administrateur") {
      return NextResponse.json({
        error: "DEMANDE REFUSÉE : Seul un Administrateur CML peut initier une demande d'archivage."
      }, { status: 403 });
    }
    if (!periodLabel?.trim() || !startDate || !endDate) {
      return NextResponse.json({ error: "Libellé de période, date de début et date de clôture obligatoires." }, { status: 422 });
    }
    if (startDate > endDate) {
      return NextResponse.json({ error: "La date de début doit précéder la date de clôture." }, { status: 422 });
    }
    if (resetOperationalData === true) {
      return NextResponse.json({ error: "La purge après archivage est temporairement désactivée." }, { status: 422 });
    }

    // Empêcher les doublons : une seule demande en cours à la fois
    const pending = await db.select().from(archiveRequests)
      .where(sql`${archiveRequests.status} IN ('En attente Achat', 'En attente QHSE')`);
    if (pending.length > 0) {
      return NextResponse.json({
        error: `Une demande est déjà en cours de validation (${pending[0].requestCode} – ${pending[0].status}). Attendez sa clôture avant d'en créer une nouvelle.`
      }, { status: 409 });
    }

    // Code unique : séquentiel + suffixe entropique (fini les collisions aléatoires)
    const [{ c: reqCount }] = await db.select({ c: sql<number>`count(*)` }).from(archiveRequests);
    const requestCode = generateBusinessCode("DEM-ARC", Number(reqCount) + 1);

    const [inserted] = await db.insert(archiveRequests).values({
      requestCode,
      periodLabel: periodLabel.trim(),
      startDate: startDate || null,
      endDate,
      requestedBy: user.name,
      requestedByRole: user.role,
      requestNotes,
      resetOperationalData: false,
      status: "En attente Achat"
    }).returning();

    await db.insert(auditLogs).values({
      user: user.name,
      role: user.role,
      action: "Demande d'Archivage Créée",
      entity: "Demande Archive",
      entityId: requestCode,
      newValue: `Période "${periodLabel}" – Envoyée au Responsable Achat pour validation (étape 1/2).`
    });

    return NextResponse.json({
      success: true,
      request: inserted,
      message: `Demande ${requestCode} créée. Elle est maintenant EN ATTENTE de validation du Responsable Achat (étape 1/2).`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// Étapes 1 & 2 : Validations séquentielles Achat puis QHSE
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { requestId, action, comment } = body;
    const user = getSessionFromRequest(req);
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    const validatorName = user.name;
    const validatorRole = user.role;
    // action: "validate_achat" | "reject_achat" | "validate_qhse" | "reject_qhse"

    const [request] = await db.select().from(archiveRequests).where(eq(archiveRequests.id, Number(requestId)));
    if (!request) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });

    if (request.status === "Exécutée & Scellée" || request.status === "Rejetée") {
      return NextResponse.json({ error: `Cette demande est déjà clôturée (${request.status}).` }, { status: 409 });
    }

    // ÉTAPE 1 : RESPONSABLE ACHAT
    if (action === "validate_achat" || action === "reject_achat") {
      if (validatorRole !== "Responsable Achat") {
        return NextResponse.json({
          error: `VALIDATION REFUSÉE : Cette étape est réservée au rôle "Responsable Achat". Votre rôle actuel : "${validatorRole}". Connectez-vous avec le compte Responsable Achat (Silué Bernard).`
        }, { status: 403 });
      }
      if (request.status !== "En attente Achat") {
        return NextResponse.json({ error: `Étape invalide : la demande est au statut "${request.status}".` }, { status: 409 });
      }

      const isValidation = action === "validate_achat";
      const [updated] = await db.update(archiveRequests).set({
        achatDecision: isValidation ? "Validée" : "Rejetée",
        achatValidatorName: validatorName || "Responsable Achat",
        achatComment: comment || (isValidation ? "Conforme aux procédures Achats CML." : "Non conforme."),
        achatDecisionDate: new Date(),
        status: isValidation ? "En attente QHSE" : "Rejetée"
      }).where(eq(archiveRequests.id, request.id)).returning();

      await db.insert(auditLogs).values({
        user: validatorName || "Responsable Achat",
        role: "Responsable Achat",
        action: isValidation ? "Validation Achat – Demande Archivage" : "Rejet Achat – Demande Archivage",
        entity: "Demande Archive",
        entityId: request.requestCode,
        oldValue: "En attente Achat",
        newValue: isValidation
          ? `Validée par ${validatorName} → transmise au Directeur QHSE (étape 2/2).`
          : `Rejetée par ${validatorName}. Motif : ${comment || "Non précisé"}`
      });

      return NextResponse.json({
        success: true,
        request: updated,
        message: isValidation
          ? "✅ Validation Achat enregistrée. La demande est transmise au Directeur QHSE (étape 2/2)."
          : "❌ Demande rejetée par le Responsable Achat. L'Administrateur peut créer une nouvelle demande."
      });
    }

    // ÉTAPE 2 : DIRECTEUR QHSE (validation finale → exécution automatique)
    if (action === "validate_qhse" || action === "reject_qhse") {
      if (validatorRole !== "Directeur QHSE") {
        return NextResponse.json({
          error: `VALIDATION REFUSÉE : Cette étape est réservée au rôle "Directeur QHSE". Votre rôle actuel : "${validatorRole}". Connectez-vous avec le compte Directeur QHSE (Traoré Aminata).`
        }, { status: 403 });
      }
      if (request.status !== "En attente QHSE") {
        return NextResponse.json({
          error: request.status === "En attente Achat"
            ? "Le Responsable Achat n'a pas encore validé cette demande (étape 1/2 en attente)."
            : `Étape invalide : la demande est au statut "${request.status}".`
        }, { status: 409 });
      }

      const isValidation = action === "validate_qhse";

      if (!isValidation) {
        const [updated] = await db.update(archiveRequests).set({
          qhseDecision: "Rejetée",
          qhseValidatorName: validatorName || "Directeur QHSE",
          qhseComment: comment || "Non conforme QHSE.",
          qhseDecisionDate: new Date(),
          status: "Rejetée"
        }).where(eq(archiveRequests.id, request.id)).returning();

        await db.insert(auditLogs).values({
          user: validatorName || "Directeur QHSE",
          role: "Directeur QHSE",
          action: "Rejet QHSE – Demande Archivage",
          entity: "Demande Archive",
          entityId: request.requestCode,
          oldValue: "En attente QHSE",
          newValue: `Rejetée par ${validatorName}. Motif : ${comment || "Non précisé"}`
        });

        return NextResponse.json({
          success: true,
          request: updated,
          message: "❌ Demande rejetée par le Directeur QHSE."
        });
      }

      // === VALIDATION QHSE FINALE → EXÉCUTION DE L'ARCHIVAGE ===
      if (!request.startDate) return NextResponse.json({ error: "Cette demande historique ne contient pas de date de début." }, { status: 422 });
      const start = new Date(`${request.startDate}T00:00:00.000Z`);
      const end = new Date(`${request.endDate}T23:59:59.999Z`);
      const refPeriod = and(gte(refuelings.date, request.startDate), lte(refuelings.date, request.endDate));
      const stockPeriod = and(gte(stockEntries.date, request.startDate), lte(stockEntries.date, request.endDate));
      const alertPeriod = and(gte(alerts.date, start), lte(alerts.date, end));
      const auditPeriod = and(gte(auditLogs.timestamp, start), lte(auditLogs.timestamp, end));
      const transferPeriod = and(gte(tankTransfers.date, start), lte(tankTransfers.date, end));
      const [refCount] = await db.select({ c: sql<number>`count(*)` }).from(refuelings).where(refPeriod);
      const [stockCount] = await db.select({ c: sql<number>`count(*)` }).from(stockEntries).where(stockPeriod);
      const [alertCount] = await db.select({ c: sql<number>`count(*)` }).from(alerts).where(alertPeriod);
      const [auditCount] = await db.select({ c: sql<number>`count(*)` }).from(auditLogs).where(auditPeriod);

      const refuelingsData = await db.select().from(refuelings).where(refPeriod);
      const totalLiters = refuelingsData.reduce((a, r: any) => a + (r.quantity || 0), 0);
      const totalAmount = refuelingsData.reduce((a, r: any) => a + (r.totalAmount || 0), 0);

      const [{ c: arcCount }] = await db.select({ c: sql<number>`count(*)` }).from(dataArchives);
      const archiveCode = generateBusinessCode("ARC", Number(arcCount) + 1);

      const snapshot = {
        archivedAt: new Date().toISOString(),
        workflow: {
          requestCode: request.requestCode,
          requestedBy: request.requestedBy,
          achatValidator: request.achatValidatorName,
          achatDate: request.achatDecisionDate,
          qhseValidator: validatorName,
          qhseDate: new Date().toISOString()
        },
        refuelings: refuelingsData,
        stockEntries: await db.select().from(stockEntries).where(stockPeriod),
        alerts: await db.select().from(alerts).where(alertPeriod),
        auditLogs: await db.select().from(auditLogs).where(auditPeriod),
        tankTransfers: await db.select().from(tankTransfers).where(transferPeriod)
      };

      const [archive] = await db.insert(dataArchives).values({
        archiveCode,
        periodLabel: request.periodLabel,
        startDate: request.startDate,
        endDate: request.endDate,
        archivedBy: request.requestedBy,
        archivedByRole: "Administrateur",
        achatValidatorName: request.achatValidatorName || "Responsable Achat",
        achatValidatorRole: "Responsable Achat",
        achatValidationDate: request.achatDecisionDate || new Date(),
        qhseValidatorName: validatorName || "Directeur QHSE",
        qhseValidatorRole: "Directeur QHSE",
        qhseValidationDate: new Date(),
        totalRefuelings: Number(refCount.c),
        totalLiters,
        totalAmountFcfa: totalAmount,
        totalStockEntries: Number(stockCount.c),
        totalAlerts: Number(alertCount.c),
        totalAuditLogs: Number(auditCount.c),
        snapshotJson: JSON.stringify(snapshot),
        notes: `Workflow complet : Demande ${request.requestCode} par ${request.requestedBy} → Achat: ${request.achatValidatorName} → QHSE: ${validatorName}. ${request.requestNotes || ""}`,
        status: "Scellé"
      }).returning();

      const [updated] = await db.update(archiveRequests).set({
        qhseDecision: "Validée",
        qhseValidatorName: validatorName || "Directeur QHSE",
        qhseComment: comment || "Conforme QHSE – archivage autorisé.",
        qhseDecisionDate: new Date(),
        status: "Exécutée & Scellée",
        archiveId: archive.id,
        archiveCode
      }).where(eq(archiveRequests.id, request.id)).returning();

      // Journal post-purge
      await db.insert(auditLogs).values({
        user: validatorName || "Directeur QHSE",
        role: "Directeur QHSE",
        action: "ARCHIVAGE EXÉCUTÉ & SCELLÉ",
        entity: "Archive",
        entityId: archiveCode,
        oldValue: `${Number(refCount.c)} ravitaillements, ${Math.round(totalLiters)} L, ${new Intl.NumberFormat("fr-FR").format(totalAmount)} FCFA`,
        newValue: `Circuit complet : ${request.requestedBy} (demande) → ${request.achatValidatorName} (Achat ✓) → ${validatorName} (QHSE ✓). ${request.resetOperationalData ? "Données opérationnelles purgées – nouvelle période démarrée." : "Sauvegarde sans purge."}`
      });

      return NextResponse.json({
        success: true,
        request: updated,
        archive,
        message: `✅ Validation QHSE finale enregistrée. Archive ${archiveCode} scellée avec succès.${request.resetOperationalData ? " Les données opérationnelles ont été purgées – l'application est prête pour une nouvelle période." : ""}`
      });
    }

    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (error: any) {
    console.error("Archive workflow error", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
