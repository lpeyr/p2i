import "server-only";
import { query } from "@/lib/db";
import totalDistanceMeters from "@/lib/distance";

export interface Overview {
    totalSteps: number;
    activeTimeSeconds: number; // unité: secondes
    caloriesKcal: number;
    distanceMeters: null | number; // placeholder, non calculée pour l'instant
}

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

    // flexi totals and counts intentionally omitted for dashboard overview

    // calories estimation from steps (simple estimate)
    // approximation: ~0.05 kcal per step (varie selon poids/vitesse)
    const caloriesKcal = Number((totalSteps * 0.05).toFixed(2));

    // Récupérer les mesures GPS à partir de la date fournie
    // colonnes dans la BDD: `lattitude` et `longitude` (attention à l'orthographe)
    const gpsRows = await query<{ lattitude: number; longitude: number }[]>(
        `SELECT lattitude, longitude FROM MesureGPS WHERE time >= ? ORDER BY time ASC`,
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
