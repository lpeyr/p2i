import getSessionStatsImpl, {
    getAllSessions,
    getSession,
    getSessionUIState,
    SessionOverview,
    startSession,
    stopSession,
} from "@/actions/session";
import { getSemellesFromUser } from "@/actions/user";
import ActivityClient from "./ActivityClient";

export const dynamic = "force-dynamic";
export default async function ActivityPage() {
    try {
        // logic côté serveur : récupérer les sessions et l'état depuis la BD
        const sessions: SessionOverview[] = await getAllSessions();

        const uiState = await getSessionUIState();
        const canStart = !uiState.hasActiveSession;
        const canStop = uiState.hasActiveSession;

        // last session id from DB
        const lastSessionId = uiState.lastSessionId;

        // déterminer semelle1/2 pour création de session :
        let semelle1: number | null = null;
        let semelle2: number | null = null;

        if (lastSessionId) {
            const full = await getSession(lastSessionId);
            semelle1 = full?.semelle1 ?? null;
            semelle2 = full?.semelle2 ?? null;
        }

        if (!semelle1 || !semelle2) {
            // fallback : récupérer les semelles de l'utilisateur 1
            const sems = await getSemellesFromUser(1);
            if (sems && sems.length >= 1) semelle1 = sems[0].idSemelle;
            if (sems && sems.length >= 2) semelle2 = sems[1].idSemelle ?? semelle1;
        }

        // charger les dernières infos de flexiforce pour la session chargée
        let initialActivityData = undefined;
        if (lastSessionId) {
            try {
                const stats = await getSessionStatsImpl(lastSessionId);
                const left = stats.semelle1;
                const right = stats.semelle2;
                // compter les appuis par zone (nombre de true dans chaque index)
                const leftCounts = [0, 0, 0];
                const rightCounts = [0, 0, 0];
                for (let i = 0; i < Math.min(left.flexi1.length, 1000000); i++) {
                    leftCounts[0] += left.flexi1[i] ? 1 : 0;
                    leftCounts[1] += left.flexi2[i] ? 1 : 0;
                    leftCounts[2] += left.flexi3[i] ? 1 : 0;
                }
                for (let i = 0; i < Math.min(right.flexi1.length, 1000000); i++) {
                    rightCounts[0] += right.flexi1[i] ? 1 : 0;
                    rightCounts[1] += right.flexi2[i] ? 1 : 0;
                    rightCounts[2] += right.flexi3[i] ? 1 : 0;
                }

                // trouver les métadonnées dans sessions list
                const sessionOverview = sessions.find((s) => s.idSession === lastSessionId);

                initialActivityData = {
                    steps: sessionOverview?.step ?? 0,
                    duration: sessionOverview?.durationSeconds ?? 0,
                    startTime: sessionOverview?.dateDebut ?? new Date().toISOString(),
                    leftFootContacts: leftCounts as [number, number, number],
                    rightFootContacts: rightCounts as [number, number, number],
                    speed: 0,
                };
            } catch {
                // ignore stats errors
                initialActivityData = undefined;
            }
        }

        return (
            <ActivityClient
                sessions={sessions}
                canStart={canStart}
                canStop={canStop}
                lastSessionId={lastSessionId}
                semelle1={semelle1}
                semelle2={semelle2}
                startAction={startAction}
                stopAction={stopAction}
            />
        );
    } catch (error) {
        return <Error error={error as Error} />;
    }
}
// server actions pour démarrer / arrêter
async function startAction(formData: FormData) {
    "use server";
    const s1 = Number(formData.get("semelle1"));
    const s2 = Number(formData.get("semelle2"));
    if (!s1 || !s2) return;
    await startSession(s1, s2);
}

async function stopAction(formData: FormData) {
    "use server";
    const id = Number(formData.get("idSession"));
    if (!id) return;
    await stopSession(id);
}
