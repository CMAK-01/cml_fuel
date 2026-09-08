import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const user = getSessionFromRequest(request);
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  return NextResponse.json({ user });
}
