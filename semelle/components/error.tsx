"use client";

import { Button } from "@heroui/react";

interface ErrorProps {
    error: Error & { digest?: string };
}

export function Error({ error }: ErrorProps) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-white p-6 dark:bg-zinc-950">
            {/* Background grid */}
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0 opacity-[0.04] dark:opacity-[0.03]"
                style={{
                    backgroundImage:
                        "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                }}
            />
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0 opacity-0 dark:opacity-[0.03]"
                style={{
                    backgroundImage:
                        "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                }}
            />

            {/* Glow blob */}
            <div
                aria-hidden
                className="pointer-events-none fixed top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07] blur-3xl dark:opacity-10"
                style={{ background: "radial-gradient(circle, #ef4444 0%, transparent 70%)" }}
            />

            <div className="relative z-10 w-full max-w-lg">
                {/* Status badge */}
                <div className="mb-6 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-50 px-3 py-1 text-xs font-medium tracking-widest text-red-500 uppercase dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                        <span className="size-1.5 animate-pulse rounded-full bg-red-500 dark:bg-red-400" />
                        Erreur système
                    </span>
                </div>

                {/* Heading */}
                <h1 className="mb-2 text-5xl leading-none font-bold tracking-tighter text-zinc-900 dark:text-white">
                    Quelque chose
                    <br />
                    <span className="text-red-500 dark:text-red-400">a mal tourné.</span>
                </h1>

                <p className="mt-4 mb-8 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Une erreur inattendue s&apos;est produite côté client. Vous pouvez tenter de
                    relancer la page ou revenir à l&apos;accueil.
                </p>

                {/* Error detail card */}
                {(error.message || error.digest) && (
                    <div className="mb-8 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                        <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-100/80 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/80">
                            <span className="size-2 rounded-full bg-red-500" />
                            <span className="size-2 rounded-full bg-yellow-500" />
                            <span className="size-2 rounded-full bg-green-500" />
                            <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">
                                stack trace
                            </span>
                        </div>
                        <div className="space-y-2 px-4 py-4">
                            {error.message && (
                                <p className="text-xs leading-relaxed break-all text-red-600 dark:text-red-300">
                                    {error.message}
                                </p>
                            )}
                            {error.digest && (
                                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                                    digest:{" "}
                                    <span className="text-zinc-600 dark:text-zinc-400">
                                        {error.digest}
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <Button
                        as="a"
                        href="/"
                        variant="bordered"
                        className="border-zinc-300 px-6 text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-white"
                        radius="full"
                    >
                        Retour à l&apos;accueil
                    </Button>
                </div>

                {/* Footer hint */}
                <p className="mt-10 text-xs text-zinc-400 dark:text-zinc-600">
                    Si le problème persiste, contactez le support.
                </p>
            </div>
        </div>
    );
}
