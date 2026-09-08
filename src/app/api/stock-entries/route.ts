import { NextResponse } from "next/server";
import { db } from "@/db";
import { stockEntries, tanks, suppliers, auditLogs } from "@/db/schema";
import { and, eq, desc, lte, sql } from "drizzle-orm";
import { getSessionFromRequest } from "@/lib/auth";
import { clientAddress } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    if (!getSessionFromRequest(req)) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    const list = await db.select().from(stockEntries).orderBy(desc(stockEntries.id));
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const user = getSessionFromRequest(req);
    if (!user || !["Administrateur", "Directeur QHSE", "DAF", "Responsable Achat", "Responsable Station"].includes(user.role)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }
    // --- Validations numériques strictes (NaN explicitement rejeté) ---
    const rawQty = Number(data.rawQuantity);
    if (!Number.isFinite(rawQty) || rawQty <= 0) {
      return NextResponse.json({ error: "Quantité brute invalide (nombre > 0 obligatoire)." }, { status: 400 });
    }
    const temp = Number(data.temperature !== undefined && data.temperature !== "" ? data.temperature : 15);
    if (!Number.isFinite(temp) || temp < -30 || temp > 60) {
      return NextResponse.json({ error: "Température invalide (plage admise : -30 °C à 60 °C)." }, { status: 400 });
    }
    const unitPrice = Number(data.unitPrice || 855);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return NextResponse.json({ error: "Prix unitaire invalide." }, { status: 400 });
    }
    const supplierId = Number(data.supplierId);
    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      return NextResponse.json({ error: "Fournisseur obligatoire : sélectionnez un fournisseur existant." }, { status: 400 });
    }
    const tankId = Number(data.tankId);
    if (!Number.isInteger(tankId) || tankId <= 0) {
      return NextResponse.json({ error: "Cuve de réception obligatoire." }, { status: 400 });
    }

    // Correction thermique ISO à 15°C : dilatation approx du gasoil = 0.00085 par °C
    // Si temp = 38°C (Abidjan), le volume à 15°C est : rawQty * (1 - (38-15)*0.00085)
    const thermalCoeff = 0.00085;
    const correctedQty = Math.round(rawQty * (1 - (temp - 15) * thermalCoeff));
    if (correctedQty <= 0) {
      return NextResponse.json({ error: "La quantité corrigée à 15 °C doit rester positive." }, { status: 400 });
    }
    const totalAmount = rawQty * unitPrice;

    const [tank] = await db.select().from(tanks).where(eq(tanks.id, tankId));
    if (!tank) {
      return NextResponse.json({ error: "Cuve de réception introuvable" }, { status: 404 });
    }
    if (tank.currentLevel + correctedQty > tank.capacity) {
      return NextResponse.json({
        error: `Capacité dépassée pour ${tank.code} (${tank.currentLevel} L actuels + ${correctedQty} L corrigés > ${tank.capacity} L max)`
      }, { status: 400 });
    }

    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, supplierId));
    if (!supplier) {
      return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });
    }

    const dateStr = typeof data.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.date)
      ? data.date
      : new Date().toISOString().split("T")[0];
    const timeStr = typeof data.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(data.time)
      ? data.time
      : new Date().toISOString().slice(11, 16);
    const blNumber = typeof data.blNumber === "string" && data.blNumber.trim()
      ? data.blNumber.trim()
      : `BL-${Date.now().toString(36).toUpperCase()}`;

    // --- Transaction atomique : niveau cuve + total fournisseur + réception + audit ---
    const ipAddress = clientAddress(req);
    const inserted = await db.transaction(async (tx) => {
      // Ajout atomique avec contrôle de capacité DANS l'UPDATE (anti race condition)
      const [filled] = await tx.update(tanks)
        .set({ currentLevel: sql`${tanks.currentLevel} + ${correctedQty}`, lastRefillDate: new Date() })
        .where(and(eq(tanks.id, tank.id), lte(sql`${tanks.currentLevel} + ${correctedQty}`, tank.capacity)))
        .returning({ id: tanks.id });
      if (!filled) throw new Error(`CAPACITY_EXCEEDED:${tank.code}`);

      await tx.update(suppliers)
        .set({ totalDeliveredLiters: sql`COALESCE(${suppliers.totalDeliveredLiters}, 0) + ${correctedQty}` })
        .where(eq(suppliers.id, supplier.id));

      const [row] = await tx.insert(stockEntries).values({
        date: dateStr,
        time: timeStr,
        supplierId: supplier.id,
        supplierName: data.supplierName || supplier.name,
        tankId: tank.id,
        tankCode: tank.code,
        blNumber,
        rawQuantity: rawQty,
        temperature: temp,
        correctedQuantity: correctedQty,
        unitPrice,
        totalAmount,
        operator: user.name,
        notes: data.notes
      }).returning();

      await tx.insert(auditLogs).values({
        user: user.name,
        role: user.role,
        action: "Réception Stock (Corrigée 15°C)",
        entity: "Stock / Cuve",
        entityId: tank.code,
        newValue: `+${correctedQty} L (Brut: ${rawQty} L à ${temp}°C) BL: ${row.blNumber}`,
        ipAddress
      });

      return row;
    });

    return NextResponse.json(inserted);
  } catch (error: any) {
    const message = String(error?.message || "");
    if (message.startsWith("CAPACITY_EXCEEDED:")) {
      return NextResponse.json({ error: `Capacité dépassée pour ${message.split(":")[1]}. Réessayez.` }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || "Erreur de saisie de réception" }, { status: 500 });
  }
}
