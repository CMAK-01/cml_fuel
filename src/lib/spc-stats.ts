// ============================================================================
// Bibliothèque de calculs SPC (Statistical Process Control)
// Module "Contrôle Statistique des Consommations" – CML Fuel Management Pro
// ----------------------------------------------------------------------------
// Toutes les fonctions sont pures (sans effet de bord), fortement typées et
// réutilisables. Elles s'appuient uniquement sur des tableaux de nombres ou
// de points {date, value} déjà agrégés depuis les ravitaillements existants.
// ============================================================================

export interface SpcPoint {
  date: string;
  value: number;
}

// ----------------------------------------------------------------------------
// Statistiques descriptives de base
// ----------------------------------------------------------------------------

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function stdDevSample(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const sumSq = values.reduce((acc, v) => acc + Math.pow(v - m, 2), 0);
  return Math.sqrt(sumSq / (values.length - 1));
}

export function coefficientOfVariation(values: number[]): number {
  const m = mean(values);
  if (m === 0) return 0;
  return (stdDevSample(values) / m) * 100;
}

export function quantile(sortedValues: number[], q: number): number {
  if (!sortedValues.length) return 0;
  const pos = (sortedValues.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedValues[base + 1] !== undefined) {
    return sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base]);
  }
  return sortedValues[base];
}

export interface BoxplotStats {
  min: number;
  max: number;
  q1: number;
  median: number;
  q3: number;
  iqr: number;
  lowerFence: number;
  upperFence: number;
  outliers: number[];
}

export function boxplotStats(values: number[]): BoxplotStats {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q2 = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);
  return {
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    q1,
    median: q2,
    q3,
    iqr,
    lowerFence,
    upperFence,
    outliers
  };
}

// ----------------------------------------------------------------------------
// Carte de contrôle Individuelle (Carte I) + Étendue Mobile (Carte MR)
// ----------------------------------------------------------------------------

export function movingRanges(values: number[]): number[] {
  const mr: number[] = [];
  for (let i = 1; i < values.length; i++) {
    mr.push(Math.abs(values[i] - values[i - 1]));
  }
  return mr;
}

export interface IChartPoint extends SpcPoint {
  movingRange: number | null;
  zScore: number;
  isOutOfControl: boolean;
}

export interface IChartResult {
  cl: number;
  ucl: number;
  lcl: number;
  sigma: number;
  mrBar: number;
  points: IChartPoint[];
}

/** Constante d2 pour n=2 (carte des individuels) */
const D2_N2 = 1.128;

export function computeIChart(series: SpcPoint[]): IChartResult {
  const values = series.map((p) => p.value);
  const cl = mean(values);
  const mr = movingRanges(values);
  const mrBar = mean(mr);
  const sigma = mrBar / D2_N2;
  const ucl = cl + 3 * sigma;
  const lcl = Math.max(0, cl - 3 * sigma);

  const points: IChartPoint[] = series.map((p, i) => {
    const mrValue = i === 0 ? null : Math.abs(values[i] - values[i - 1]);
    const zScore = sigma > 0 ? (p.value - cl) / sigma : 0;
    return {
      ...p,
      movingRange: mrValue,
      zScore,
      isOutOfControl: Math.abs(zScore) > 3
    };
  });

  return { cl, ucl, lcl, sigma, mrBar, points };
}

export interface MRChartResult {
  mrBar: number;
  ucl: number;
  lcl: number;
  points: Array<{ date: string; value: number | null }>;
}

export function computeMRChart(series: SpcPoint[]): MRChartResult {
  const values = series.map((p) => p.value);
  const mr = movingRanges(values);
  const mrBar = mean(mr);
  const ucl = 3.267 * mrBar;
  const points = series.map((p, i) => ({
    date: p.date,
    value: i === 0 ? null : Math.abs(values[i] - values[i - 1])
  }));
  return { mrBar, ucl, lcl: 0, points };
}

// ----------------------------------------------------------------------------
// Règles Western Electric (WECO)
// ----------------------------------------------------------------------------

export type WecoRule = "Règle 1" | "Règle 2" | "Règle 3" | "Règle 4";

export interface WecoViolation {
  index: number;
  date: string;
  value: number;
  rule: WecoRule;
  severity: "Critique" | "Élevée" | "Modérée";
  description: string;
}

export function detectWecoViolations(series: SpcPoint[], cl: number, sigma: number): WecoViolation[] {
  const violations: WecoViolation[] = [];
  if (sigma === 0 || series.length === 0) return violations;
  const z = series.map((p) => (p.value - cl) / sigma);

  // Règle 1 : 1 point au-delà de ±3σ
  z.forEach((zi, i) => {
    if (Math.abs(zi) > 3) {
      violations.push({
        index: i,
        date: series[i].date,
        value: series[i].value,
        rule: "Règle 1",
        severity: "Critique",
        description: `Point hors contrôle à ${zi > 0 ? "+" : ""}${zi.toFixed(2)}σ (au-delà de ±3σ)`
      });
    }
  });

  // Règle 2 : 2 points consécutifs au-delà de ±2σ (même côté)
  for (let i = 1; i < z.length; i++) {
    if ((z[i] > 2 && z[i - 1] > 2) || (z[i] < -2 && z[i - 1] < -2)) {
      violations.push({
        index: i,
        date: series[i].date,
        value: series[i].value,
        rule: "Règle 2",
        severity: "Élevée",
        description: `2 points consécutifs au-delà de ±2σ (${z[i].toFixed(2)}σ)`
      });
    }
  }

  // Règle 3 : 4 points consécutifs au-delà de ±1σ (même côté)
  for (let i = 3; i < z.length; i++) {
    const window = z.slice(i - 3, i + 1);
    if (window.every((v) => v > 1) || window.every((v) => v < -1)) {
      violations.push({
        index: i,
        date: series[i].date,
        value: series[i].value,
        rule: "Règle 3",
        severity: "Modérée",
        description: "4 points consécutifs au-delà de ±1σ"
      });
    }
  }

  // Règle 4 : 8 points consécutifs du même côté de la moyenne
  for (let i = 7; i < z.length; i++) {
    const window = z.slice(i - 7, i + 1);
    if (window.every((v) => v > 0) || window.every((v) => v < 0)) {
      violations.push({
        index: i,
        date: series[i].date,
        value: series[i].value,
        rule: "Règle 4",
        severity: "Modérée",
        description: "8 points consécutifs du même côté de la moyenne"
      });
    }
  }

  return violations.sort((a, b) => a.index - b.index);
}

// ----------------------------------------------------------------------------
// Carte CUSUM (détection de dérives lentes)
// ----------------------------------------------------------------------------

export interface CusumPoint {
  date: string;
  value: number;
  cusumPos: number;
  cusumNeg: number;
  isDrift: boolean;
}

export interface CusumResult {
  k: number;
  h: number;
  points: CusumPoint[];
  driftDetected: boolean;
}

export function computeCusum(series: SpcPoint[], target: number, sigma: number, kFactor = 0.5, hFactor = 5): CusumResult {
  const k = kFactor * sigma;
  const h = hFactor * sigma;
  let cPos = 0;
  let cNeg = 0;
  let driftDetected = false;

  const points: CusumPoint[] = series.map((p) => {
    cPos = Math.max(0, cPos + (p.value - target) - k);
    cNeg = Math.max(0, cNeg + (target - p.value) - k);
    const isDrift = h > 0 && (cPos > h || cNeg > h);
    if (isDrift) driftDetected = true;
    return { date: p.date, value: p.value, cusumPos: cPos, cusumNeg: cNeg, isDrift };
  });

  return { k, h, points, driftDetected };
}

// ----------------------------------------------------------------------------
// Carte EWMA (Exponentially Weighted Moving Average)
// ----------------------------------------------------------------------------

export interface EwmaPoint {
  date: string;
  value: number;
  ewma: number;
  ucl: number;
  lcl: number;
  isOutOfControl: boolean;
}

export interface EwmaResult {
  lambda: number;
  points: EwmaPoint[];
}

export function computeEwma(series: SpcPoint[], cl: number, sigma: number, lambda = 0.2): EwmaResult {
  let z = cl;
  const points: EwmaPoint[] = series.map((p, i) => {
    z = lambda * p.value + (1 - lambda) * z;
    const factor = Math.sqrt((lambda / (2 - lambda)) * (1 - Math.pow(1 - lambda, 2 * (i + 1))));
    const sigmaZ = sigma * factor;
    const ucl = cl + 3 * sigmaZ;
    const lcl = cl - 3 * sigmaZ;
    return { date: p.date, value: p.value, ewma: z, ucl, lcl, isOutOfControl: z > ucl || z < lcl };
  });
  return { lambda, points };
}

// ----------------------------------------------------------------------------
// Analyse de tendance (régression linéaire)
// ----------------------------------------------------------------------------

export interface TrendResult {
  slope: number;
  intercept: number;
  r2: number;
  equation: string;
  points: Array<{ date: string; value: number; trend: number }>;
}

export function computeTrend(series: SpcPoint[]): TrendResult {
  const n = series.length;
  if (n < 2) {
    return {
      slope: 0,
      intercept: series[0]?.value || 0,
      r2: 0,
      equation: "y = 0",
      points: series.map((p) => ({ ...p, trend: p.value }))
    };
  }

  const xs = series.map((_, i) => i);
  const ys = series.map((p) => p.value);
  const xMean = mean(xs);
  const yMean = mean(ys);

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += Math.pow(xs[i] - xMean, 2);
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  let ssTot = 0;
  let ssRes = 0;
  const points = series.map((p, i) => {
    const trendVal = intercept + slope * i;
    ssRes += Math.pow(p.value - trendVal, 2);
    ssTot += Math.pow(p.value - yMean, 2);
    return { date: p.date, value: p.value, trend: trendVal };
  });
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return {
    slope,
    intercept,
    r2,
    equation: `y = ${intercept.toFixed(2)} + ${slope.toFixed(3)}x`,
    points
  };
}

// ----------------------------------------------------------------------------
// Histogramme de distribution
// ----------------------------------------------------------------------------

export interface HistogramBin {
  label: string;
  min: number;
  max: number;
  count: number;
}

export function computeHistogram(values: number[], binCount = 10): HistogramBin[] {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = range / binCount;
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    label: `${(min + i * width).toFixed(1)} - ${(min + (i + 1) * width).toFixed(1)}`,
    min: min + i * width,
    max: min + (i + 1) * width,
    count: 0
  }));
  values.forEach((v) => {
    let idx = Math.floor((v - min) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  });
  return bins;
}

// ----------------------------------------------------------------------------
// Moteur de diagnostic automatique (bonus)
// ----------------------------------------------------------------------------

export interface DiagnosticResult {
  tag: string;
  message: string;
  severity: "info" | "warning" | "danger" | "critical";
}

export function runDiagnostics(params: {
  cv: number;
  wecoViolationsCount: number;
  outOfControlCount: number;
  trendSlope: number;
  trendR2: number;
  cusumDrift: boolean;
  averageDeviationPercent: number;
  distinctEngineCount: number;
  observationsCount: number;
}): DiagnosticResult[] {
  const {
    cv,
    wecoViolationsCount,
    outOfControlCount,
    trendSlope,
    trendR2,
    cusumDrift,
    averageDeviationPercent,
    distinctEngineCount,
    observationsCount
  } = params;

  const results: DiagnosticResult[] = [];

  if (observationsCount < 5) {
    results.push({
      tag: "DONNEES_INSUFFISANTES",
      message: "Données insuffisantes pour un diagnostic statistique fiable (moins de 5 observations).",
      severity: "info"
    });
    return results;
  }

  if (outOfControlCount === 0 && wecoViolationsCount === 0 && cv < 15) {
    results.push({
      tag: "NORMAL",
      message: "Consommation normale : le processus est sous contrôle statistique.",
      severity: "info"
    });
  }

  if (cv >= 15 && cv < 25) {
    results.push({
      tag: "INSTABLE_LEGER",
      message: "Consommation légèrement instable : variabilité modérée détectée (coefficient de variation entre 15% et 25%).",
      severity: "warning"
    });
  }

  if (cv >= 25) {
    results.push({
      tag: "INSTABLE_FORT",
      message: "Variabilité élevée de la consommation (coefficient de variation ≥ 25%) : vérifier les conditions d'exploitation.",
      severity: "warning"
    });
  }

  if (trendSlope > 0 && trendR2 > 0.3) {
    results.push({
      tag: "DERIVE_PROGRESSIVE",
      message: "Dérive progressive détectée : tendance à la hausse significative de la consommation dans le temps.",
      severity: "warning"
    });
  }

  if (averageDeviationPercent > 40) {
    results.push({
      tag: "SURCONSOMMATION",
      message: "Surconsommation importante détectée (écart moyen supérieur à 40% par rapport à la norme).",
      severity: "danger"
    });
  }

  if (cusumDrift && trendSlope > 0) {
    results.push({
      tag: "FUITE_PROBABLE",
      message: "Dérive lente et continue confirmée par la carte CUSUM : fuite de carburant ou dérèglement mécanique probable.",
      severity: "critical"
    });
  }

  if (outOfControlCount === 1 && wecoViolationsCount <= 1 && Math.abs(trendSlope) < 0.01) {
    results.push({
      tag: "ERREUR_SAISIE",
      message: "Anomalie isolée sans tendance associée : possible erreur de saisie (compteur ou quantité).",
      severity: "info"
    });
  }

  if (distinctEngineCount > 1 && cv >= 25) {
    results.push({
      tag: "GROUPE_INSTABLE",
      message: "Groupe d'engins instable : forte hétérogénéité des consommations au sein de la sélection.",
      severity: "warning"
    });
  } else if (distinctEngineCount > 1 && cv < 15 && outOfControlCount === 0) {
    results.push({
      tag: "GROUPE_SOUS_CONTROLE",
      message: "Groupe d'engins sous contrôle : consommations homogènes et stables.",
      severity: "info"
    });
  }

  if (results.length === 0) {
    results.push({
      tag: "SURVEILLANCE",
      message: "Processus sous surveillance : aucune anomalie critique détectée mais à suivre.",
      severity: "info"
    });
  }

  return results;
}

// ----------------------------------------------------------------------------
// Niveau d'alerte global (bandeau de synthèse)
// ----------------------------------------------------------------------------

export type GlobalAlertLevel = "Vert" | "Orange" | "Rouge" | "Rouge foncé";

export function computeGlobalAlertLevel(params: {
  outOfControlCount: number;
  wecoViolationsCount: number;
  cusumDrift: boolean;
  ewmaOutOfControlCount: number;
}): GlobalAlertLevel {
  const { outOfControlCount, wecoViolationsCount, cusumDrift, ewmaOutOfControlCount } = params;
  if (cusumDrift || ewmaOutOfControlCount > 0) return "Rouge foncé";
  if (outOfControlCount > 0) return "Rouge";
  if (wecoViolationsCount > 0) return "Orange";
  return "Vert";
}
