import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed";
import { getSessionFromRequest } from "@/lib/auth";

function requireAdmin(request: Request) {
  const user = getSessionFromRequest(request);
  return user?.role === "Administrateur" ? user : null;
}

export async function POST(req: Request) {
  try {
    if (!requireAdmin(req)) {
      return NextResponse.json({ error: "Accès réservé à l'Administrateur." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const forceReset = body?.forceReset === true;
    const result = await seedDatabase(forceReset);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error seeding CML database:", error);
    return NextResponse.json({ error: error?.message || "Erreur lors de l'import Excel CML" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Initialisation par GET désactivée." }, { status: 405 });
}
