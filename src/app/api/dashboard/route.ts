import { NextResponse } from "next/server";
import { db } from "@/db";
import { engines, tanks, refuelings, alerts, drivers } from "@/db/schema";
import { sql } from "drizzle-orm";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    if (!getSessionFromRequest(req)) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    const url = new URL(req.url);
    const spcEngineCode = url.searchParams.get("engineCode");

    const allEngines = await db.select().from(engines);
    const allTanks = await db.select().from(tanks);
    const allRefuelings = await db.select().from(refuelings);
    const allAlerts = await db.select().from(alerts);
    const allDrivers = await db.select().from(drivers);

    const todayStr = new Date().toISOString().split("T")[0];
    const currentMonthPrefix = todayStr.substring(0, 7);

    // KPI 1: Engins
    const totalEngines = allEngines.length;
    const activeEngines = allEngines.filter(e => e.status === "Actif").length;

    // KPI 2: Conso & Coût du jour vs mois
    const todayRefuelings = allRefuelings.filter(r => r.date === todayStr);
    const monthRefuelings = allRefuelings.filter(r => r.date.startsWith(currentMonthPrefix));

    const todayLiters = todayRefuelings.reduce((acc, r) => acc + (r.quantity || 0), 0);
    const todayCost = todayRefuelings.reduce((acc, r) => acc + (r.totalAmount || 0), 0);

    const monthLiters = monthRefuelings.reduce((acc, r) => acc + (r.quantity || 0), 0);
    const monthCost = monthRefuelings.reduce((acc, r) => acc + (r.totalAmount || 0), 0);

    // KPI 3: Stock
    const totalStockLiters = allTanks.reduce((acc, t) => acc + (t.currentLevel || 0), 0);
    const totalCapacity = allTanks.reduce((acc, t) => acc + (t.capacity || 0), 0);

    // KPI 4: Alertes
    const openAlertsCount = allAlerts.filter(a => a.status === "Ouverte").length;

    // KPI 5: Surconsommation & Économies
    const overconsumingRefs = allRefuelings.filter(r => (r.deviationPercent || 0) > 15);
    // Taux réel : 0 % s'il n'y a encore aucun ravitaillement (plus de valeur artificielle)
    const overconsumptionRate = allRefuelings.length ? Math.round((overconsumingRefs.length / allRefuelings.length) * 100) : 0;

    const estimatedLossesFCFA = overconsumingRefs.reduce((acc, r) => {
      const diffL = Math.max(0, r.quantity - (r.workDone || 1) * (r.referenceConsumption || 40));
      return acc + diffL * (r.unitPrice || 855);
    }, 0);

    const economicalRefs = allRefuelings.filter(r => (r.deviationPercent || 0) < -2);
    const estimatedSavingsFCFA = economicalRefs.reduce((acc, r) => {
      const diffL = Math.max(0, (r.workDone || 1) * (r.referenceConsumption || 40) - r.quantity);
      return acc + diffL * (r.unitPrice || 855);
    }, 0);

    // Charts: Conso des 7 derniers jours (ou par engin/département)
    const deptMap: Record<string, number> = {};
    allRefuelings.forEach(r => {
      const eng = allEngines.find(e => e.code === r.engineCode);
      const dept = eng?.department || "Mine";
      deptMap[dept] = (deptMap[dept] || 0) + r.quantity;
    });
    // Pas de valeurs fictives : s'il n'y a pas de données, le graphe reste vide.

    // Top 10 machines qui consomment le plus
    const engineConsMap: Record<string, { code: string; name: string; liters: number; count: number; dept: string }> = {};
    allRefuelings.forEach(r => {
      if (!engineConsMap[r.engineCode]) {
        const e = allEngines.find(x => x.code === r.engineCode);
        engineConsMap[r.engineCode] = { code: r.engineCode, name: e ? `${e.brand} ${e.model}` : r.engineCode, liters: 0, count: 0, dept: e?.department || "Mine" };
      }
      engineConsMap[r.engineCode].liters += r.quantity;
      engineConsMap[r.engineCode].count += 1;
    });
    // Uniquement les engins réellement ravitaillés (plus de volumes estimés inventés)
    const top10Consumers = Object.values(engineConsMap)
      .sort((a, b) => b.liters - a.liters)
      .slice(0, 10);

    // Top 10 surconsommateurs (plus grand écart %)
    const top10Overconsumers = allRefuelings
      .filter(r => (r.deviationPercent || 0) > 0)
      .sort((a, b) => (b.deviationPercent || 0) - (a.deviationPercent || 0))
      .slice(0, 10)
      .map(r => ({
        code: r.engineCode,
        driver: r.driverName,
        realCons: r.realConsumption,
        normCons: r.referenceConsumption,
        deviation: r.deviationPercent,
        alert: r.alertLevel
      }));

    // Top 10 Économies : calculées sur les ravitaillements réellement sobres (écart < -2 %)
    const savingsByEngine: Record<string, { code: string; name: string; liters: number; fcfa: number }> = {};
    economicalRefs.forEach(r => {
      const eng = allEngines.find(e => e.code === r.engineCode);
      const diffL = Math.max(0, (r.workDone || 0) * (r.referenceConsumption || 0) - r.quantity);
      if (diffL <= 0) return;
      if (!savingsByEngine[r.engineCode]) {
        savingsByEngine[r.engineCode] = { code: r.engineCode, name: eng ? `${eng.brand} ${eng.model}` : r.engineCode, liters: 0, fcfa: 0 };
      }
      savingsByEngine[r.engineCode].liters += diffL;
      savingsByEngine[r.engineCode].fcfa += diffL * (r.unitPrice || 855);
    });
    const top10Savings = Object.values(savingsByEngine)
      .map(s => ({ code: s.code, name: s.name, savingsLiters: Math.round(s.liters), savingsFCFA: Math.round(s.fcfa) }))
      .sort((a, b) => b.savingsFCFA - a.savingsFCFA)
      .slice(0, 10);

    // Top 10 Chauffeurs
    const top10Drivers = allDrivers
      .sort((a, b) => (b.efficiencyScore || 0) - (a.efficiencyScore || 0))
      .slice(0, 10)
      .map(d => ({
        name: `${d.firstName} ${d.lastName}`,
        matricule: d.matricule,
        dept: d.department,
        efficiency: d.efficiencyScore,
        consumed: d.totalConsumedLiters
      }));

    // SPC : carte Shewhart calculée sur les consommations RÉELLES de l'engin.
    let spcData = null;
    const targetCode = spcEngineCode || (allEngines[0]?.code || "");
    const targetEngine = allEngines.find(e => e.code === targetCode);
    if (targetEngine) {
      const base = targetEngine.baseline30d || targetEngine.normalConsumption;
      const engineRefs = allRefuelings
        .filter(r => r.engineCode === targetCode && (r.realConsumption || 0) > 0)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.time).localeCompare(String(b.time)))
        .slice(-14); // 14 derniers points chronologiques

      if (engineRefs.length >= 2) {
        // Carte réelle : moyenne et écart-type des consommations mesurées
        const points = engineRefs.map(r => Number((r.realConsumption || 0).toFixed(1)));
        const labels = engineRefs.map(r => String(r.date).split("-").reverse().slice(0, 2).join("/")); // JJ/MM
        const sum = points.reduce((a, b) => a + b, 0);
        const cl = sum / points.length;
        const variance = points.reduce((acc, val) => acc + Math.pow(val - cl, 2), 0) / points.length;
        const stdDev = Math.max(Math.sqrt(variance), cl * 0.01); // garantit CLS > CLI

        spcData = {
          engineCode: targetCode,
          engineName: `${targetEngine.brand} ${targetEngine.model} (${targetEngine.unit})`,
          unit: targetEngine.unit,
          cl: Number(cl.toFixed(2)),
          cls: Number((cl + 3 * stdDev).toFixed(2)),
          cli: Number(Math.max(0, cl - 3 * stdDev).toFixed(2)),
          labels,
          points,
          dataSource: "real" as const,
          sampleSize: points.length
        };
      } else {
        // Historique insuffisant : limites de référence constructeur, SANS courbe simulée.
        spcData = {
          engineCode: targetCode,
          engineName: `${targetEngine.brand} ${targetEngine.model} (${targetEngine.unit})`,
          unit: targetEngine.unit,
          cl: Number(base.toFixed(2)),
          cls: Number((base * 1.15).toFixed(2)),
          cli: Number((base * 0.85).toFixed(2)),
          labels: [],
          points: [],
          dataSource: "reference" as const,
          sampleSize: 0
        };
      }
    }

    return NextResponse.json({
      kpis: {
        totalEngines,
        activeEngines,
        todayLiters,
        todayCost,
        monthLiters,
        monthCost,
        totalStockLiters,
        totalCapacity,
        openAlertsCount,
        overconsumptionRate,
        estimatedLossesFCFA: Math.round(estimatedLossesFCFA),
        estimatedSavingsFCFA: Math.round(estimatedSavingsFCFA)
      },
      charts: {
        departmentMap: deptMap
      },
      rankings: {
        top10Consumers,
        top10Overconsumers,
        top10Savings,
        top10Drivers
      },
      spcData
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
