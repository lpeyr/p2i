"use client";

import Image from "next/image";
import { Card } from "@heroui/react";

export type FootContactValues = readonly [number, number, number];

interface FootPoint {
    label: string;
    top: string;
}

export interface FootCardProps {
    title: string;
    src: string;
    contacts: FootContactValues;
    maxContacts: number;
}

export interface StatItemProps {
    label: string;
    value: string;
    unit?: string;
    color?: string;
}

export const FOOT_POINTS: FootPoint[] = [
    { label: "Haut", top: "20%" },
    { label: "Milieu", top: "50%" },
    { label: "Bas", top: "80%" },
];

export const LEGEND_ITEMS = [
    { label: "0%", percentage: 0 },
    { label: "1% à 33%", percentage: 16 },
    { label: "34% à 66%", percentage: 50 },
    { label: "67% à 100%", percentage: 84 },
] as const;

export function getContactPercentage(count: number, maxContacts: number) {
    if (maxContacts <= 0) return 0;
    return (count / maxContacts) * 100;
}

export function getCircleClassName(percentage: number) {
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

export function FootCard({ title, src, contacts, maxContacts }: Readonly<FootCardProps>) {
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
                                className={`absolute left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm font-bold text-black transition-colors duration-300 ${getCircleClassName(percentage)}`}
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

export function StatCard({ label, value, unit, color = "text-primary" }: Readonly<StatItemProps>) {
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

export function formatDuration(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
}

export function formatStartTime(dateIso: string | Date) {
    const date = typeof dateIso === "string" ? new Date(dateIso) : dateIso;
    return date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}
