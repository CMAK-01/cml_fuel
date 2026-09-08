import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { clientAddress, isRateLimited } from "@/lib/rate-limit";

// One-time provisioning for databases created before password_hash existed.
// Disable this endpoint by removing AUTH_BOOTSTRAP_TOKEN after all accounts are provisioned.
export async function POST(request: Request) {
  try {
    const { token, email, password } = await request.json();
    if (isRateLimited(`bootstrap:${clientAddress(request)}`, 3)) {
      return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
    }
    if (!process.env.AUTH_BOOTSTRAP_TOKEN || token !== process.env.AUTH_BOOTSTRAP_TOKEN) {
      return NextResponse.json({ error: "Initialisation refusée." }, { status: 403 });
    }
    if (typeof email !== "string" || typeof password !== "string" || password.length < 12) {
      return NextResponse.json({ error: "Email et mot de passe de 12 caractères minimum obligatoires." }, { status: 400 });
    }

    const [user] = await db.update(users)
      .set({ passwordHash: hashPassword(password) })
      .where(and(eq(users.email, email.trim().toLowerCase()), isNull(users.passwordHash)))
      .returning({ id: users.id });

    if (!user) return NextResponse.json({ error: "Compte introuvable ou déjà initialisé." }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auth bootstrap error", error);
    return NextResponse.json({ error: "Initialisation indisponible." }, { status: 500 });
  }
}
