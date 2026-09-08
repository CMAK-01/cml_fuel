import { NextResponse } from "next/server";
import { db } from "@/db";
import { dataArchives, refuelings, stockEntries, alerts, tankTransfers, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionFromRequest } from "@/lib/auth";

// Restauration des données depuis un snapshot d'archive scellée (Administrateur uniquement)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { archiveId } = body;
    const user = getSessionFromRequest(req);

    if (user?.role !== "Administrateur") {
      return NextResponse.json({ error: "RESTAURATION REFUSÉE : réservée à l'Administrateur CML." }, { status: 403 });
    }

    const [archive] = await db.select().from(dataArchives).where(eq(dataArchives.id, Number(archiveId)));
    if (!archive) return NextResponse.json({ error: "Archive introuvable." }, { status: 404 });
    if (!archive.snapshotJson) return NextResponse.json({ error: "Cette archive ne contient pas de snapshot restaurable." }, { status: 422 });

    let snapshot: any;
    try {
      snapshot = JSON.parse(archive.snapshotJson);
    } catch {
      return NextResponse.json({ error: "Snapshot corrompu ou tronqué : restauration impossible." }, { status: 422 });
    }

    let restoredRefuelings = 0;
    let restoredStock = 0;
    let restoredAlerts = 0;
    let restoredTransfers = 0;

    // Restaurer les ravitaillements
    if (Array.isArray(snapshot.refuelings)) {
      for (const r of snapshot.refuelings) {
        const { id, createdAt, lastModifiedAt, ...rest } = r;
        try {
          await db.insert(refuelings).values({ ...rest }).onConflictDoNothing();
          restoredRefuelings++;
        } catch { /* doublon ignoré */ }
      }
    }

    // Restaurer les réceptions de stock
    if (Array.isArray(snapshot.stockEntries)) {
      for (const s of snapshot.stockEntries) {
        const { id, createdAt, ...rest } = s;
        try {
          await db.insert(stockEntries).values({ ...rest });
          restoredStock++;
        } catch { /* ignoré */ }
      }
    }

    // Restaurer les alertes
    if (Array.isArray(snapshot.alerts)) {
      for (const a of snapshot.alerts) {
        const { id, createdAt, date, ...rest } = a;
        try {
          await db.insert(alerts).values({ ...rest, date: date ? new Date(date) : new Date() });
          restoredAlerts++;
        } catch { /* ignoré */ }
      }
    }

    // Restaurer les transferts citernes
    if (Array.isArray(snapshot.tankTransfers)) {
      for (const t of snapshot.tankTransfers) {
        const { id, createdAt, date, ...rest } = t;
        try {
          await db.insert(tankTransfers).values({ ...rest, date: date ? new Date(date) : new Date() });
          restoredTransfers++;
        } catch { /* ignoré */ }
      }
    }

    await db.update(dataArchives).set({ status: "Restauré" }).where(eq(dataArchives.id, archive.id));

    await db.insert(auditLogs).values({
      user: user.name,
      role: "Administrateur",
      action: "RESTAURATION ARCHIVE",
      entity: "Archive",
      entityId: archive.archiveCode,
      oldValue: `Archive ${archive.archiveCode} (statut: Scellé)`,
      newValue: `Données restaurées : ${restoredRefuelings} ravitaillements, ${restoredStock} réceptions, ${restoredAlerts} alertes, ${restoredTransfers} transferts.`
    });

    return NextResponse.json({
      success: true,
      message: `✅ Restauration réussie depuis ${archive.archiveCode} : ${restoredRefuelings} ravitaillements, ${restoredStock} réceptions stock, ${restoredAlerts} alertes et ${restoredTransfers} transferts ré-importés.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
