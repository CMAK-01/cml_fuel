import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    if (!getSessionFromRequest(req)) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    const list = await db.select().from(auditLogs).orderBy(desc(auditLogs.id));
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
