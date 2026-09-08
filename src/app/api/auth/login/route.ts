import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSessionToken, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { clientAddress, isRateLimited } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (isRateLimited(`login:${clientAddress(request)}:${String(email || "").toLowerCase()}`)) {
      return NextResponse.json({ error: "Trop de tentatives. Réessayez dans 15 minutes." }, { status: 429 });
    }
    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Email et mot de passe obligatoires." }, { status: 400 });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
    if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
    }

    const sessionUser = { id: user.id, email: user.email, name: user.name, role: user.role, department: user.department || "CML" };
    const response = NextResponse.json({ user: sessionUser });
    response.cookies.set(SESSION_COOKIE, createSessionToken(sessionUser), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 8 * 60 * 60
    });
    return response;
  } catch (error) {
    console.error("Login error", error);
    return NextResponse.json({ error: "Connexion indisponible." }, { status: 500 });
  }
}
