import { History } from "./History";
import { getAllSessions } from "@/actions/session";
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
    const sessions = await getAllSessions();

    const activities = sessions.map((s) => ({
        id: String(s.idSession),
        date: s.dateDebut,
        duration: s.durationSeconds,
        distance: Number((s.distanceMeters / 1000).toFixed(2)),
        steps: s.step,
        calories: Math.round((s.step ?? 0) * 0.05),
        avgSpeed:
            s.durationSeconds && s.durationSeconds > 0
                ? Number((s.distanceMeters / 1000 / (s.durationSeconds / 3600)).toFixed(1))
                : 0,
    }));

    return <History activities={activities} />;
}
