import { NextResponse } from "next/server";
import { db } from "@/db";
import { engines, drivers, suppliers, tanks, stockEntries, refuelings, alerts, auditLogs, tankTransfers, dataArchives, archiveRequests } from "@/db/schema";
import { getSessionFromRequest } from "@/lib/auth";

// Export complet de la base CML en JSON téléchargeable (sauvegarde de sécurité)
export async function GET(request: Request) {
  try {
    if (getSessionFromRequest(request)?.role !== "Administrateur") {
      return NextResponse.json({ error: "Export réservé à l'Administrateur." }, { status: 403 });
    }
    const backup = {
      application: "CML Fuel Management System Pro",
      exportedAt: new Date().toISOString(),
      version: "2026.1",
      data: {
        engines: await db.select().from(engines),
        drivers: await db.select().from(drivers),
        suppliers: await db.select().from(suppliers),
        tanks: await db.select().from(tanks),
        stockEntries: await db.select().from(stockEntries),
        refuelings: await db.select().from(refuelings),
        alerts: await db.select().from(alerts),
        auditLogs: await db.select().from(auditLogs),
        tankTransfers: await db.select().from(tankTransfers),
        archiveRequests: await db.select().from(archiveRequests),
        dataArchives: (await db.select().from(dataArchives)).map(({ snapshotJson, ...rest }) => rest)
      }
    };

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="Sauvegarde_CML_${new Date().toISOString().split("T")[0]}.json"`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
