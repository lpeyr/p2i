"use client";
import { Button, Chip, Separator, Tooltip } from "@heroui/react";
import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 dark:bg-zinc-950">
            {/* Chip statut */}
            <Chip
                variant="primary"
                color="warning"
                size="sm"
                className="mb-8 tracking-widest uppercase"
            >
                Erreur 404
            </Chip>

            {/* Titre */}
            <h1 className="mb-2 text-center text-7xl font-bold tracking-tighter text-zinc-900 dark:text-white">
                Page introuvable
            </h1>

            <p className="mb-10 max-w-md text-center text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                La page que vous cherchez n&apos;existe pas ou a été déplacée. Vérifiez l&apos;URL
                ou revenez à l&apos;accueil.
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/">
                    <Button color="primary" radius="full" className="px-6 font-semibold">
                        Retour à l&apos;accueil
                    </Button>
                </Link>

                <Tooltip content="Revenir à la page précédente" placement="bottom">
                    <Button
                        onClick={() => window.history.back()}
                        variant="bordered"
                        radius="full"
                        className="border-zinc-300 px-6 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                    >
                        Page précédente
                    </Button>
                </Tooltip>
            </div>

            {/* Separator + footer hint */}
            <div className="mt-14 flex w-full max-w-sm flex-col items-center gap-4">
                <Separator className="w-full" />
                <p className="text-xs text-zinc-400 dark:text-zinc-600">
                    Si le problème persiste, contactez le support.
                </p>
            </div>
        </div>
    );
}
