import { query, Session } from "@/lib/db";
import totalDistanceMeters from "@/lib/distance";

interface GpsPoint {
    lat: number;
    lon: number;
}

export interface Acceleration {
    value: number;
    timestamp: Date;
}

interface SemelleStats {
    flexi1: boolean[];
    flexi2: boolean[];
    flexi3: boolean[];
    accelerations: Acceleration[];
    gps: GpsPoint[];
}

interface SessionStatsBySemelle {
    semelle1: SemelleStats;
    semelle2: SemelleStats;
}

type FlexiRow = { flexi1: boolean | 0 | 1; flexi2: boolean | 0 | 1; flexi3: boolean | 0 | 1 };

export async function getSession(id: number): Promise<Session> {
    return (await query<Session[]>("SELECT * FROM Session WHERE idSession = ?", [id]))[0];
}

export async function getSessionUIState(): Promise<{
    hasActiveSession: boolean;
    activeSessionId: number | null;
    lastSessionId: number | null;
}> {
    // active session (dateFin IS NULL)
    const activeRows = await query<Array<{ idSession: number }>>(
        `SELECT idSession FROM Session WHERE dateFin IS NULL ORDER BY dateDebut DESC LIMIT 1`,
    );
    const lastRows = await query<Array<{ idSession: number }>>(
        `SELECT idSession FROM Session ORDER BY dateDebut DESC LIMIT 1`,
    );
    const hasActiveSession = (activeRows && activeRows.length > 0) || false;
    const activeSessionId = hasActiveSession ? Number(activeRows[0].idSession) : null;
    const lastSessionId = lastRows && lastRows.length > 0 ? Number(lastRows[0].idSession) : null;
    return { hasActiveSession, activeSessionId, lastSessionId };
}

export interface SessionOverview {
    idSession: number;
    dateDebut: string; // ISO
    dateFin: string | null; // ISO
    durationSeconds: number;
    step: number;
    distanceMeters: number;
}

export async function getAllSessions(): Promise<SessionOverview[]> {
    const rows = await query<
        Array<{
            idSession: number;
            dateDebut: string;
            dateFin: string | null;
            step: number | null;
            duration_seconds: number;
        }>
    >(
        `SELECT idSession, dateDebut, dateFin, step, TIMESTAMPDIFF(SECOND, dateDebut, COALESCE(dateFin, NOW())) as duration_seconds FROM Session ORDER BY dateDebut DESC`,
    );

    if (!rows) return [];

    const result: SessionOverview[] = [];

    for (const r of rows) {
        const gpsRows = await query<Array<{ lattitude: number | null; longitude: number | null }>>(
            `SELECT lattitude, longitude FROM MesureGPS WHERE idSession = ? ORDER BY time, idMesure`,
            [r.idSession],
        );

        const points = (gpsRows || [])
            .filter((g) => g.lattitude !== null && g.longitude !== null)
            .map((g) => ({ lat: Number(g.lattitude), lon: Number(g.longitude) }));

        const distanceMeters = totalDistanceMeters(points);

        result.push({
            idSession: r.idSession,
            dateDebut: new Date(r.dateDebut).toISOString(),
            dateFin: r.dateFin ? new Date(r.dateFin).toISOString() : null,
            durationSeconds: Number(r.duration_seconds ?? 0),
            step: Number(r.step ?? 0),
            distanceMeters,
        });
    }

    return result;
}

async function getSessionStatsImpl(sessionId: number): Promise<SessionStatsBySemelle> {
    const session = await getSession(sessionId);
    if (!session) {
        throw new TypeError(`Session ${sessionId} not found`);
    }

    const getSemelleStats = async (semelleId: number): Promise<SemelleStats> => {
        const flexiRows = await query<FlexiRow[]>(
            "SELECT flexi1, flexi2, flexi3 FROM MesureFlexi WHERE idSession = ? AND idSemelle = ? ORDER BY time, idMesureFlexi",
            [sessionId, semelleId],
        );

        const imuRows = await query<Array<{ accel: number; time: Date }>>(
            "SELECT accel, time FROM MesureAccel WHERE idSession = ? AND idSemelle = ? ORDER BY time, idMesureAccel",
            [sessionId, semelleId],
        );

        const gpsRows = await query<Array<{ lattitude: number | null; longitude: number | null }>>(
            "SELECT lattitude, longitude FROM MesureGPS WHERE idSession = ? AND idSemelle = ? ORDER BY time, idMesure",
            [sessionId, semelleId],
        );

        return {
            flexi1: flexiRows.map((r) => r.flexi1 === true || r.flexi1 === 1),
            flexi2: flexiRows.map((r) => r.flexi2 === true || r.flexi2 === 1),
            flexi3: flexiRows.map((r) => r.flexi3 === true || r.flexi3 === 1),
            accelerations: imuRows.map((r) => ({
                value: Number(r.accel),
                timestamp: r.time,
            })),
            gps: await getElevations(
                gpsRows
                    .filter(
                        (r) =>
                            r.lattitude !== null &&
                            r.longitude !== null &&
                            Number.isFinite(Number(r.lattitude)) &&
                            Number.isFinite(Number(r.longitude)),
                    )
                    .map((r) => ({ lat: Number(r.lattitude), lon: Number(r.longitude) })),
            ),
        };
    };

    return {
        semelle1: await getSemelleStats(session.semelle1),
        semelle2: await getSemelleStats(session.semelle2),
    };
}

export async function startSession(semelle1: number, semelle2: number) {
    await query(
        "INSERT INTO Session (dateDebut, semelle1, semelle2, step) VALUES (NOW(), ?, ?, 0)",
        [semelle1, semelle2],
    );
}

export async function stopSession(idSession: number) {
    await query("UPDATE Session SET dateFin = NOW() WHERE idSession = ?", [idSession]);
}

export async function getElevations(points: Omit<GpsPoint, "alt">[]): Promise<GpsPoint[]> {
    try {
        const response = await fetch("https://api.open-elevation.com/api/v1/lookup", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                locations: points.map((p) => ({
                    latitude: p.lat,
                    longitude: p.lon,
                })),
            }),
        });

        if (!response.ok) {
            throw new Error(`Elevation API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.results.map((p) => ({ lat: p.latitude, lon: p.longitude, alt: p.elevation }));
    } catch {
        return points.map((p) => ({ ...p, alt: 0 }));
    }
}

export default getSessionStatsImpl;
