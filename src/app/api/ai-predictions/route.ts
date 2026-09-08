import { NextResponse } from "next/server";
import { db } from "@/db";
import { tanks, engines, refuelings, alerts } from "@/db/schema";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    if (!getSessionFromRequest(req)) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    const allTanks = await db.select().from(tanks);
    const allEngines = await db.select().from(engines);
    const allRefuelings = await db.select().from(refuelings);
    const allAlerts = await db.select().from(alerts);

    // AI Prediction: Daily fleet consumption forecast
    // Based on active engines normal consumption * average shift duration (12 hours)
    const activeEngines = allEngines.filter(e => e.status === "Actif");
    const predictedDailyLiters = Math.round(
      activeEngines.reduce((acc, e) => {
        const rate = e.normalConsumption;
        return acc + (e.type === "Véhicule Léger (LV)" ? rate * 1.5 : rate * 10);
      }, 0)
    );

    const predictedMonthlyLiters = predictedDailyLiters * 26; // 26 working days
    const predictedMonthlyCostFCFA = predictedMonthlyLiters * 855;

    // Run-out predictions per tank
    const tankPredictions = allTanks.map(t => {
      // Estimate daily draw based on location
      const dailyDraw = t.type === "Cuve Fixe Station" ? 6500 : 3800;
      const daysRemaining = Math.max(0, Math.round((t.currentLevel / dailyDraw) * 10) / 10);
      let status = "Optimal";
      if (daysRemaining <= 2) status = "Rupture Imminente (< 48h)";
      else if (daysRemaining <= 4) status = "Critique";
      else if (daysRemaining <= 7) status = "Surveillance";

      return {
        code: t.code,
        name: t.name,
        currentLevel: t.currentLevel,
        capacity: t.capacity,
        fillPercentage: Math.round((t.currentLevel / t.capacity) * 100),
        estimatedDailyDraw: dailyDraw,
        daysRemaining,
        status,
        recommendedOrderLiters: Math.max(0, t.capacity - t.currentLevel)
      };
    });

    // Insights calculés à partir des données réelles (plus aucun texte préfabriqué)
    const aiInsights: Array<{
      id: number;
      title: string;
      type: string;
      severity: string;
      description: string;
      recommendation: string;
    }> = [];

    // 1. Pire dérive de surconsommation réellement mesurée
    const worst = [...allRefuelings]
      .filter(r => (r.deviationPercent || 0) > 15)
      .sort((a, b) => (b.deviationPercent || 0) - (a.deviationPercent || 0))[0];
    if (worst) {
      aiInsights.push({
        id: aiInsights.length + 1,
        title: `Dérive de surconsommation sur ${worst.engineCode}`,
        type: "Anomalie Technique / Consommation",
        severity: (worst.deviationPercent || 0) > 40 ? "Critique" : "Élevée",
        description: `Consommation mesurée de ${worst.realConsumption} le ${worst.date} à ${worst.time}, soit +${worst.deviationPercent} % au-dessus de la référence (${worst.referenceConsumption}). ${worst.quantity} L distribués pour ${worst.workDone} h/km de travail.`,
        recommendation: "Planifier une inspection mécanique (injecteurs, filtres) et vérifier le compteur de l'engin."
      });
    }

    // 2. Alerte de sécurité ouverte la plus récente
    const nightAlert = allAlerts
      .filter(a => a.status === "Ouverte" && (a.type === "Hors Plage Horaire" || a.type === "Validation Requise"))
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0];
    if (nightAlert) {
      aiInsights.push({
        id: aiInsights.length + 1,
        title: `${nightAlert.type} – ${nightAlert.engineCode || nightAlert.tankCode || "opération"}`,
        type: "Alerte Sécurité / Risque Vol",
        severity: nightAlert.severity || "Élevée",
        description: nightAlert.message,
        recommendation: "Exiger le rapprochement avec le rapport du superviseur de garde et résoudre l'alerte ouverte."
      });
    }

    // 3. Cuve la plus proche de la rupture
    const criticalTank = tankPredictions
      .filter(t => t.status !== "Optimal")
      .sort((a, b) => a.daysRemaining - b.daysRemaining)[0];
    if (criticalTank) {
      aiInsights.push({
        id: aiInsights.length + 1,
        title: `Risque de rupture sur ${criticalTank.code}`,
        type: "Recommandation Stock",
        severity: criticalTank.status.startsWith("Rupture") ? "Critique" : "Normale",
        description: `Au rythme de soutirage estimé (${criticalTank.estimatedDailyDraw} L/j), ${criticalTank.code} atteint la rupture dans ~${criticalTank.daysRemaining} jour(s) (niveau : ${Math.round(criticalTank.currentLevel)} L / ${criticalTank.capacity} L).`,
        recommendation: `Préparer une réception ou un transfert de ${Math.round(criticalTank.recommendedOrderLiters)} L vers ${criticalTank.code}.`
      });
    }

    if (aiInsights.length === 0) {
      aiInsights.push({
        id: 1,
        title: "Aucune anomalie détectée",
        type: "État des lieux",
        severity: "Normale",
        description: "Les consommations enregistrées sont dans les tolérances et aucune cuve n'approche de la rupture. Continuez la saisie terrain pour alimenter l'analyse.",
        recommendation: "Maintenir le rythme de saisie et la double validation > 500 L."
      });
    }

    return NextResponse.json({
      predictedDailyLiters,
      predictedMonthlyLiters,
      predictedMonthlyCostFCFA,
      tankPredictions,
      aiInsights
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
