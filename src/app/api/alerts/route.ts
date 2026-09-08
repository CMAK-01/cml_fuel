import { NextResponse } from "next/server";
import { db } from "@/db";
import { alerts, auditLogs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSessionFromRequest } from "@/lib/auth";
import { clientAddress } from "@/lib/rate-limit";

const ALERT_STATUSES = ["Ouverte", "Résolue", "Investiguée"];

export async function GET(req: Request) {
  try {
    if (!getSessionFromRequest(req)) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    const list = await db.select().from(alerts).orderBy(desc(alerts.id));
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    // L'identité du résolveur vient de la session signée, jamais du corps de la requête.
    const user = getSessionFromRequest(req);
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const id = Number(data.id);
    if (!id) return NextResponse.json({ error: "ID d'alerte invalide." }, { status: 400 });
    if (data.status !== undefined && !ALERT_STATUSES.includes(data.status)) {
      return NextResponse.json({ error: "Statut d'alerte invalide." }, { status: 400 });
    }

    const [updated] = await db.update(alerts)
      .set({
        status: data.status || "Résolue",
        resolvedBy: user.name,
        resolutionNote: data.resolutionNote || "Anomalie vérifiée et corrigée sur terrain."
      })
      .where(eq(alerts.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: "Alerte introuvable." }, { status: 404 });

    await db.insert(auditLogs).values({
      user: user.name,
      role: user.role,
      action: "Résolution Alerte",
      entity: "Alerte",
      entityId: `ALT-${updated.id}`,
      newValue: `Résolu : ${updated.resolutionNote}`,
      ipAddress: clientAddress(req)
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
