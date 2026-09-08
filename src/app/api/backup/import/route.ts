import { NextResponse } from "next/server";
import { db } from "@/db";
import { engines, drivers, suppliers, tanks, stockEntries, refuelings, alerts, auditLogs, tankTransfers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionFromRequest } from "@/lib/auth";
import { clientAddress } from "@/lib/rate-limit";

// Import d'une sauvegarde JSON complète (Administrateur uniquement)
// Permet de restaurer toutes les données après un changement d'environnement
const MAX_IMPORT_BYTES = 25 * 1024 * 1024; // 25 Mo

export async function POST(req: Request) {
  try {
    // Refus des fichiers surdimensionnés avant même la lecture du corps
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_IMPORT_BYTES) {
      return NextResponse.json({ error: "Fichier trop volumineux (25 Mo maximum)." }, { status: 413 });
    }

    const body = await req.json();
    const { backup } = body;
    const user = getSessionFromRequest(req);

    if (user?.role !== "Administrateur") {
      return NextResponse.json({ error: "IMPORT REFUSÉ : réservé à l'Administrateur CML." }, { status: 403 });
    }
    if (!backup?.data) {
      return NextResponse.json({ error: "Fichier de sauvegarde invalide : structure 'data' manquante. Utilisez un fichier généré par « Sauvegarde JSON Complète »." }, { status: 422 });
    }

    const d = backup.data;
    const counts: Record<string, number> = {};

    // TRANSACTION GLOBALE : tout l'import est atomique — soit il réussit
    // entièrement, soit il est annulé sans laisser la base à moitié restaurée.
    await db.transaction(async (tx) => {
    // 1. Engins (upsert par code)
    if (Array.isArray(d.engines)) {
      counts.engines = 0;
      for (const row of d.engines) {
        const { id, createdAt, ...rest } = row;
        const existing = await tx.select().from(engines).where(eq(engines.code, rest.code));
        if (existing.length === 0) {
          await tx.insert(engines).values(rest);
          counts.engines++;
        } else {
          await tx.update(engines).set({
            currentHoursOrKm: rest.currentHoursOrKm,
            status: rest.status,
            baseline30d: rest.baseline30d
          }).where(eq(engines.code, rest.code));
        }
      }
    }

    // 2. Chauffeurs (upsert par matricule)
    if (Array.isArray(d.drivers)) {
      counts.drivers = 0;
      for (const row of d.drivers) {
        const { id, createdAt, ...rest } = row;
        const existing = await tx.select().from(drivers).where(eq(drivers.matricule, rest.matricule));
        if (existing.length === 0) {
          await tx.insert(drivers).values(rest);
          counts.drivers++;
        } else {
          await tx.update(drivers).set({
            totalConsumedLiters: rest.totalConsumedLiters,
            efficiencyScore: rest.efficiencyScore
          }).where(eq(drivers.matricule, rest.matricule));
        }
      }
    }

    // 3. Fournisseurs (upsert par nom)
    if (Array.isArray(d.suppliers)) {
      counts.suppliers = 0;
      for (const row of d.suppliers) {
        const { id, createdAt, ...rest } = row;
        const existing = await tx.select().from(suppliers).where(eq(suppliers.name, rest.name));
        if (existing.length === 0) {
          await tx.insert(suppliers).values(rest);
          counts.suppliers++;
        } else {
          await tx.update(suppliers).set({
            totalDeliveredLiters: rest.totalDeliveredLiters,
            averagePricePerLiter: rest.averagePricePerLiter
          }).where(eq(suppliers.name, rest.name));
        }
      }
    }

    // 4. Cuves (mise à jour des niveaux par code)
    if (Array.isArray(d.tanks)) {
      counts.tanks = 0;
      for (const row of d.tanks) {
        const { id, createdAt, lastRefillDate, ...rest } = row;
        const existing = await tx.select().from(tanks).where(eq(tanks.code, rest.code));
        if (existing.length === 0) {
          await tx.insert(tanks).values(rest);
          counts.tanks++;
        } else {
          await tx.update(tanks).set({ currentLevel: rest.currentLevel }).where(eq(tanks.code, rest.code));
        }
      }
    }

    // Résoudre les IDs des tables de référence pour les transactions
    const allEngines = await tx.select().from(engines);
    const allTanks = await tx.select().from(tanks);
    const allDrivers = await tx.select().from(drivers);
    const engineByCode = new Map(allEngines.map(e => [e.code, e.id]));
    const tankByCode = new Map(allTanks.map(t => [t.code, t.id]));

    // 5. Ravitaillements (insert si code inexistant, avec remappage des IDs)
    if (Array.isArray(d.refuelings)) {
      counts.refuelings = 0;
      for (const row of d.refuelings) {
        const { id, createdAt, lastModifiedAt, ...rest } = row;
        const existing = await tx.select().from(refuelings).where(eq(refuelings.refuelingCode, rest.refuelingCode));
        if (existing.length === 0) {
          await tx.insert(refuelings).values({
            ...rest,
            engineId: engineByCode.get(rest.engineCode) ?? rest.engineId,
            tankId: tankByCode.get(rest.tankCode) ?? rest.tankId,
            driverId: allDrivers.find(dr => `${dr.firstName} ${dr.lastName}` === rest.driverName)?.id ?? rest.driverId
          });
          counts.refuelings++;
        }
      }
    }

    // 6. Réceptions stock
    if (Array.isArray(d.stockEntries)) {
      counts.stockEntries = 0;
      for (const row of d.stockEntries) {
        const { id, createdAt, ...rest } = row;
        const existing = await tx.select().from(stockEntries).where(eq(stockEntries.blNumber, rest.blNumber));
        if (existing.length === 0) {
          await tx.insert(stockEntries).values({
            ...rest,
            tankId: tankByCode.get(rest.tankCode) ?? rest.tankId
          });
          counts.stockEntries++;
        }
      }
    }

    // 7. Alertes (dédupliquées : un réimport ne crée plus de doublons)
    if (Array.isArray(d.alerts)) {
      counts.alerts = 0;
      const existingAlerts = await tx.select({
        type: alerts.type, engineCode: alerts.engineCode, message: alerts.message, date: alerts.date
      }).from(alerts);
      const alertKeys = new Set(existingAlerts.map(a =>
        `${a.type}|${a.engineCode ?? ""}|${a.message}|${a.date ? new Date(a.date).toISOString() : ""}`
      ));
      for (const row of d.alerts) {
        const { id, createdAt, date, ...rest } = row;
        const parsedDate = date ? new Date(date) : new Date();
        const key = `${rest.type}|${rest.engineCode ?? ""}|${rest.message}|${parsedDate.toISOString()}`;
        if (alertKeys.has(key)) continue;
        alertKeys.add(key);
        await tx.insert(alerts).values({ ...rest, date: parsedDate });
        counts.alerts++;
      }
    }

    // 8. Transferts citernes (dédupliqués eux aussi)
    if (Array.isArray(d.tankTransfers)) {
      counts.tankTransfers = 0;
      const existingTransfers = await tx.select().from(tankTransfers);
      const transferKeys = new Set(existingTransfers.map(t =>
        `${t.sourceTankCode}|${t.destTankCode}|${t.quantity}|${t.date ? new Date(t.date).toISOString() : ""}`
      ));
      for (const row of d.tankTransfers) {
        const { id, createdAt, date, ...rest } = row;
        const parsedDate = date ? new Date(date) : new Date();
        const key = `${rest.sourceTankCode}|${rest.destTankCode}|${rest.quantity}|${parsedDate.toISOString()}`;
        if (transferKeys.has(key)) continue;
        transferKeys.add(key);
        await tx.insert(tankTransfers).values({
          ...rest,
          date: parsedDate,
          sourceTankId: tankByCode.get(rest.sourceTankCode) ?? rest.sourceTankId,
          destTankId: tankByCode.get(rest.destTankCode) ?? rest.destTankId
        });
        counts.tankTransfers++;
      }
    }

    await tx.insert(auditLogs).values({
      user: user.name,
      role: "Administrateur",
      action: "IMPORT SAUVEGARDE JSON",
      entity: "Système",
      entityId: `BACKUP-${backup.exportedAt || "inconnu"}`,
      newValue: `Import réussi : ${JSON.stringify(counts)}`,
      ipAddress: clientAddress(req)
    });
    });

    const summary = Object.entries(counts)
      .map(([k, v]) => `${v} ${k}`)
      .join(", ");

    return NextResponse.json({
      success: true,
      counts,
      message: `✅ Sauvegarde importée avec succès : ${summary}. Toutes vos données sont restaurées.`
    });
  } catch (error: any) {
    console.error("Import backup error", error);
    return NextResponse.json({ error: error?.message || "Erreur lors de l'import de la sauvegarde" }, { status: 500 });
  }
}
