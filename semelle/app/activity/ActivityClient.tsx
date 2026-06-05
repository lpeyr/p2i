"use client";

import { Button, Card, CardHeader, Chip, Separator } from "@heroui/react";
import { useState, useTransition } from "react";
import { Pause, Play, Square } from "@gravity-ui/icons";
import dynamic from "next/dynamic";
import {
    FootCard,
    type FootContactValues,
    formatDuration,
    formatStartTime,
    getCircleClassName,
    LEGEND_ITEMS,
    StatCard,
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

export default function ActivityClient({
    sessions,
    canStart,
    canStop,
    lastSessionId,
    semelle1,
    semelle2,
    startAction,
    stopAction,
    initialActivityData,
}: Readonly<{
    sessions: SessionOverview[];
    canStart: boolean;
    canStop: boolean;
    lastSessionId: number | null;
    semelle1?: number | null;
    semelle2?: number | null;
    startAction?: (formData: FormData) => Promise<void>;
    stopAction?: (formData: FormData) => Promise<void>;
    initialActivityData?: Partial<ActivityData>;
}>) {
    const [isActive, setIsActive] = useState(canStop); // si canStop est true, cela signifie qu'une session est déjà active
    const [activityData, setActivityData] = useState<ActivityData>({
        steps: initialActivityData?.steps ?? 0,
        duration: initialActivityData?.duration ?? 0,
        startTime: initialActivityData?.startTime ?? new Date(),
        leftFootContacts: initialActivityData?.leftFootContacts ?? [0, 0, 0],
        rightFootContacts: initialActivityData?.rightFootContacts ?? [0, 0, 0],
        speed: initialActivityData?.speed ?? 0,
    });

    const [isPending, startTransition] = useTransition();
    const route: [number, number][] = [[45.782562, 4.872407]];

    const handleStart = (e: React.FormEvent<HTMLFormElement>) => {
        setIsActive(true);
        e.preventDefault();
        startTransition(async () => {
            const formData = new FormData(e.currentTarget);
            await startAction?.(formData);
        });
    };

    const handleStop = (e: React.FormEvent<HTMLFormElement>) => {
        setIsActive(false);
        e.preventDefault();
        startTransition(async () => {
            const formData = new FormData(e.currentTarget);
            await stopAction?.(formData);
            setActivityData({
                steps: 0,
                duration: 0,
                startTime: new Date(),
                leftFootContacts: [0, 0, 0],
                rightFootContacts: [0, 0, 0],
                speed: 0,
            });
        });
    };

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
                        {/* Start form */}
                        <form onSubmit={handleStart}>
                            <input type="hidden" name="semelle1" value={semelle1 ?? ""} />
                            <input type="hidden" name="semelle2" value={semelle2 ?? ""} />
                            <Button
                                className={`${isActive ? "bg-danger text-danger-foreground" : "bg-success text-success-foreground"}`}
                                size="lg"
                                isDisabled={isActive || isPending}
                                type="submit"
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
                        </form>

                        {/* Stop form */}
                        <form onSubmit={handleStop}>
                            <input type="hidden" name="idSession" value={lastSessionId ?? ""} />
                            <Button size="lg" isDisabled={!isActive} type="submit">
                                <Square /> Arrêter
                            </Button>
                        </form>
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

// Types used from server
interface SessionOverview {
    idSession: number;
    dateDebut: string;
    dateFin: string | null;
    durationSeconds: number;
    step: number;
    distanceMeters: number;
}
