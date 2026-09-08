import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, auditLogs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSessionFromRequest } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_ROLES = [
  "Administrateur",
  "Directeur QHSE",
  "DAF",
  "Responsable Achat",
  "Responsable Station",
  "Utilisateur"
];

// Colonnes publiques : le hash de mot de passe ne doit JAMAIS quitter le serveur.
const PUBLIC_USER_COLUMNS = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  department: users.department,
  avatar: users.avatar,
  createdAt: users.createdAt
} as const;

export async function GET(req: Request) {
  try {
    if (!["Administrateur", "Directeur QHSE", "DAF"].includes(getSessionFromRequest(req)?.role || "")) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }
    const list = await db.select(PUBLIC_USER_COLUMNS).from(users).orderBy(desc(users.id));
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Erreur chargement utilisateurs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const actor = getSessionFromRequest(req);
    if (!actor || !["Administrateur", "Directeur QHSE"].includes(actor.role)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    if (!data.name || !String(data.name).trim()) {
      return NextResponse.json({ error: "Le nom complet est obligatoire." }, { status: 400 });
    }
    if (!data.email || !String(data.email).includes("@")) {
      return NextResponse.json({ error: "Email invalide ou manquant." }, { status: 400 });
    }
    if (typeof data.password !== "string" || data.password.length < 12) {
      return NextResponse.json({ error: "Un mot de passe de 12 caractères minimum est obligatoire." }, { status: 400 });
    }
    if (!ALLOWED_ROLES.includes(data.role)) {
      return NextResponse.json({ error: "Rôle non autorisé." }, { status: 400 });
    }

    const [inserted] = await db.insert(users).values({
      name: String(data.name).trim(),
      email: String(data.email).trim().toLowerCase(),
      passwordHash: hashPassword(data.password),
      role: data.role,
      department: data.department || "CML",
      avatar: data.avatar || null
    }).returning(PUBLIC_USER_COLUMNS);

    await db.insert(auditLogs).values({
      user: actor.name,
      role: actor.role,
      action: "Création Utilisateur",
      entity: "Utilisateur",
      entityId: String(inserted.id),
      newValue: `${inserted.name} - ${inserted.email} - ${inserted.role}`
    });

    return NextResponse.json(inserted);
  } catch (error: any) {
    const message = String(error?.message || "Erreur création utilisateur");
    if (message.includes("duplicate key") || message.includes("users_email_unique")) {
      return NextResponse.json({ error: "Cet email existe déjà. Utilisez un autre email." }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    const actor = getSessionFromRequest(req);
    if (!actor || !["Administrateur", "Directeur QHSE"].includes(actor.role)) {
      return NextResponse.json({ error: "Modification refusée : seuls l'Administrateur et le Directeur QHSE peuvent modifier une information." }, { status: 403 });
    }
    const id = Number(data.id);
    if (!id) return NextResponse.json({ error: "ID utilisateur invalide." }, { status: 400 });

    const patch: any = {};
    if (data.name !== undefined) {
      const name = String(data.name).trim();
      if (!name) return NextResponse.json({ error: "Le nom complet est obligatoire." }, { status: 400 });
      patch.name = name;
    }
    if (data.email !== undefined) {
      const email = String(data.email).trim().toLowerCase();
      if (!email.includes("@")) return NextResponse.json({ error: "Email invalide." }, { status: 400 });
      patch.email = email;
    }
    if (data.role !== undefined) {
      if (!ALLOWED_ROLES.includes(data.role)) return NextResponse.json({ error: "Rôle non autorisé." }, { status: 400 });
      patch.role = data.role;
    }
    if (data.department !== undefined) patch.department = data.department;
    if (data.avatar !== undefined) patch.avatar = data.avatar;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Aucune modification fournie." }, { status: 400 });
    }

    const [updated] = await db.update(users).set(patch).where(eq(users.id, id)).returning(PUBLIC_USER_COLUMNS);
    if (!updated) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });

    await db.insert(auditLogs).values({
      user: actor.name,
      role: actor.role,
      action: "Modification Utilisateur",
      entity: "Utilisateur",
      entityId: String(updated.id),
      newValue: `${updated.name} - ${updated.email} - ${updated.role}`
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Erreur modification utilisateur" }, { status: 500 });
  }
}
