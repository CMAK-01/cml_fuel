import { NextResponse } from "next/server";
import { db } from "@/db";
import { drivers, auditLogs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSessionFromRequest } from "@/lib/auth";
import { clientAddress } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    if (!getSessionFromRequest(req)) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    const list = await db.select().from(drivers).orderBy(desc(drivers.totalConsumedLiters));
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

    const required = ["firstName", "lastName", "matricule", "phone", "department", "licenseType", "licenseExpiry"] as const;
    for (const field of required) {
      if (!data[field] || !String(data[field]).trim()) {
        return NextResponse.json({ error: `Le champ « ${field} » est obligatoire.` }, { status: 400 });
      }
    }

    const matricule = String(data.matricule).trim();
    const [duplicate] = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.matricule, matricule));
    if (duplicate) {
      return NextResponse.json({ error: `Le matricule « ${matricule} » est déjà attribué à un chauffeur.` }, { status: 409 });
    }

    const [inserted] = await db.insert(drivers).values({
      firstName: String(data.firstName).trim(),
      lastName: String(data.lastName).trim(),
      matricule,
      phone: String(data.phone).trim(),
      department: String(data.department).trim(),
      licenseType: String(data.licenseType).trim(),
      licenseExpiry: data.licenseExpiry,
      status: "Actif"
    }).returning();

    await db.insert(auditLogs).values({
      user: user.name,
      role: user.role,
      action: "Ajout Chauffeur",
      entity: "Chauffeur",
      entityId: inserted.matricule,
      newValue: `${inserted.firstName} ${inserted.lastName}`,
      ipAddress: clientAddress(req)
    });

    return NextResponse.json(inserted);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
