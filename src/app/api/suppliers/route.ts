import { NextResponse } from "next/server";
import { db } from "@/db";
import { suppliers, auditLogs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSessionFromRequest } from "@/lib/auth";
import { clientAddress } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    if (!getSessionFromRequest(req)) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    const list = await db.select().from(suppliers).orderBy(desc(suppliers.totalDeliveredLiters));
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

    const required = ["name", "contactPerson", "phone", "email", "address"] as const;
    for (const field of required) {
      if (!data[field] || !String(data[field]).trim()) {
        return NextResponse.json({ error: `Le champ « ${field} » est obligatoire.` }, { status: 400 });
      }
    }

    const name = String(data.name).trim();
    const [duplicate] = await db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.name, name));
    if (duplicate) {
      return NextResponse.json({ error: `Le fournisseur « ${name} » existe déjà.` }, { status: 409 });
    }

    const price = Number(data.averagePricePerLiter || 855);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Le prix moyen au litre doit être un nombre positif." }, { status: 400 });
    }

    const [inserted] = await db.insert(suppliers).values({
      name,
      contactPerson: String(data.contactPerson).trim(),
      phone: String(data.phone).trim(),
      email: String(data.email).trim(),
      address: String(data.address).trim(),
      averagePricePerLiter: price
    }).returning();

    await db.insert(auditLogs).values({
      user: user.name,
      role: user.role,
      action: "Ajout Fournisseur",
      entity: "Fournisseur",
      entityId: String(inserted.id),
      newValue: inserted.name,
      ipAddress: clientAddress(req)
    });

    return NextResponse.json(inserted);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
