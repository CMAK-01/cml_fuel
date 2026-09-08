import { NextResponse } from "next/server";
import { db } from "@/db";
import { engines, auditLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSessionFromRequest } from "@/lib/auth";
import { canModify } from "@/lib/permissions";
import { clientAddress } from "@/lib/rate-limit";

const FLEET_WRITE_ROLES = ["Administrateur", "Directeur QHSE", "DAF", "Responsable Achat", "Responsable Station"];

export async function GET(req: Request) {
  try {
    if (!getSessionFromRequest(req)) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    const list = await db.select().from(engines).orderBy(desc(engines.id));
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const user = getSessionFromRequest(req);
    if (!user || !FLEET_WRITE_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    // Validation stricte des champs obligatoires (colonnes NOT NULL)
    const required = ["code", "immatriculation", "category", "brand", "model", "department", "assignment"] as const;
    for (const field of required) {
      if (!data[field] || !String(data[field]).trim()) {
        return NextResponse.json({ error: `Le champ « ${field} » est obligatoire.` }, { status: 400 });
      }
    }
    const type = ["Minier Lourd", "Véhicule Léger (LV)"].includes(data.type) ? data.type : "Minier Lourd";
    const normalConsumption = Number(data.normalConsumption);
    const tankCapacity = Number(data.tankCapacity);
    if (!Number.isFinite(normalConsumption) || normalConsumption <= 0) {
      return NextResponse.json({ error: "La consommation normale doit être un nombre positif." }, { status: 400 });
    }
    if (!Number.isFinite(tankCapacity) || tankCapacity <= 0) {
      return NextResponse.json({ error: "La capacité du réservoir doit être un nombre positif." }, { status: 400 });
    }

    const code = String(data.code).trim();
    const [duplicate] = await db.select({ id: engines.id }).from(engines).where(eq(engines.code, code));
    if (duplicate) {
      return NextResponse.json({ error: `Le code engin « ${code} » existe déjà.` }, { status: 409 });
    }

    const [inserted] = await db.insert(engines).values({
      code,
      immatriculation: String(data.immatriculation).trim(),
      type,
      category: String(data.category).trim(),
      brand: String(data.brand).trim(),
      model: String(data.model).trim(),
      department: String(data.department).trim(),
      assignment: String(data.assignment).trim(),
      normalConsumption,
      unit: type === "Véhicule Léger (LV)" ? "L/100km" : "L/H",
      tankCapacity,
      commissionDate: data.commissionDate || new Date().toISOString().split("T")[0],
      status: data.status || "Actif",
      currentHoursOrKm: Number(data.currentHoursOrKm) || 0,
      baseline30d: normalConsumption
    }).returning();

    await db.insert(auditLogs).values({
      user: user.name,
      role: user.role,
      action: "Création Engin",
      entity: "Engin",
      entityId: inserted.code,
      newValue: `${inserted.immatriculation} (${inserted.brand} ${inserted.model})`,
      ipAddress: clientAddress(req)
    });

    return NextResponse.json(inserted);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Erreur de création d'engin" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    // Le rôle est déterminé par la session signée, JAMAIS par le corps de la requête.
    const user = getSessionFromRequest(req);
    if (!user || !canModify(user.role)) {
      return NextResponse.json({ error: "Modification refusée : seuls l'Administrateur et le Directeur QHSE peuvent modifier une information." }, { status: 403 });
    }
    const id = Number(data.id);
    if (!id) return NextResponse.json({ error: "ID engin invalide." }, { status: 400 });

    const [existing] = await db.select().from(engines).where(eq(engines.id, id));
    if (!existing) return NextResponse.json({ error: "Engin introuvable." }, { status: 404 });

    const patch: any = {};
    if (data.code !== undefined) {
      const code = String(data.code).trim();
      if (!code) return NextResponse.json({ error: "Le code engin ne peut pas être vide." }, { status: 400 });
      if (code !== existing.code) {
        const [dup] = await db.select({ id: engines.id }).from(engines).where(eq(engines.code, code));
        if (dup) return NextResponse.json({ error: `Le code engin « ${code} » existe déjà.` }, { status: 409 });
      }
      patch.code = code;
    }
    if (data.immatriculation !== undefined) patch.immatriculation = String(data.immatriculation).trim();
    if (data.type !== undefined) patch.type = data.type;
    if (data.category !== undefined) patch.category = data.category;
    if (data.brand !== undefined) patch.brand = data.brand;
    if (data.model !== undefined) patch.model = data.model;
    if (data.department !== undefined) patch.department = data.department;
    if (data.assignment !== undefined) patch.assignment = data.assignment;
    if (data.status !== undefined) patch.status = data.status;
    if (data.normalConsumption !== undefined && data.normalConsumption !== "") {
      const nc = Number(data.normalConsumption);
      if (!Number.isFinite(nc) || nc <= 0) {
        return NextResponse.json({ error: "La consommation normale doit être un nombre positif." }, { status: 400 });
      }
      patch.normalConsumption = nc;
      patch.baseline30d = nc;
    }
    if (data.tankCapacity !== undefined && data.tankCapacity !== "") {
      const tc = Number(data.tankCapacity);
      if (!Number.isFinite(tc) || tc <= 0) {
        return NextResponse.json({ error: "La capacité du réservoir doit être un nombre positif." }, { status: 400 });
      }
      patch.tankCapacity = tc;
    }
    if (data.currentHoursOrKm !== undefined && data.currentHoursOrKm !== "") {
      const chk = Number(data.currentHoursOrKm);
      if (!Number.isFinite(chk) || chk < 0) {
        return NextResponse.json({ error: "Le relevé compteur doit être un nombre positif." }, { status: 400 });
      }
      patch.currentHoursOrKm = chk;
    }
    if (data.commissionDate !== undefined) patch.commissionDate = data.commissionDate;
    if (data.unit !== undefined) patch.unit = data.unit;
    if (patch.type === "Véhicule Léger (LV)") patch.unit = "L/100km";
    if (patch.type === "Minier Lourd") patch.unit = "L/H";

    const [updated] = await db.update(engines).set(patch).where(eq(engines.id, id)).returning();

    await db.insert(auditLogs).values({
      user: user.name,
      role: user.role,
      action: "Modification Engin",
      entity: "Engin",
      entityId: updated.code,
      oldValue: `${existing.immatriculation} | ${existing.brand} ${existing.model} | ${existing.status}`,
      newValue: `${updated.immatriculation} | ${updated.brand} ${updated.model} | ${updated.status}`,
      ipAddress: clientAddress(req)
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Erreur modification engin" }, { status: 500 });
  }
}
