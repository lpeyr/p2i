import { query, Session } from "@/lib/db";

interface GpsPoint {
    lat: number;
    lon: number;
}

interface SemelleStats {
    flexi1: boolean[];
    flexi2: boolean[];
    flexi3: boolean[];
    accelerations: number[];
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

export interface SessionOverview {
    idSession: number;
    dateDebut: string; // ISO
    dateFin: string | null; // ISO
    durationSeconds: number;
    step: number;
    distanceMeters: number;
}

import totalDistanceMeters from "@/lib/distance";

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

        const imuRows = await query<Array<{ accel: number }>>(
            "SELECT accel FROM MesureIMU WHERE idSession = ? AND idSemelle = ? ORDER BY time, id",
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
            accelerations: imuRows.map((r) => Number(r.accel)),
            gps: gpsRows
                .filter(
                    (r) =>
                        r.lattitude !== null &&
                        r.longitude !== null &&
                        Number.isFinite(Number(r.lattitude)) &&
                        Number.isFinite(Number(r.longitude)),
                )
                .map((r) => ({ lat: Number(r.lattitude), lon: Number(r.longitude) })),
        };
    };

    return {
        semelle1: await getSemelleStats(session.semelle1),
        semelle2: await getSemelleStats(session.semelle2),
    };
}

export default getSessionStatsImpl;
