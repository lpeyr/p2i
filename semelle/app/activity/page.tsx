"use client";

import { Button, Card, CardHeader, Chip, Separator } from "@heroui/react";
import Image from "next/image";
import { useState } from "react";
import { Pause, Play, Square } from "@gravity-ui/icons";
import dynamic from "next/dynamic";

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

type FootContactValues = readonly [number, number, number];

interface StatItemProps {
    label: string;
    value: string;
    unit?: string;
    color?: string;
    icon?: React.ReactNode;
}

interface FootPressureVisualizerProps {
    leftContacts: FootContactValues;
    rightContacts: FootContactValues;
}

interface FootPoint {
    label: string;
    top: string;
}

interface FootCardProps {
    title: string;
    src: string;
    contacts: FootContactValues;
    maxContacts: number;
}

const FOOT_POINTS: FootPoint[] = [
    { label: "Haut", top: "20%" },
    { label: "Milieu", top: "50%" },
    { label: "Bas", top: "80%" },
];

const LEGEND_ITEMS = [
    { label: "0%", percentage: 0 },
    { label: "1% à 33%", percentage: 16 },
    { label: "34% à 66%", percentage: 50 },
    { label: "67% à 100%", percentage: 84 },
] as const;

function getContactPercentage(count: number, maxContacts: number) {
    if (maxContacts <= 0) return 0;
    return (count / maxContacts) * 100;
}

function getCircleClassName(percentage: number) {
    if (percentage === 0) {
        return "bg-white text-default-700 shadow-[0_8px_18px_rgba(148,163,184,0.42)]";
    }

    if (percentage < 34) {
        return "bg-success text-success-foreground shadow-[0_8px_18px_rgba(34,197,94,0.42)]";
    }

    if (percentage < 67) {
        return "bg-warning text-warning-foreground shadow-[0_8px_18px_rgba(245,158,11,0.42)]";
    }

    return "bg-danger text-danger-foreground shadow-[0_8px_18px_rgba(239,68,68,0.42)]";
}

function FootCard({ title, src, contacts, maxContacts }: Readonly<FootCardProps>) {
    const totalContacts = contacts.reduce((sum, value) => sum + value, 0);

    return (
        <Card className="border-separator border">
            <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-semibold">{title}</p>
                        <p className="text-sm">
                            {totalContacts} appui{totalContacts > 1 ? "s" : ""}
                        </p>
                    </div>
                </div>

                <div className="relative mx-auto aspect-3/5 w-full max-w-70">
                    <Image
                        src={src}
                        alt={title}
                        height={150}
                        width={250}
                        className="object-contain"
                        priority
                    />

                    {FOOT_POINTS.map((point, index) => {
                        const count = contacts[index];
                        const percentage = getContactPercentage(count, maxContacts);

                        return (
                            <div
                                key={point.label}
                                className={`absolute left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm font-bold transition-colors duration-300 ${getCircleClassName(percentage)}`}
                                style={{ top: point.top }}
                                title={`${point.label}: ${count}`}
                            >
                                {count}
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {FOOT_POINTS.map((point, index) => (
                        <div key={point.label} className="space-y-1">
                            <p className="text-foreground font-medium">{point.label}</p>
                            <p>{contacts[index]}</p>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
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

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        }
        return `${minutes}m ${secs}s`;
    };

    const formatStartTime = (date: Date) => {
        return date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

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

/* Composant réutilisable pour les cartes de stats */
function StatCard({ label, value, unit, color = "text-primary" }: Readonly<StatItemProps>) {
    return (
        <Card className="border-separator border">
            <div className="gap-2 p-6">
                <p className="text-sm font-medium">{label}</p>
                <div className="flex items-baseline gap-1">
                    <p className={`text-3xl font-bold ${color}`}>{value}</p>
                    {unit && <p className="text-sm">{unit}</p>}
                </div>
            </div>
        </Card>
    );
}

/* Composant pour visualiser les appuis flexiforce sur les pieds */
function FootPressureVisualizer({
    leftContacts,
    rightContacts,
}: Readonly<FootPressureVisualizerProps>) {
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
