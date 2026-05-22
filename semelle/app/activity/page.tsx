"use client";

import { Button, Card, CardHeader, Chip, Separator } from "@heroui/react";
import { useState } from "react";
import { Pause, Play, Square } from "@gravity-ui/icons";
import dynamic from "next/dynamic";
import {
    FootCard,
    StatCard,
    LEGEND_ITEMS,
    getCircleClassName,
    formatDuration,
    formatStartTime,
    type FootContactValues,
} from "./ActivityUtils";

const MapView = dynamic(() => import("./../../components/map"), {
    ssr: false,
});

interface ActivityData {
    steps: number;
    duration: number;
    startTime: Date;
    leftFootContacts: FootContactValues;
    rightFootContacts: FootContactValues;
    speed: number;
}

export default function ActivityPage() {
    const [isActive, setIsActive] = useState(false);
    const [activityData, setActivityData] = useState<ActivityData>({
        steps: 0,
        duration: 0,
        startTime: new Date(),
        leftFootContacts: [0, 0, 0],
        rightFootContacts: [0, 0, 0],
        speed: 0,
    });

    const route: [number, number][] = [[45.782562, 4.872407]];

    return (
        <main className="min-h-screen p-8">
            <div className="mx-auto max-w-7xl space-y-8">
                {/* Header */}
                <section className="flex items-center justify-between">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold">Activité en Temps Réel</h1>
                        <p className="text-lg">
                            Suivez votre marche et analysez vos données en direct
                        </p>
                    </div>
                </section>

                {/* Control Panel */}
                <section className="space-y-4">
                    <div className="flex gap-3">
                        <Button
                            className={`${isActive ? "bg-danger text-danger-foreground" : "bg-success text-success-foreground"}`}
                            size="lg"
                            onClick={() => setIsActive(!isActive)}
                        >
                            {isActive ? (
                                <>
                                    <Pause />
                                    Pause
                                </>
                            ) : (
                                <>
                                    <Play /> Commencer
                                </>
                            )}
                        </Button>
                        <Button
                            size="lg"
                            onClick={() => {
                                setIsActive(false);
                                setActivityData({
                                    steps: 0,
                                    duration: 0,
                                    startTime: new Date(),
                                    leftFootContacts: [0, 0, 0],
                                    rightFootContacts: [0, 0, 0],
                                    speed: 0,
                                });
                            }}
                        >
                            <Square /> Arrêter
                        </Button>
                    </div>
                </section>

                {/* Real-time Stats */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Statistiques en Temps Réel</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            label="Pas"
                            value={activityData.steps.toString()}
                            color="text-primary"
                        />
                        <StatCard
                            label="Durée"
                            value={formatDuration(activityData.duration)}
                            color="text-secondary"
                        />
                        <StatCard
                            label="Heure de départ"
                            value={formatStartTime(activityData.startTime)}
                            color="text-success"
                        />
                        <StatCard
                            label="Vitesse Moyenne"
                            value={activityData.speed.toFixed(1)}
                            unit="km/h"
                            color="text-warning"
                        />
                    </div>
                </section>

                {/* Main Content Grid */}
                <section className="grid gap-6 lg:grid-cols-3">
                    {/* GPS Tracker */}
                    <div className="space-y-4 lg:col-span-2">
                        <h2 className="text-2xl font-semibold">Tracé GPS</h2>
                        <Card className="border-separator overflow-hidden border">
                            <CardHeader className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">Itinéraire en direct</p>
                                        <p className="text-sm">Visualisation de votre trajet</p>
                                    </div>
                                    <Chip
                                        variant="soft"
                                        color={isActive ? "success" : "default"}
                                        size="sm"
                                    >
                                        {isActive ? "En cours..." : "Arrêté"}
                                    </Chip>
                                </div>
                            </CardHeader>
                            <Separator />
                            <div className="">
                                <MapView route={route} />
                            </div>
                        </Card>
                    </div>

                    {/* Foot Pressure Visualizer */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold">Appuis flexiforce</h2>
                        <FootPressureVisualizer
                            leftContacts={activityData.leftFootContacts}
                            rightContacts={activityData.rightFootContacts}
                        />
                    </div>
                </section>
            </div>
        </main>
    );
}
/* Composant pour visualiser les appuis flexiforce sur les pieds */
function FootPressureVisualizer({
    leftContacts,
    rightContacts,
}: Readonly<{ leftContacts: FootContactValues; rightContacts: FootContactValues }>) {
    const allContacts = [...leftContacts, ...rightContacts];
    const maxContacts = Math.max(...allContacts, 0);

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <FootCard
                    title="Pied gauche"
                    src="/foot_l.png"
                    contacts={leftContacts}
                    maxContacts={maxContacts}
                />
                <FootCard
                    title="Pied droit"
                    src="/foot_r.png"
                    contacts={rightContacts}
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
