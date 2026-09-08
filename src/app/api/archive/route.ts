import { NextResponse } from "next/server";
import { db } from "@/db";
import { dataArchives } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const list = await db.select().from(dataArchives).orderBy(desc(dataArchives.id));
    // Ne pas renvoyer le snapshot complet dans la liste (trop volumineux)
    const light = list.map(({ snapshotJson, ...rest }) => ({ ...rest, hasSnapshot: !!snapshotJson }));
    return NextResponse.json(light);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// ⚠️ ROUTE DÉSACTIVÉE : l'archivage en un clic est interdit.
// Utilisez le circuit séquentiel obligatoire : /api/archive-requests
// (Demande Admin → Validation Responsable Achat → Validation finale Directeur QHSE)
export async function POST() {
  return NextResponse.json({
    error:
      "ARCHIVAGE DIRECT DÉSACTIVÉ : toute clôture doit passer par le circuit de validation officiel — " +
      "1) l'Administrateur crée une demande, 2) le Responsable Achat valide, 3) le Directeur QHSE valide et exécute. " +
      "Rendez-vous dans l'onglet Administration & Archivage."
  }, { status: 410 });
}
