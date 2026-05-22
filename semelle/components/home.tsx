"use client";

import { Alert, Button, Card, CardHeader, Separator } from "@heroui/react";
import { Moon, Sun } from "@gravity-ui/icons";
import { useTheme } from "next-themes";
import Link from "next/link";
import type { Overview } from "@/actions/stats";

export interface HomeProps {
    userName: string;
    overview: Overview;
    semelles: HomeSemelle[];
}

interface HomeSemelle {
    id: number;
    side: "left" | "right";
    name: string;
    active: boolean;
    steps: number;
    distanceKm: number;
    caloriesKcal: number;
    lastTimeActive: string | null;
}

export default function Home({ userName, overview, semelles }: Readonly<HomeProps>) {
    const { theme, setTheme } = useTheme();

    const formatActiveTime = (seconds: number) => {
        if (seconds < 3600) {
            return `${Math.floor(seconds / 60)} min`;
        }
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours} h ${minutes} min`;
    };

    const formatDistance = (meters: number | null) => {
        if (meters === null) return "--";
        return `${(meters / 1000).toFixed(2)} km`;
    };

    const leftSemelle = semelles.find((semelle) => semelle.side === "left");
    const rightSemelle = semelles.find((semelle) => semelle.side === "right");
    const leftSteps = leftSemelle?.steps ?? 0;
    const rightSteps = rightSemelle?.steps ?? 0;
    const maxSteps = Math.max(leftSteps, rightSteps, 0);
    const stepGap = Math.abs(leftSteps - rightSteps);
    const asymmetryPercent = maxSteps > 0 ? (stepGap / maxSteps) * 100 : 0;
    const isBalanced = asymmetryPercent < 10;
    const hasRecentActivity = semelles.some((semelle) => semelle.active) || overview.totalSteps > 0;

    const stats = [
        {
            id: "steps",
            label: "Pas aujourd'hui",
            value: overview.totalSteps.toLocaleString("fr-FR"),
        },
        {
            id: "distance",
            label: "Distance",
            value: formatDistance(overview.distanceMeters),
        },
        {
            id: "active",
            label: "Temps actif",
            value: formatActiveTime(overview.activeTimeSeconds),
        },
        {
            id: "calories",
            label: "Calories brûlées",
            value: `${overview.caloriesKcal.toLocaleString("fr-FR")} kcal`,
        },
    ];
    return (
        <main className="min-h-screen p-8">
            <div className="mx-auto max-w-6xl space-y-8">
                <section className="flex items-start justify-between">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold">Bienvenue sur Semelle, {userName}</h1>
                        <p className="text-muted-foreground text-lg">
                            Analysez et optimisez votre marche avec vos semelles intelligentes
                        </p>
                    </div>
                    <Button
                        isIconOnly
                        variant="secondary"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        aria-label={theme === "dark" ? "Mode clair" : "Mode sombre"}
                    >
                        {theme === "dark" ? <Sun /> : <Moon />}
                    </Button>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">État des Semelles</h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        {semelles.map((semelle) => (
                            <Card
                                key={semelle.id}
                                className="border-separator overflow-hidden border transition-shadow hover:shadow-md"
                            >
                                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div
                                                className={`absolute inset-0 animate-pulse rounded-full opacity-75 ${semelle.active ? "bg-success" : "bg-warning"}`}
                                            ></div>
                                            <div
                                                className={`relative h-3 w-3 rounded-full ${semelle.active ? "bg-success" : "bg-warning"}`}
                                            ></div>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold">
                                                {semelle.name}
                                            </h3>
                                            <p
                                                className={`text-xs font-medium ${semelle.active ? "text-success" : "text-warning"}`}
                                            >
                                                {semelle.active
                                                    ? "Activité récente"
                                                    : "Aucune activité récente"}
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <Separator />
                                <div className="flex flex-col">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-3">
                                        <div className="p-2">
                                            <p className="text-muted-foreground mb-1 text-xs font-medium">
                                                Pas
                                            </p>
                                            <p className="text-lg font-bold">
                                                {semelle.steps.toLocaleString("fr-FR")}
                                            </p>
                                        </div>
                                        <div className="p-2">
                                            <p className="text-muted-foreground mb-1 text-xs font-medium">
                                                Distance
                                            </p>
                                            <p className="text-lg font-bold">
                                                {semelle.distanceKm.toFixed(2)} km
                                            </p>
                                        </div>
                                        <div className="p-2">
                                            <p className="text-muted-foreground mb-1 text-xs font-medium">
                                                Calories
                                            </p>
                                            <p className="text-lg font-bold">
                                                {semelle.caloriesKcal.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* Dashboard Stats */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Tableau de Bord</h2>
                    <div className="grid gap-4 md:grid-cols-4">
                        {stats.map((stat) => (
                            <Card key={stat.id} className="border-separator bg-surface border">
                                <div className="gap-2 p-6">
                                    <p className="text-muted-foreground text-sm font-medium">
                                        {stat.label}
                                    </p>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* Health Issues Detection */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Détection de Problèmes</h2>
                    <div className="space-y-3">
                        <Alert status={hasRecentActivity ? "success" : "warning"}>
                            <Alert.Indicator />
                            <Alert.Content>
                                <Alert.Title>
                                    {hasRecentActivity
                                        ? "Activité détectée aujourd'hui"
                                        : "Aucune activité détectée aujourd'hui"}
                                </Alert.Title>
                                <Alert.Description>
                                    {overview.totalSteps.toLocaleString("fr-FR")} pas,{" "}
                                    {formatDistance(overview.distanceMeters)} parcourus et{" "}
                                    {formatActiveTime(overview.activeTimeSeconds)} de temps actif.
                                </Alert.Description>
                            </Alert.Content>
                        </Alert>
                        <Alert status={isBalanced ? "success" : "warning"}>
                            <Alert.Indicator />
                            <Alert.Content>
                                <Alert.Title>
                                    {isBalanced ? "Répartition équilibrée" : "Asymétrie détectée"}
                                </Alert.Title>
                                <Alert.Description>
                                    {leftSemelle && rightSemelle
                                        ? `Gauche : ${leftSteps.toLocaleString("fr-FR")} pas · Droite : ${rightSteps.toLocaleString("fr-FR")} pas · Écart : ${stepGap.toLocaleString("fr-FR")} pas.`
                                        : "Données insuffisantes pour comparer les deux semelles."}
                                </Alert.Description>
                            </Alert.Content>
                        </Alert>
                        <Alert status={overview.activeTimeSeconds >= 1800 ? "success" : "warning"}>
                            <Alert.Indicator />
                            <Alert.Content>
                                <Alert.Title>
                                    {overview.activeTimeSeconds >= 1800
                                        ? "Temps actif satisfaisant"
                                        : "Temps actif à renforcer"}
                                </Alert.Title>
                                <Alert.Description>
                                    {overview.activeTimeSeconds >= 1800
                                        ? "Vous avez déjà accumulé une bonne durée de marche aujourd'hui."
                                        : "L'activité du jour reste limitée, pensez à marcher davantage si possible."}
                                </Alert.Description>
                            </Alert.Content>
                        </Alert>
                    </div>
                </section>

                {/* Quick Actions */}
                <section className="space-y-4">
                    <div className="flex gap-3">
                        <Link href="/activity">
                            <Button>Commencer une Session</Button>
                        </Link>
                        <Link href="/history">
                            <Button variant="outline">Voir l&apos;Historique</Button>
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
