import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { getSessionFromRequest, hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await request.json();
    if (typeof newPassword !== "string" || newPassword.length < 12) {
      return NextResponse.json({ error: "Le nouveau mot de passe doit contenir au moins 12 caractères." }, { status: 400 });
    }
    const [user] = await db.select().from(users).where(eq(users.id, session.id));
    if (!user?.passwordHash || typeof currentPassword !== "string" || !verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json({ error: "Mot de passe actuel invalide." }, { status: 403 });
    }
    await db.transaction(async (tx) => {
      await tx.update(users).set({ passwordHash: hashPassword(newPassword) }).where(eq(users.id, user.id));
      await tx.insert(auditLogs).values({
        user: session.name,
        role: session.role,
        action: "Modification mot de passe",
        entity: "Utilisateur",
        entityId: String(user.id),
        newValue: "Mot de passe modifié par le titulaire du compte."
      });
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Modification du mot de passe impossible." }, { status: 500 });
  }
}
