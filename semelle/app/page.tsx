"use client";

import { Alert, Button, Card, CardHeader, Chip, ProgressBar, Separator } from "@heroui/react";
import { Moon, Sun } from "@gravity-ui/icons";
import { useTheme } from "next-themes";

export default function Home() {
    const { theme, setTheme } = useTheme();

    const semelles = [
        {
            id: "left",
            name: "Semelle Gauche",
            battery: 85,
            active: true,
            steps: 4215,
            distance: 2.6,
            calories: 160,
        },
        {
            id: "right",
            name: "Semelle Droite",
            battery: 72,
            active: true,
            steps: 4217,
            distance: 2.6,
            calories: 165,
        },
    ];
    return (
        <main className="text-foreground min-h-screen p-8">
            <div className="mx-auto max-w-6xl space-y-8">
                <section className="flex items-start justify-between">
                    <div className="space-y-2">
                        <h1 className="text-foreground text-4xl font-bold">
                            Bienvenue sur Semelle
                        </h1>
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
                    <h2 className="text-foreground text-2xl font-semibold">État des Semelles</h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        {semelles.map((semelle) => (
                            <Card
                                key={semelle.id}
                                className="border-separator from-default-50 to-default-100 overflow-hidden border bg-linear-to-br transition-shadow hover:shadow-lg"
                            >
                                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
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
                                            <h3 className="text-foreground text-xl font-semibold">
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
                                <div className="flex flex-col gap-6 p-6">
                                    {/* Batterie */}
                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="text-foreground text-sm font-medium">
                                                Batterie
                                            </p>
                                            <span className="text-foreground font-bold">
                                                {semelle.battery}%
                                            </span>
                                        </div>
                                        <ProgressBar
                                            value={semelle.battery}
                                            maxValue={100}
                                            color={semelle.battery > 50 ? "success" : "warning"}
                                            className="h-2"
                                        />
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-primary-50 rounded-lg p-3">
                                            <p className="text-muted-foreground mb-1 text-xs font-medium">
                                                Pas
                                            </p>
                                            <p className="text-foreground text-lg font-bold">
                                                {semelle.steps.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="bg-secondary-50 rounded-lg p-3">
                                            <p className="text-muted-foreground mb-1 text-xs font-medium">
                                                Distance
                                            </p>
                                            <p className="text-foreground text-lg font-bold">
                                                {semelle.distance} km
                                            </p>
                                        </div>
                                        <div className="bg-warning-50 rounded-lg p-3">
                                            <p className="text-muted-foreground mb-1 text-xs font-medium">
                                                Calories
                                            </p>
                                            <p className="text-foreground text-lg font-bold">
                                                {semelle.calories}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="w-full"
                                        isDisabled={!semelle.active}
                                    >
                                        Voir Détails
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* Dashboard Stats */}
                <section className="space-y-4">
                    <h2 className="text-foreground text-2xl font-semibold">Tableau de Bord</h2>
                    <div className="grid gap-4 md:grid-cols-4">
                        {[
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
                        ].map((stat) => (
                            <Card key={stat.id} className="border-separator bg-surface border">
                                <div className="gap-2 p-6">
                                    <p className="text-muted-foreground text-sm font-medium">
                                        {stat.label}
                                    </p>
                                    <p className="text-foreground text-3xl font-bold">
                                        {stat.value}
                                    </p>
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
                    <h2 className="text-foreground text-2xl font-semibold">
                        Détection de Problèmes
                    </h2>
                    <div className="space-y-3">
                        <Alert status="success">
                            <Alert.Indicator />
                            <Alert.Content>
                                <Alert.Title>Votre marche est normale et régulière</Alert.Title>
                            </Alert.Content>
                        </Alert>
                        <Card className="border-separator bg-default-100 border">
                            <div className="gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="flex-1">
                                        <p className="text-foreground font-semibold">
                                            Pression inégale détectée
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-sm">
                                            Légère asymétrie entre la semelle gauche et droite.
                                            Continuez à monitorer.
                                        </p>
                                    </div>
                                    <Chip variant="soft" color="default" size="sm">
                                        Info
                                    </Chip>
                                </div>
                            </div>
                        </Card>
                    </div>
                </section>

                {/* Quick Actions */}
                <section className="space-y-4">
                    <div className="flex gap-3">
                        <Button variant="primary" size="lg">
                            Commencer une Session
                        </Button>
                        <Button variant="outline" size="lg">
                            Voir l&apos;Historique
                        </Button>
                        <Button variant="outline" size="lg">
                            Paramètres
                        </Button>
                    </div>
                </section>
            </div>
        </main>
    );
}
