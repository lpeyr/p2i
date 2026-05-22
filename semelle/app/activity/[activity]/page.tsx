import { notFound } from "next/navigation";
import { query, type Semelle } from "@/lib/db";
import totalDistanceMeters from "@/lib/distance";
import getSessionStats, { getSession } from "@/actions/session";
import ActivityView, { type ActivityViewProps, type FootContactValues } from "./ActivityView";

export const dynamic = "force-dynamic";

interface ReadOnlyActivityPageProps {
    params: Promise<{ activity: string }>;
}

interface SessionGpsRow {
    lattitude: number | null;
    longitude: number | null;
}

type SessionStats = Awaited<ReturnType<typeof getSessionStats>>;

function parseActivityId(value: string) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getDurationSeconds(start: Date, end: Date | null) {
    return Math.max(0, Math.floor(((end ?? new Date()).getTime() - start.getTime()) / 1000));
}

function toContacts(stats: SessionStats["semelle1"]): FootContactValues {
    return [
        stats.flexi1.filter(Boolean).length,
        stats.flexi2.filter(Boolean).length,
        stats.flexi3.filter(Boolean).length,
    ];
}

function buildRoute(gpsRows: SessionGpsRow[]) {
    return gpsRows
        .map((row) => [Number(row.lattitude), Number(row.longitude)] as [number, number])
        .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
}

export default async function ReadOnlyActivityPage({
    params,
}: Readonly<ReadOnlyActivityPageProps>) {
    const resolvedParams = await params;
    const activityId = parseActivityId(resolvedParams.activity);
    if (!activityId) {
        notFound();
    }

    const session = await getSession(activityId);
    if (!session) {
        notFound();
    }

    const [semelleStats, semelles, gpsRows] = await Promise.all([
        getSessionStats(activityId),
        query<Semelle[]>("SELECT * FROM Semelle WHERE idSemelle IN (?, ?) ORDER BY idSemelle", [
            session.semelle1,
            session.semelle2,
        ]),
        query<SessionGpsRow[]>(
            `SELECT lattitude, longitude FROM MesureGPS WHERE idSession = ? AND lattitude IS NOT NULL AND longitude IS NOT NULL ORDER BY time, idMesure`,
            [activityId],
        ),
    ]);

    const sessionStart = new Date(session.dateDebut);
    const sessionEnd = session.dateFin ? new Date(session.dateFin) : null;
    if (
        Number.isNaN(sessionStart.getTime()) ||
        (sessionEnd !== null && Number.isNaN(sessionEnd.getTime()))
    ) {
        notFound();
    }

    const semelleBySide = new Map(semelles.map((semelle) => [semelle.side, semelle] as const));
    const leftSemelle = semelleBySide.get("left") ?? semelles[0];
    const rightSemelle = semelleBySide.get("right") ?? semelles[1];

    const leftContacts = toContacts(
        session.semelle1 === leftSemelle?.idSemelle ? semelleStats.semelle1 : semelleStats.semelle2,
    );
    const rightContacts = toContacts(
        session.semelle1 === rightSemelle?.idSemelle
            ? semelleStats.semelle1
            : semelleStats.semelle2,
    );

    const route = buildRoute(gpsRows);
    const safeRoute: [number, number][] = route.length > 0 ? route : [[45.782562, 4.872407]];
    const distanceMeters = totalDistanceMeters(safeRoute.map(([lat, lon]) => ({ lat, lon })));
    const durationSeconds = getDurationSeconds(sessionStart, sessionEnd);
    const speedKmh = durationSeconds > 0 ? distanceMeters / 1000 / (durationSeconds / 3600) : 0;

    const props: ActivityViewProps = {
        activityId,
        sessionStartIso: sessionStart.toISOString(),
        sessionEndIso: sessionEnd?.toISOString() ?? null,
        steps: Number(session.step ?? 0),
        durationSeconds,
        route: safeRoute,
        leftContacts,
        rightContacts,
        leftHasActivity: leftContacts.some((value) => value > 0),
        rightHasActivity: rightContacts.some((value) => value > 0),
        distanceMeters,
        speedKmh,
    };

    return <ActivityView {...props} />;
}
