"use client";

import { Button, Card, CardHeader, Chip, Separator } from "@heroui/react";
import { useState } from "react";
import { Pause, Play, Square } from "@gravity-ui/icons";

interface ActivityData {
    steps: number;
    duration: number;
    startTime: Date;
    leftFootPressure: number;
    rightFootPressure: number;
    speed: number;
}

interface StatItemProps {
    label: string;
    value: string;
    unit?: string;
    color?: string;
    icon?: React.ReactNode;
}

interface PressureVisualizerProps {
    leftPressure: number;
    rightPressure: number;
}

export default function ActivityPage() {
    const [isActive, setIsActive] = useState(false);
    const [activityData, setActivityData] = useState<ActivityData>({
        steps: 0,
        duration: 0,
        startTime: new Date(),
        leftFootPressure: 0,
        rightFootPressure: 0,
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

    return (
        <main className="bg-background min-h-screen p-8">
            <div className="mx-auto max-w-7xl space-y-8">
                {/* Header */}
                <section className="flex items-center justify-between">
                    <div className="space-y-2">
                        <h1 className="text-foreground text-4xl font-bold">
                            Activité en Temps Réel
                        </h1>
                        <p className="text-muted-foreground text-lg">
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
                            {!isActive ? (
                                <>
                                    <Play /> Commencer
                                </>
                            ) : (
                                <>
                                    <Pause />
                                    Pause
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
                                    leftFootPressure: 0,
                                    rightFootPressure: 0,
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
                    <h2 className="text-foreground text-2xl font-semibold">
                        Statistiques en Temps Réel
                    </h2>
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
                            label="Vitesse"
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
                        <h2 className="text-foreground text-2xl font-semibold">Tracé GPS</h2>
                        <Card className="from-default-50 to-default-100 border-separator overflow-hidden border bg-linear-to-br">
                            <CardHeader className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-foreground font-semibold">
                                            Itinéraire en direct
                                        </p>
                                        <p className="text-muted-foreground text-sm">
                                            Visualisation de votre trajet
                                        </p>
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
                            <div className="bg-default-100 flex h-96 items-center justify-center">
                                <div className="space-y-3 text-center">
                                    <div className="bg-primary-100 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                                        <div className="bg-primary-200 h-12 w-12 animate-pulse rounded-full"></div>
                                    </div>
                                    <p className="text-muted-foreground">
                                        {isActive
                                            ? "Acquisition du tracé GPS en cours..."
                                            : "Démarrez une session pour voir le tracé"}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Foot Pressure Visualizer */}
                    <div className="space-y-4">
                        <h2 className="text-foreground text-2xl font-semibold">
                            Pression des Pieds
                        </h2>
                        <PressureVisualizer
                            leftPressure={activityData.leftFootPressure}
                            rightPressure={activityData.rightFootPressure}
                        />
                    </div>
                </section>

                {/* 3D Foot Visualization */}
                <section className="space-y-4">
                    <h2 className="text-foreground text-2xl font-semibold">
                        Visualisation 3D en Temps Réel
                    </h2>
                    <Card className="from-default-50 to-default-100 border-separator overflow-hidden border bg-linear-to-br">
                        <div className="space-y-4 p-0">
                            <div className="border-separator flex gap-2 border-b px-4">
                                {[
                                    { id: "both", label: "Les Deux Pieds", side: "both" as const },
                                    { id: "left", label: "Pied Gauche", side: "left" as const },
                                    { id: "right", label: "Pied Droit", side: "right" as const },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        className="text-muted-foreground hover:text-foreground hover:border-primary border-b-2 border-transparent px-4 py-2 text-sm font-medium transition-colors"
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <div className="px-4">
                                <Foot3DPlaceholder footSide="both" isActive={isActive} />
                            </div>
                        </div>
                    </Card>
                </section>

                {/* Data Stream Info */}
                <section className="space-y-4">
                    <h2 className="text-foreground text-2xl font-semibold">Informations</h2>
                    <Card className="border-separator from-default-50 to-default-100 border bg-linear-to-br">
                        <div className="gap-4 p-6">
                            <p className="text-muted-foreground">
                                <span className="text-foreground font-semibold">État SSE :</span>{" "}
                                Connecté et prêt
                            </p>
                            <p className="text-muted-foreground">
                                <span className="text-foreground font-semibold">
                                    Semelles détectées :
                                </span>{" "}
                                2 (Gauche ✓, Droite ✓)
                            </p>
                            <p className="text-muted-foreground">
                                <span className="text-foreground font-semibold">Résolution :</span>{" "}
                                Données mises à jour chaque seconde
                            </p>
                        </div>
                    </Card>
                </section>
            </div>
        </main>
    );
}

/* Composant réutilisable pour les cartes de stats */
function StatCard({ label, value, unit, color = "text-primary" }: Readonly<StatItemProps>) {
    return (
        <Card className="border-separator from-default-50 to-default-100 border bg-linear-to-br">
            <div className="gap-2 p-6">
                <p className="text-muted-foreground text-sm font-medium">{label}</p>
                <div className="flex items-baseline gap-1">
                    <p className={`text-3xl font-bold ${color}`}>{value}</p>
                    {unit && <p className="text-muted-foreground text-sm">{unit}</p>}
                </div>
            </div>
        </Card>
    );
}

/* Composant pour visualiser la pression des pieds */
function PressureVisualizer({ leftPressure, rightPressure }: Readonly<PressureVisualizerProps>) {
    const getColorByPressure = (pressure: number) => {
        if (pressure < 30) return "bg-success";
        if (pressure < 70) return "bg-warning";
        return "bg-danger";
    };

    const getTextColorByPressure = (pressure: number) => {
        if (pressure < 30) return "text-success";
        if (pressure < 70) return "text-warning";
        return "text-danger";
    };

    return (
        <div className="space-y-4">
            {/* Left Foot */}
            <Card className="border-separator from-default-50 to-default-100 border bg-linear-to-br">
                <div className="gap-3 p-6">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-foreground font-semibold">Pied Gauche</p>
                        <p className={`text-lg font-bold ${getTextColorByPressure(leftPressure)}`}>
                            {leftPressure.toFixed(1)}%
                        </p>
                    </div>
                    <div className="bg-default-200 h-3 w-full overflow-hidden rounded-full">
                        <div
                            className={`h-full ${getColorByPressure(leftPressure)} transition-all duration-300`}
                            style={{ width: `${leftPressure}%` }}
                        ></div>
                    </div>
                </div>
            </Card>

            {/* Right Foot */}
            <Card className="border-separator from-default-50 to-default-100 border bg-linear-to-br">
                <div className="gap-3 p-6">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-foreground font-semibold">Pied Droit</p>
                        <p className={`text-lg font-bold ${getTextColorByPressure(rightPressure)}`}>
                            {rightPressure.toFixed(1)}%
                        </p>
                    </div>
                    <div className="bg-default-200 h-3 w-full overflow-hidden rounded-full">
                        <div
                            className={`h-full ${getColorByPressure(rightPressure)} transition-all duration-300`}
                            style={{ width: `${rightPressure}%` }}
                        ></div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

/* Composant placeholder pour la visualisation 3D */
interface Foot3DPlaceholderProps {
    footSide: "left" | "right" | "both";
    isActive: boolean;
}

function Foot3DPlaceholder({ footSide, isActive }: Readonly<Foot3DPlaceholderProps>) {
    const getFootLabel = () => {
        switch (footSide) {
            case "left":
                return "Pied Gauche";
            case "right":
                return "Pied Droit";
            default:
                return "Les Deux Pieds";
        }
    };

    return (
        <div className="bg-default-100 flex h-96 flex-col items-center justify-center rounded-lg p-6">
            <div className="space-y-4 text-center">
                <div className="bg-secondary-100 mx-auto h-20 w-20 animate-pulse rounded-full"></div>
                <div className="space-y-2">
                    <p className="text-foreground font-semibold">{getFootLabel()}</p>
                    <p className="text-muted-foreground text-sm">
                        {isActive
                            ? "Rendu 3D en direct..."
                            : "Démarrez une session pour voir le rendu 3D"}
                    </p>
                </div>
                <Chip variant="soft" color="warning" size="sm">
                    Prêt pour WebGL/Three.js
                </Chip>
            </div>
        </div>
    );
}
