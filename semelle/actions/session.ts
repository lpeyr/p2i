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

export async function getSessionStats(sessionId: number): Promise<SessionStatsBySemelle> {
    const session = await getSession(sessionId);
    if (!session) {
        throw new TypeError(`Session ${sessionId} not found`);
    }

    const getSemelleStats = async (semelleId: number): Promise<SemelleStats> => {
        const flexiRows = await query<FlexiRow[]>(
            "SELECT flexi1, flexi2, flexi3 FROM MesureFlexi WHERE idSession = ? AND idSemelle = ? ORDER BY time ASC, idMesureFlexi ASC",
            [sessionId, semelleId],
        );

        const imuRows = await query<Array<{ accel: number }>>(
            "SELECT accel FROM MesureIMU WHERE idSession = ? AND idSemelle = ? ORDER BY time ASC, id ASC",
            [sessionId, semelleId],
        );

        const gpsRows = await query<Array<{ lattitude: number | null; longitude: number | null }>>(
            "SELECT lattitude, longitude FROM MesureGPS WHERE idSession = ? AND idSemelle = ? ORDER BY time ASC, idMesure ASC",
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
