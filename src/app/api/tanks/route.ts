import { NextResponse } from "next/server";
import { db } from "@/db";
import { tanks, tankTransfers, auditLogs, alerts } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { getSessionFromRequest } from "@/lib/auth";
import { clientAddress } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    if (!getSessionFromRequest(req)) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    const list = await db.select().from(tanks).orderBy(tanks.id);
    const transfers = await db.select().from(tankTransfers).orderBy(tankTransfers.id);
    return NextResponse.json({ tanks: list, transfers });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = getSessionFromRequest(req);
    if (!user || !["Administrateur", "Directeur QHSE", "DAF", "Responsable Achat", "Responsable Station"].includes(user.role)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    if (body.action === "create") {
      const { code, name, type, capacity, currentLevel, location, minAlertLevel } = body;

      if (!code || !String(code).trim()) {
        return NextResponse.json({ error: "Le code (identifiant) de la cuve ou citerne est obligatoire." }, { status: 400 });
      }
      if (!name || !String(name).trim()) {
        return NextResponse.json({ error: "Le nom de la cuve ou citerne est obligatoire." }, { status: 400 });
      }
      if (!["Cuve Fixe Station", "Camion Citerne Mobile"].includes(type)) {
        return NextResponse.json({ error: "Le type doit être 'Cuve Fixe Station' ou 'Camion Citerne Mobile'." }, { status: 400 });
      }
      const cap = Number(capacity);
      if (!cap || cap <= 0) {
        return NextResponse.json({ error: "La capacité maximale doit être un nombre positif." }, { status: 400 });
      }
      const initLevel = Number(currentLevel) || 0;
      if (initLevel < 0 || initLevel > cap) {
        return NextResponse.json({ error: `Le niveau initial (${initLevel} L) doit être compris entre 0 et la capacité maximale (${cap} L).` }, { status: 400 });
      }
      if (!location || !String(location).trim()) {
        return NextResponse.json({ error: "La localisation est obligatoire." }, { status: 400 });
      }

      const [existing] = await db.select().from(tanks).where(eq(tanks.code, String(code).trim()));
      if (existing) {
        return NextResponse.json({ error: `Le code "${code}" est déjà utilisé par une autre cuve ou citerne.` }, { status: 409 });
      }

      const [inserted] = await db.insert(tanks).values({
        code: String(code).trim(),
        name: String(name).trim(),
        type,
        capacity: cap,
        currentLevel: initLevel,
        location: String(location).trim(),
        minAlertLevel: Number(minAlertLevel) || Math.round(cap * 0.2),
        lastRefillDate: new Date()
      }).returning();

      await db.insert(auditLogs).values({
        user: user.name,
        role: user.role,
        action: type === "Cuve Fixe Station" ? "Création Cuve" : "Création Camion Citerne",
        entity: "Cuve/Citerne",
        entityId: inserted.code,
        newValue: `${inserted.name} - Capacité: ${inserted.capacity} L - Niveau initial: ${inserted.currentLevel} L - Localisation: ${inserted.location}`,
        ipAddress: clientAddress(req)
      });

      return NextResponse.json({ success: true, tank: inserted });
    }

    if (body.action === "transfer") {
      const { sourceTankId, destTankId, quantity, notes } = body;
      const q = Number(quantity);
      if (!Number.isFinite(q) || q <= 0) {
        return NextResponse.json({ error: "Quantité invalide (nombre > 0 obligatoire)" }, { status: 400 });
      }
      const srcId = Number(sourceTankId);
      const dstId = Number(destTankId);
      if (!Number.isInteger(srcId) || srcId <= 0 || !Number.isInteger(dstId) || dstId <= 0) {
        return NextResponse.json({ error: "Cuves source et destination obligatoires." }, { status: 400 });
      }
      if (srcId === dstId) {
        return NextResponse.json({ error: "La cuve source et la destination doivent être différentes." }, { status: 400 });
      }

      const [source] = await db.select().from(tanks).where(eq(tanks.id, srcId));
      const [dest] = await db.select().from(tanks).where(eq(tanks.id, dstId));

      if (!source || !dest) return NextResponse.json({ error: "Cuve ou citerne introuvable" }, { status: 404 });
      if (dest.currentLevel + q > dest.capacity) {
        return NextResponse.json({ error: `Dépassement de capacité pour ${dest.code} (max: ${dest.capacity} L)` }, { status: 400 });
      }

      // Transaction atomique : déduction source + ajout destination + traçabilité.
      // La condition de stock est vérifiée DANS l'UPDATE (anti race condition).
      const ipAddress = clientAddress(req);
      const transfer = await db.transaction(async (tx) => {
        const [deducted] = await tx.update(tanks)
          .set({ currentLevel: sql`${tanks.currentLevel} - ${q}` })
          .where(and(eq(tanks.id, source.id), gte(tanks.currentLevel, q)))
          .returning({ id: tanks.id });
        if (!deducted) throw new Error(`STOCK_INSUFFICIENT:${source.code}:${source.currentLevel}:${q}`);

        await tx.update(tanks)
          .set({ currentLevel: sql`${tanks.currentLevel} + ${q}`, lastRefillDate: new Date() })
          .where(eq(tanks.id, dest.id));

        const [row] = await tx.insert(tankTransfers).values({
          sourceTankId: source.id,
          sourceTankCode: source.code,
          destTankId: dest.id,
          destTankCode: dest.code,
          quantity: q,
          operator: user.name,
          notes
        }).returning();

        await tx.insert(auditLogs).values({
          user: user.name,
          role: user.role,
          action: "Transfert Carburant",
          entity: "Cuve -> Citerne",
          entityId: `${source.code} -> ${dest.code}`,
          newValue: `${q} Litres transférés`,
          ipAddress
        });

        return row;
      });

      return NextResponse.json({ success: true, transfer });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (error: any) {
    const message = String(error?.message || "");
    if (message.startsWith("STOCK_INSUFFICIENT:")) {
      const [, code, level, asked] = message.split(":");
      return NextResponse.json({ error: `Stock insuffisant dans ${code} (${level} L disponibles pour une demande de ${asked} L)` }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const user = getSessionFromRequest(req);
    if (!user || !["Administrateur", "Directeur QHSE"].includes(user.role)) {
      return NextResponse.json({ error: "Modification refusée : seuls l'Administrateur et le Directeur QHSE peuvent modifier une information." }, { status: 403 });
    }
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ error: "ID de cuve/citerne invalide." }, { status: 400 });
    }

    const [existing] = await db.select().from(tanks).where(eq(tanks.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Cuve ou citerne introuvable." }, { status: 404 });
    }

    const nextType = body.type ?? existing.type;
    if (body.type && !["Cuve Fixe Station", "Camion Citerne Mobile"].includes(body.type)) {
      return NextResponse.json({ error: "Le type doit être 'Cuve Fixe Station' ou 'Camion Citerne Mobile'." }, { status: 400 });
    }

    const nextCapacity = body.capacity !== undefined ? Number(body.capacity) : existing.capacity;
    if (!nextCapacity || nextCapacity <= 0) {
      return NextResponse.json({ error: "La capacité maximale doit être un nombre positif." }, { status: 400 });
    }

    const nextLevel = body.currentLevel !== undefined ? Number(body.currentLevel) : existing.currentLevel;
    if (nextLevel < 0 || nextLevel > nextCapacity) {
      return NextResponse.json({ error: `Le niveau actuel (${nextLevel} L) doit être entre 0 et ${nextCapacity} L.` }, { status: 400 });
    }

    if (body.code && String(body.code).trim() !== existing.code) {
      const [dup] = await db.select().from(tanks).where(eq(tanks.code, String(body.code).trim()));
      if (dup) {
        return NextResponse.json({ error: `Le code "${body.code}" est déjà utilisé.` }, { status: 409 });
      }
    }

    const [updated] = await db.update(tanks).set({
      code: body.code !== undefined ? String(body.code).trim() : existing.code,
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      type: nextType,
      capacity: nextCapacity,
      currentLevel: nextLevel,
      location: body.location !== undefined ? String(body.location).trim() : existing.location,
      minAlertLevel: body.minAlertLevel !== undefined ? Number(body.minAlertLevel) : existing.minAlertLevel
    }).where(eq(tanks.id, id)).returning();

    await db.insert(auditLogs).values({
      user: user.name,
      role: user.role,
      action: "Modification Cuve/Citerne",
      entity: "Cuve/Citerne",
      entityId: updated.code,
      oldValue: `${existing.name} | ${existing.capacity} L | ${existing.currentLevel} L | ${existing.location}`,
      newValue: `${updated.name} | ${updated.capacity} L | ${updated.currentLevel} L | ${updated.location}`,
      ipAddress: clientAddress(req)
    });

    return NextResponse.json({ success: true, tank: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Erreur modification cuve/citerne" }, { status: 500 });
  }
}
