import { getUser } from "@/actions/user";
import Home from "@/components/home";
import { getOverview } from "@/actions/stats";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const user = await getUser(1);
    // stats du jour
    const overview = await getOverview(new Date(new Date().setHours(0, 0, 0, 0)));
    return <Home userName={user.prenom} overview={overview} />;
}
