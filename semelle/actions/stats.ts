import "server-only";
import { query, Semelle } from "@/lib/db";
import totalDistanceMeters from "@/lib/distance";
import { getSemellesFromUser } from "@/actions/user";

export interface Overview {
    totalSteps: number;
    activeTimeSeconds: number; // unité: secondes
    caloriesKcal: number;
    distanceMeters: null | number; // placeholder, non calculée pour l'instant
}

const ESTIMATED_CALORIES_PER_STEP = 0.05;
const ESTIMATED_DISTANCE_PER_STEP_METERS = 0.75;

/**
 * Récupère les statistiques globales depuis la base de données.
 * - activeTime est renvoyé en secondes
 * - calories calculées à partir du nombre total de pas (estimation)
 * - distance renvoyée en `null` (placeholder)
 */
function formatDateTime(d: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
        d.getFullYear() +
        "-" +
        pad(d.getMonth() + 1) +
        "-" +
        pad(d.getDate()) +
        " " +
        pad(d.getHours()) +
        ":" +
        pad(d.getMinutes()) +
        ":" +
        pad(d.getSeconds())
    );
}

function assertValidDate(date: Date, label: string) {
    if (Number.isNaN(date.getTime())) {
        throw new TypeError(`Invalid date passed to ${label}`);
    }
}

function normalizeDateTime(value: unknown): Date | null {
    if (value === null || value === undefined || value === "") return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value !== "string" && typeof value !== "number") return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function estimateCaloriesFromSteps(steps: number): number {
    return Number((steps * ESTIMATED_CALORIES_PER_STEP).toFixed(2));
}

function estimateDistanceFromSteps(steps: number): number {
    return Number((steps * ESTIMATED_DISTANCE_PER_STEP_METERS).toFixed(2));
}

async function getSemelleStepTotal(
    semelleId: number,
    startSql: string,
    endSql: string,
): Promise<number> {
    const rows = await query<{ total_steps: number }[]>(
        `SELECT COALESCE(SUM(COALESCE(step, 0)), 0) AS total_steps
         FROM Session
         WHERE (semelle1 = ? OR semelle2 = ?)
           AND dateDebut <= ?
           AND COALESCE(dateFin, ?) >= ?`,
        [semelleId, semelleId, endSql, endSql, startSql],
    );

    return Number(rows?.[0]?.total_steps ?? 0);
}

async function getSemelleLastActivity(
    semelleId: number,
    startSql: string,
    endSql: string,
): Promise<Date | null> {
    const rows = await query<{ last_activity: Date | string | null }[]>(
        `SELECT MAX(last_activity) AS last_activity
         FROM (
             SELECT COALESCE(dateFin, ?) AS last_activity
             FROM Session
             WHERE (semelle1 = ? OR semelle2 = ?)
               AND dateDebut <= ?
               AND COALESCE(dateFin, ?) >= ?
             UNION ALL
             SELECT time AS last_activity
             FROM MesureGPS
             WHERE idSemelle = ?
               AND time BETWEEN ? AND ?
             UNION ALL
             SELECT time AS last_activity
             FROM MesureFlexi
             WHERE idSemelle = ?
               AND time BETWEEN ? AND ?
             UNION ALL
             SELECT time AS last_activity
             FROM MesureAccel
             WHERE idSemelle = ?
               AND time BETWEEN ? AND ?
         ) AS activity_times`,
        [
            endSql,
            semelleId,
            semelleId,
            endSql,
            endSql,
            startSql,
            semelleId,
            startSql,
            endSql,
            semelleId,
            startSql,
            endSql,
            semelleId,
            startSql,
            endSql,
        ],
    );

    return normalizeDateTime(rows?.[0]?.last_activity ?? null);
}

async function getSemelleStat(
    semelle: Semelle,
    startSql: string,
    endSql: string,
): Promise<SemelleStat> {
    const step = await getSemelleStepTotal(semelle.idSemelle, startSql, endSql);
    const distance = estimateDistanceFromSteps(step);
    const calories = estimateCaloriesFromSteps(step);
    const lastTimeActive = await getSemelleLastActivity(semelle.idSemelle, startSql, endSql);

    return { semelle, step, distance, calories, lastTimeActive };
}

/**
 * Récupère les statistiques globales depuis la base de données, à partir d'une date donnée.
 * @param since Date ou chaîne parsable représentant la borne inférieure (inclusive)
 */
export async function getOverview(since: string | Date): Promise<Overview> {
    const sinceDate = typeof since === "string" ? new Date(since) : since;
    if (Number.isNaN(sinceDate.getTime())) {
        throw new TypeError("Invalid date passed to getOverview");
    }
    const sinceSql = formatDateTime(sinceDate);
    // total steps (somme de la colonne `step` des sessions)
    const stepsRows = await query<{ total_steps: number }[]>(
        `SELECT COALESCE(SUM(step), 0) AS total_steps FROM Session WHERE dateDebut >= ?`,
        [sinceSql],
    );
    const totalSteps = Number(stepsRows?.[0]?.total_steps ?? 0);

    // active time: somme des durées (dateFin - dateDebut) en secondes
    const activeRows = await query<{ active_seconds: number }[]>(
        `SELECT COALESCE(SUM(TIMESTAMPDIFF(SECOND, dateDebut, COALESCE(dateFin, NOW()))), 0) AS active_seconds FROM Session WHERE dateDebut >= ?`,
        [sinceSql],
    );
    const activeTimeSeconds = Number(activeRows?.[0]?.active_seconds ?? 0);

    // calories estimation from steps (simple estimate)
    // approximation: ~0.05 kcal per step (varie selon poids/vitesse)
    const caloriesKcal = Number((totalSteps * 0.05).toFixed(2));

    // Récupérer les mesures GPS à partir de la date fournie
    // colonnes dans la BDD: `lattitude` et `longitude` (attention à l'orthographe)
    const gpsRows = await query<{ lattitude: number; longitude: number }[]>(
        `SELECT lattitude, longitude FROM MesureGPS WHERE time >= ? ORDER BY time`,
        [sinceSql],
    );

    const points = (gpsRows || [])
        .map((r) => ({ lat: Number(r.lattitude), lon: Number(r.longitude) }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));

    const distanceMeters = totalDistanceMeters(points);

    return {
        totalSteps,
        activeTimeSeconds,
        caloriesKcal,
        distanceMeters,
    };
}

interface SemelleStat {
    semelle: Semelle;
    step: number;
    calories: number;
    distance: number;
    lastTimeActive: Date | null;
}

async function getSemellesStatsImpl(dateStart: Date, dateEnd: Date): Promise<SemelleStat[]> {
    assertValidDate(dateStart, "getSemellesStats(dateStart)");
    assertValidDate(dateEnd, "getSemellesStats(dateEnd)");
    if (dateEnd.getTime() < dateStart.getTime()) {
        throw new RangeError("dateEnd must be greater than or equal to dateStart");
    }

    const userId = 1;
    const semelles = await getSemellesFromUser(userId);
    if (!semelles.length) return [];

    const startSql = formatDateTime(dateStart);
    const endSql = formatDateTime(dateEnd);

    return Promise.all(semelles.map((semelle) => getSemelleStat(semelle, startSql, endSql)));
}

export { getSemellesStatsImpl as getSemellesStats };
