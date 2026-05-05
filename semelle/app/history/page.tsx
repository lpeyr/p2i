"use client";

import {
    Card,
    CardHeader,
    Chip,
    Label,
    ListBox,
    SearchField,
    Select,
    Separator,
} from "@heroui/react";
import { ChevronRight } from "@gravity-ui/icons";
import Link from "next/link";
import { useState } from "react";

interface ActivityRecord {
    id: string;
    date: Date;
    duration: number;
    distance: number;
    steps: number;
    calories: number;
    avgSpeed: number;
}

interface ActivityItemProps {
    activity: ActivityRecord;
}

// Données simulées pour la démo
const mockActivities: ActivityRecord[] = [
    {
        id: "act-001",
        date: new Date(2026, 4, 5, 14, 30),
        duration: 2520,
        distance: 4.2,
        steps: 5840,
        calories: 385,
        avgSpeed: 5.1,
    },
    {
        id: "act-002",
        date: new Date(2026, 4, 4, 10, 0),
        duration: 1800,
        distance: 3.1,
        steps: 4290,
        calories: 270,
        avgSpeed: 5.2,
    },
    {
        id: "act-003",
        date: new Date(2026, 4, 3, 16, 45),
        duration: 2160,
        distance: 3.8,
        steps: 5120,
        calories: 340,
        avgSpeed: 5,
    },
    {
        id: "act-004",
        date: new Date(2026, 4, 2, 8, 30),
        duration: 900,
        distance: 1.5,
        steps: 2080,
        calories: 140,
        avgSpeed: 5.1,
    },
    {
        id: "act-005",
        date: new Date(2026, 4, 1, 19, 20),
        duration: 3060,
        distance: 5.1,
        steps: 7050,
        calories: 480,
        avgSpeed: 5.0,
    },
    {
        id: "act-006",
        date: new Date(2026, 3, 30, 11, 15),
        duration: 1620,
        distance: 2.9,
        steps: 4010,
        calories: 250,
        avgSpeed: 5.1,
    },
];

export default function HistoryPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("date");

    // Filtrage et tri des activités
    const filteredActivities = mockActivities
        .filter((activity) => {
            return (
                activity.date.toLocaleDateString("fr-FR").includes(searchQuery) ||
                activity.distance.toString().includes(searchQuery) ||
                activity.steps.toString().includes(searchQuery)
            );
        })
        .sort((a, b) => {
            if (sortBy === "date") return b.date.getTime() - a.date.getTime();
            if (sortBy === "distance") return b.distance - a.distance;
            if (sortBy === "duration") return b.duration - a.duration;
            if (sortBy === "steps") return b.steps - a.steps;
            return 0;
        });

    const stats = [
        { value: "date", label: "Date" },
        { value: "distance", label: "Distance" },
        { value: "duration", label: "Durée" },
        { value: "steps", label: "Pas" },
    ];
    return (
        <main className="min-h-screen p-8">
            <div className="mx-auto max-w-6xl space-y-8">
                {/* Header */}
                <section className="space-y-2">
                    <h1 className="text-4xl font-bold">Historique des Activités</h1>
                    <p className="text-muted-foreground text-lg">
                        Consultez toutes vos sessions de marche
                    </p>
                </section>

                {/* Filters & Search */}
                <section className="space-y-4">
                    <SearchField name="search">
                        <SearchField.Group>
                            <SearchField.SearchIcon />
                            <SearchField.Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Rechercher..."
                            />
                            <SearchField.ClearButton />
                        </SearchField.Group>
                    </SearchField>
                    {/* Sort */}
                    <div className="space-y-2">
                        <Select
                            onChange={(v) => setSortBy(v as string)}
                            className="w-full sm:w-64"
                            placeholder="Sélectionner un filtre"
                        >
                            <Label>Trier par</Label>
                            <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                                <ListBox>
                                    {stats.map((e, i) => (
                                        <ListBox.Item
                                            key={e.value + `${i}`}
                                            id={e.value}
                                            textValue={e.value}
                                        >
                                            {e.label}
                                        </ListBox.Item>
                                    ))}
                                </ListBox>
                            </Select.Popover>
                        </Select>
                    </div>
                </section>

                {/* Stats Summary */}
                <section className="grid gap-4 md:grid-cols-4">
                    <StatSummary
                        label="Total Sessions"
                        value={filteredActivities.length.toString()}
                    />
                    <StatSummary
                        label="Distance Totale"
                        value={filteredActivities
                            .reduce((sum, a) => sum + a.distance, 0)
                            .toFixed(1)}
                        unit="km"
                    />
                    <StatSummary
                        label="Pas Totaux"
                        value={filteredActivities
                            .reduce((sum, a) => sum + a.steps, 0)
                            .toLocaleString()}
                    />
                    <StatSummary
                        label="Calories Brûlées"
                        value={filteredActivities
                            .reduce((sum, a) => sum + a.calories, 0)
                            .toString()}
                    />
                </section>

                {/* Activities List */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Vos Activités</h2>
                    {filteredActivities.length === 0 ? (
                        <Card className="border-separator border">
                            <div className="p-8 text-center">
                                <p className="text-muted-foreground">Aucune activité trouvée</p>
                            </div>
                        </Card>
                    ) : (
                        <div className="flex flex-col space-y-3">
                            {filteredActivities.map((activity) => (
                                <ActivityCard key={activity.id} activity={activity} />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

// Composant pour afficher une activité
function ActivityCard({ activity }: Readonly<ActivityItemProps>) {
    const formatDate = (date: Date) => {
        return date.toLocaleDateString("fr-FR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    return (
        <Link href={`/activity/${activity.id}`}>
            <Card className="border-separator hover:border-primary cursor-pointer border transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="flex-1">
                        <p className="text-lg font-semibold">{formatDate(activity.date)}</p>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {activity.distance.toFixed(1)} km • {formatDuration(activity.duration)}
                        </p>
                    </div>
                    <Chip variant="soft" color="success" size="sm">
                        Complétée
                    </Chip>
                </CardHeader>
                <Separator />
                <div className="flex flex-col">
                    <div className="grid grid-cols-4">
                        <MetricBadge label="Pas" value={activity.steps.toLocaleString()} />
                        <MetricBadge label="Calories" value={activity.calories.toString()} />
                        <MetricBadge
                            label="Vitesse Moy."
                            value={`${activity.avgSpeed.toFixed(1)} km/h`}
                        />
                        <div className="flex items-center justify-end">
                            <ChevronRight />
                        </div>
                    </div>
                </div>
            </Card>
        </Link>
    );
}

// Composant réutilisable pour les badges de métriques
interface MetricBadgeProps {
    label: string;
    value: string;
}

function MetricBadge({ label, value }: Readonly<MetricBadgeProps>) {
    return (
        <div className="rounded-lg p-3 text-center">
            <p className="text-muted-foreground text-xs font-medium">{label}</p>
            <p className="mt-1 text-sm font-bold">{value}</p>
        </div>
    );
}

// Composant réutilisable pour les statistiques récapitulatives
interface StatSummaryProps {
    label: string;
    value: string;
    unit?: string;
}

function StatSummary({ label, value, unit }: Readonly<StatSummaryProps>) {
    return (
        <Card className="border-separator border">
            <div className="gap-2 p-2">
                <p className="text-muted-foreground text-sm font-medium">{label}</p>
                <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-bold">{value}</p>
                    {unit && <p className="text-muted-foreground text-sm">{unit}</p>}
                </div>
            </div>
        </Card>
    );
}
