import { NextResponse } from "next/server";
import { db } from "@/db";
import { refuelings, tanks, engines, drivers, alerts, auditLogs } from "@/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { getSessionFromRequest } from "@/lib/auth";
import { generateBusinessCode } from "@/lib/codes";
import { clientAddress } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    if (!getSessionFromRequest(req)) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    const list = await db.select().from(refuelings).orderBy(desc(refuelings.id));
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const user = getSessionFromRequest(req);
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    // --- Validations numériques strictes (NaN explicitement rejeté) ---
    const qty = Number(data.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ error: "Quantité distribuée invalide (nombre > 0 obligatoire)" }, { status: 400 });
    }
    const meter = Number(data.meterReading);
    const prevMeter = data.previousMeterReading !== undefined && data.previousMeterReading !== "" ? Number(data.previousMeterReading) : 0;
    if (!Number.isFinite(meter) || meter < 0 || !Number.isFinite(prevMeter) || prevMeter < 0) {
      return NextResponse.json({ error: "Relevés compteur invalides." }, { status: 400 });
    }
    if (meter <= prevMeter) {
      return NextResponse.json({ error: `Compteur incohérent (${meter} <= précédent ${prevMeter})` }, { status: 400 });
    }
    const workDone = meter - prevMeter;

    const tankId = Number(data.tankId);
    const engineId = Number(data.engineId);
    const driverId = Number(data.driverId);
    if (!Number.isInteger(tankId) || tankId <= 0 || !Number.isInteger(engineId) || engineId <= 0) {
      return NextResponse.json({ error: "Engin et cuve/citerne obligatoires." }, { status: 400 });
    }
    if (!Number.isInteger(driverId) || driverId <= 0) {
      return NextResponse.json({ error: "Chauffeur obligatoire : sélectionnez un chauffeur existant." }, { status: 400 });
    }

    const unitPrice = data.unitPrice !== undefined && data.unitPrice !== "" ? Number(data.unitPrice) : 855;
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return NextResponse.json({ error: "Prix unitaire invalide." }, { status: 400 });
    }

    const dateStr = typeof data.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.date)
      ? data.date
      : new Date().toISOString().split("T")[0];
    // Heure réelle si non fournie (serveur UTC = heure d'Abidjan, GMT+0 toute l'année)
    const timeStr = typeof data.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(data.time)
      ? data.time
      : new Date().toISOString().slice(11, 16);

    // --- Références obligatoires ---
    const [tank] = await db.select().from(tanks).where(eq(tanks.id, tankId));
    if (!tank) return NextResponse.json({ error: "Cuve ou citerne introuvable" }, { status: 404 });
    if (tank.currentLevel < qty) {
      return NextResponse.json({ error: `Stock insuffisant dans ${tank.code} (${tank.currentLevel} L disponibles pour une demande de ${qty} L)` }, { status: 400 });
    }

    const [engine] = await db.select().from(engines).where(eq(engines.id, engineId));
    if (!engine) return NextResponse.json({ error: "Engin introuvable" }, { status: 404 });

    const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId));
    if (!driver) return NextResponse.json({ error: "Chauffeur introuvable" }, { status: 404 });
    const driverName = `${driver.firstName} ${driver.lastName}`;

    // --- Calcul consommation (garde contre la division par zéro) ---
    const isLV = engine.unit === "L/100km";
    const realCons = Number((isLV ? (qty / workDone) * 100 : qty / workDone).toFixed(2));
    const refCons = engine.baseline30d || engine.normalConsumption;
    const devPct = refCons > 0 ? Number((((realCons - refCons) / refCons) * 100).toFixed(1)) : 0;

    let alertLevel = "Normal";
    if (devPct > 40) alertLevel = "Critique";
    else if (devPct > 25) alertLevel = "Alerte Rouge";
    else if (devPct > 15) alertLevel = "Surveillance";

    // --- Transaction atomique : stock + compteurs + ravitaillement + alertes + audit ---
    const ipAddress = clientAddress(req);
    const inserted = await db.transaction(async (tx) => {
      // Déduction atomique : la condition de stock est vérifiée DANS la requête UPDATE,
      // ce qui élimine la race condition entre deux saisies simultanées.
      const [deducted] = await tx.update(tanks)
        .set({ currentLevel: sql`${tanks.currentLevel} - ${qty}` })
        .where(and(eq(tanks.id, tank.id), gte(tanks.currentLevel, qty)))
        .returning({ id: tanks.id });
      if (!deducted) throw new Error(`STOCK_INSUFFICIENT:${tank.code}:${tank.currentLevel}:${qty}`);

      await tx.update(engines).set({ currentHoursOrKm: meter }).where(eq(engines.id, engine.id));
      await tx.update(drivers)
        .set({ totalConsumedLiters: sql`COALESCE(${drivers.totalConsumedLiters}, 0) + ${qty}` })
        .where(eq(drivers.id, driver.id));

      const [{ c }] = await tx.select({ c: sql<number>`count(*)` }).from(refuelings);
      const refuelingCode = generateBusinessCode("RAV", Number(c) + 1);

      // Alerte : double validation > 500 L
      if (qty > 500 && !data.supervisorValidation) {
        await tx.insert(alerts).values({
          type: "Validation Requise",
          severity: "Alerte Rouge",
          engineCode: engine.code,
          tankCode: tank.code,
          message: `Ravitaillement de ${qty} L (> 500 L) sans validation Superviseur pour ${engine.code}.`
        });
      }

      // Alerte : plage horaire autorisée 06h00–20h00
      const hour = parseInt(timeStr.split(":")[0], 10);
      if (hour < 6 || hour >= 20) {
        await tx.insert(alerts).values({
          type: "Hors Plage Horaire",
          severity: "Critique",
          engineCode: engine.code,
          tankCode: tank.code,
          message: `RAVITAILLEMENT HORS PLAGE HORAIRE (${timeStr}). Opération effectuée la nuit ou hors heures autorisées (06h00–20h00). Risque de vol.`
        });
      }

      // Alerte : surconsommation
      if (alertLevel === "Alerte Rouge" || alertLevel === "Critique") {
        await tx.insert(alerts).values({
          type: "Surconsommation",
          severity: alertLevel,
          engineCode: engine.code,
          tankCode: tank.code,
          message: `Consommation anormale pour ${engine.code}: ${realCons} ${engine.unit} vs normale ${refCons} ${engine.unit} (Écart: +${devPct}%).`
        });
      }

      const [row] = await tx.insert(refuelings).values({
        refuelingCode,
        date: dateStr,
        time: timeStr,
        engineId: engine.id,
        engineCode: engine.code,
        driverId: driver.id,
        driverName,
        meterReading: meter,
        previousMeterReading: prevMeter,
        workDone: Number(workDone.toFixed(1)),
        quantity: qty,
        unitPrice,
        totalAmount: Math.round(qty * unitPrice),
        tankId: tank.id,
        tankCode: tank.code,
        refuelingPoint: data.refuelingPoint || "À la station service",
        service: data.service || engine.department || "Extraction Mine", // Service saisi ou département de l'engin
        operator: user.name,
        observation: data.observation,
        photoMeterUrl: data.photoMeterUrl,
        signatureUrl: data.signatureUrl,
        realConsumption: realCons,
        referenceConsumption: refCons,
        deviationPercent: devPct,
        alertLevel,
        supervisorValidation: data.supervisorValidation
      }).returning();

      await tx.insert(auditLogs).values({
        user: user.name,
        role: user.role,
        action: "Saisie Ravitaillement",
        entity: "Ravitaillement",
        entityId: refuelingCode,
        newValue: `${qty} L pour ${engine.code} depuis ${tank.code} (${realCons} ${engine.unit})`,
        ipAddress
      });

      return row;
    });

    return NextResponse.json(inserted);
  } catch (error: any) {
    const message = String(error?.message || "");
    if (message.startsWith("STOCK_INSUFFICIENT:")) {
      const [, code, level, asked] = message.split(":");
      return NextResponse.json({ error: `Stock insuffisant dans ${code} (${level} L disponibles pour une demande de ${asked} L)` }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || "Erreur lors du ravitaillement" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    const user = getSessionFromRequest(req);
    if (!user || !["Administrateur", "Directeur QHSE"].includes(user.role)) {
      return NextResponse.json({ error: "Modification refusée : seuls l'Administrateur et le Directeur QHSE peuvent modifier une information." }, { status: 403 });
    }
    const id = Number(data.id);
    const [existing] = await db.select().from(refuelings).where(eq(refuelings.id, id));
    if (!existing) return NextResponse.json({ error: "Enregistrement introuvable" }, { status: 404 });

    // Check 24h lock
    const recordTime = new Date(existing.createdAt || Date.now()).getTime();
    const isOver24h = (Date.now() - recordTime) > 24 * 60 * 60 * 1000 || existing.isLocked;

    if (isOver24h && !data.lastModifiedReason) {
      return NextResponse.json({
        error: "ENREGISTREMENT VERROUILLÉ (> 24h). Une justification ou motif d'audit est obligatoire pour modifier cet historique."
      }, { status: 423 });
    }

    const [updated] = await db.update(refuelings)
      .set({
        observation: data.observation ?? existing.observation,
        supervisorValidation: data.supervisorValidation ?? existing.supervisorValidation,
        lastModifiedAt: new Date(),
        lastModifiedReason: data.lastModifiedReason || "Correction autorisée"
      })
      .where(eq(refuelings.id, id))
      .returning();

    await db.insert(auditLogs).values({
      user: user.name,
      role: user.role,
      action: "Modification Ravitaillement (>24h)",
      entity: "Ravitaillement",
      entityId: existing.refuelingCode,
      oldValue: `Obs: ${existing.observation || "Aucune"}`,
      newValue: `Obs: ${updated.observation} (Motif: ${data.lastModifiedReason})`
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
