"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@heroui/react";
import { Clock, House, Person } from "@gravity-ui/icons";

export default function NavBar() {
    const pathname = usePathname();

    return (
        <nav className="border-background-tertiary bg-background/60 dark:bg-background-secondary/60 fixed bottom-0 z-60 m-5 self-center rounded-4xl border p-3 shadow-md backdrop-blur-lg dark:border-2">
            <div className="grid grid-cols-3 items-center justify-center space-x-2">
                <Link href="/">
                    <Button
                        variant={pathname === "/" ? "primary" : "ghost"}
                        className="flex h-auto w-full flex-col items-center space-y-0 py-2"
                    >
                        <House className="m-0 -mb-1 h-6 w-6 p-0" />
                        Accueil
                    </Button>
                </Link>
                <Link href="/activity">
                    <Button
                        variant={pathname === "/activity" ? "primary" : "ghost"}
                        className="flex h-auto w-full flex-col items-center space-y-0 py-2"
                    >
                        <Person className="m-0 -mb-1 h-6 w-6 p-0" />
                        Activité
                    </Button>
                </Link>
                <Link href="/history">
                    <Button
                        variant={pathname === "/history" ? "primary" : "ghost"}
                        className="flex h-auto w-full flex-col items-center space-y-0 py-2"
                    >
                        <Clock className="m-0 -mb-1 h-6 w-6 p-0" />
                        Historique
                    </Button>
                </Link>
            </div>
        </nav>
    );
}
