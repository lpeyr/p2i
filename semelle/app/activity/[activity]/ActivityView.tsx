"use client";

import { Card, CardHeader, Chip, Separator } from "@heroui/react";
import dynamic from "next/dynamic";
import {
    FootCard,
    StatCard,
    LEGEND_ITEMS,
    getCircleClassName,
    formatDuration,
    formatStartTime,
    type FootContactValues,
} from "../ActivityUtils";

const MapView = dynamic(() => import("@/components/map"), {
    ssr: false,
});

export interface ActivityViewProps {
    activityId: number;
    sessionStartIso: string;
    sessionEndIso: string | null;
    steps: number;
    durationSeconds: number;
    route: [number, number][];
    leftContacts: FootContactValues;
    rightContacts: FootContactValues;
    leftHasActivity: boolean;
    rightHasActivity: boolean;
    distanceMeters: number;
    speedKmh: number;
}

function FootPressureVisualizer({
    left,
    right,
}: Readonly<{
    left: ActivityViewProps["leftContacts"];
    right: ActivityViewProps["rightContacts"];
}>) {
    const allContacts = [...left, ...right];
    const maxContacts = Math.max(...allContacts, 0);

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <FootCard
                    title="Pied gauche"
                    src="/foot_l.png"
                    contacts={left}
                    maxContacts={maxContacts}
                />
                <FootCard
                    title="Pied droit"
                    src="/foot_r.png"
                    contacts={right}
                    maxContacts={maxContacts}
                />
            </div>

            <Card className="border-separator border">
                <div className="space-y-3 p-6">
                    <div className="space-y-1">
                        <p className="font-semibold">Légende</p>
                        <p className="text-sm">
                            Référence : la zone qui a reçu le plus d&apos;appuis = 100%
                        </p>
                    </div>
                    <div>
                        {LEGEND_ITEMS.map((item) => (
                            <div key={item.label} className="flex items-center gap-2">
                                <span
                                    className={`inline-flex h-4 w-4 rounded-full ${getCircleClassName(item.percentage)}`}
                                />
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    );
}

function formatDate(dateIso: string) {
    return new Date(dateIso).toLocaleDateString("fr-FR", { dateStyle: "long" });
}

export default function ActivityView({
    activityId,
    sessionStartIso,
    sessionEndIso,
    steps,
    durationSeconds,
    route,
    leftContacts,
    rightContacts,
    leftHasActivity,
    rightHasActivity,
    distanceMeters,
    speedKmh,
}: Readonly<ActivityViewProps>) {
    const leftActive = leftHasActivity || leftContacts.some((value) => value > 0);
    const rightActive = rightHasActivity || rightContacts.some((value) => value > 0);

    const stats = [
        {
            id: "steps",
            label: "Pas",
            value: Number(steps ?? 0).toLocaleString("fr-FR"),
            color: "text-primary",
        },
        {
            id: "duration",
            label: "Durée",
            value: formatDuration(durationSeconds),
            color: "text-secondary",
        },
        {
            id: "start",
            label: "Heure de départ",
            value: formatStartTime(sessionStartIso),
            color: "text-success",
        },
        {
            id: "speed",
            label: "Vitesse Moyenne",
            value: speedKmh.toFixed(1),
            unit: "km/h",
            color: "text-warning",
        },
    ];

    return (
        <main className="min-h-screen p-8">
            <div className="mx-auto max-w-7xl space-y-8">
                <section className="flex items-start justify-between">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold">Activité #{activityId}</h1>
                        <p className="text-lg">Session du {formatDate(sessionStartIso)}</p>
                    </div>
                    <Chip variant="soft" color={sessionEndIso ? "success" : "default"} size="sm">
                        {sessionEndIso ? "Lecture seule" : "En cours"}
                    </Chip>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Statistiques en Temps Réel</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {stats.map((stat) => (
                            <StatCard
                                key={stat.id}
                                label={stat.label}
                                value={stat.value}
                                unit={stat.unit}
                                color={stat.color}
                            />
                        ))}
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-2">
                        <h2 className="text-2xl font-semibold">Tracé GPS</h2>
                        <Card className="border-separator overflow-hidden border">
                            <CardHeader className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">Itinéraire en direct</p>
                                        <p className="text-sm">Visualisation de votre trajet</p>
                                    </div>
                                    <Chip variant="soft" color="default" size="sm">
                                        Terminée
                                    </Chip>
                                </div>
                            </CardHeader>
                            <Separator />
                            <div>
                                <MapView route={route} />
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold">Appuis flexiforce</h2>
                        <div className="space-y-4">
                            <FootPressureVisualizer left={leftContacts} right={rightContacts} />
                            <Card className="border-separator border">
                                <div className="space-y-3 p-6">
                                    <div className="space-y-1">
                                        <p className="font-semibold">État des semelles</p>
                                        <p className="text-sm">
                                            Gauche :{" "}
                                            {leftActive ? "activité récente" : "aucune activité"}
                                            <br />
                                            Droite :{" "}
                                            {rightActive ? "activité récente" : "aucune activité"}
                                            <br />
                                            Distance : {(distanceMeters / 1000).toFixed(2)} km
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

export { type FootContactValues } from "../ActivityUtils";
