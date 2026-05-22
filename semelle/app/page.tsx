import { getUser } from "@/actions/user";
import Home, { type HomeProps } from "@/components/home";
import { getOverview, getSemellesStats } from "@/actions/stats";

export default async function HomePage() {
    const user = await getUser(1);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const now = new Date();

    const [overview, semelleStats] = await Promise.all([
        getOverview(todayStart),
        getSemellesStats(todayStart, now),
    ]);

    const semelles = semelleStats.map((stat) => ({
        id: stat.semelle.idSemelle,
        side: stat.semelle.side,
        name:
            stat.semelle.side === "left"
                ? `Semelle Gauche (#${stat.semelle.idSemelle})`
                : `Semelle Droite (#${stat.semelle.idSemelle})`,
        active: stat.lastTimeActive !== null,
        steps: stat.step,
        distanceKm: Number((stat.distance / 1000).toFixed(2)),
        caloriesKcal: Number(stat.calories.toFixed(2)),
        lastTimeActive: stat.lastTimeActive?.toISOString() ?? null,
    }));

    const homeProps: HomeProps = { userName: user.prenom, overview, semelles };

    return <Home {...homeProps} />;
}
