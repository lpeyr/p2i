"use client";

import { Alert, Button, Card, CardHeader, Chip, Separator } from "@heroui/react";
import { Moon, Sun } from "@gravity-ui/icons";
import { useTheme } from "next-themes";
import Link from "next/link";

export default function Home() {
    const { theme, setTheme } = useTheme();

    const semelles = [
        {
            id: "left",
            name: "Semelle Gauche",
            active: true,
            steps: 4215,
            distance: 2.6,
            calories: 160,
        },
        {
            id: "right",
            name: "Semelle Droite",
            active: true,
            steps: 4217,
            distance: 2.6,
            calories: 165,
        },
    ];
    const stats = [
        {
            id: "steps",
            label: "Pas aujourd'hui",
            value: "8,432",
            trend: "↑ +2.5%",
        },
        {
            id: "distance",
            label: "Distance",
            value: "5.2 km",
            trend: "↑ +0.8 km",
        },
        {
            id: "active",
            label: "Temps actif",
            value: "45 min",
            trend: "↑ +10 min",
        },
        {
            id: "calories",
            label: "Calories brûlées",
            value: "245 kcal",
            trend: "↑ +35 kcal",
        },
    ];
    return (
        <main className="min-h-screen p-8">
            <div className="mx-auto max-w-6xl space-y-8">
                <section className="flex items-start justify-between">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold">Bienvenue sur Semelle</h1>
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
                                                    ? "Connectée et active"
                                                    : "Déconnectée"}
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
                                                {semelle.steps.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="p-2">
                                            <p className="text-muted-foreground mb-1 text-xs font-medium">
                                                Distance
                                            </p>
                                            <p className="text-lg font-bold">
                                                {semelle.distance} km
                                            </p>
                                        </div>
                                        <div className="p-2">
                                            <p className="text-muted-foreground mb-1 text-xs font-medium">
                                                Calories
                                            </p>
                                            <p className="text-lg font-bold">{semelle.calories}</p>
                                        </div>
                                    </div>

                                    <Button
                                        variant="secondary"
                                        className="self-end"
                                        isDisabled={!semelle.active}
                                    >
                                        Voir les détails
                                    </Button>
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
                                    <Chip
                                        variant="soft"
                                        color="success"
                                        size="sm"
                                        className="mt-2 w-fit"
                                    >
                                        {stat.trend}
                                    </Chip>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* Health Issues Detection */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Détection de Problèmes</h2>
                    <div className="space-y-3">
                        <Alert status="success">
                            <Alert.Indicator />
                            <Alert.Content>
                                <Alert.Title>Votre marche est normale et régulière</Alert.Title>
                            </Alert.Content>
                        </Alert>
                        <Alert status="warning">
                            <Alert.Indicator />
                            <Alert.Content>
                                <Alert.Title>Pression inégale détectée</Alert.Title>
                                <Alert.Description>
                                    Vous avez tendance à marcher sur la pointe des pieds.
                                </Alert.Description>
                            </Alert.Content>
                        </Alert>
                        <Alert status="warning">
                            <Alert.Indicator />
                            <Alert.Content>
                                <Alert.Title>Asymétrie détéctée</Alert.Title>
                                <Alert.Description>
                                    Légère asymétrie entre la semelle gauche et droite. Continuez à
                                    monitorer.
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
