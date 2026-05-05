"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@heroui/react";
import { AntennaSignal, House, Person } from "@gravity-ui/icons";

export default function NavBar() {
    const pathname = usePathname();

    return (
        <nav className="border-background-secondary bg-background/60 fixed bottom-0 m-5 self-center rounded-4xl border p-3 shadow-md backdrop-blur-lg">
            <div className="grid grid-cols-3 items-center justify-center space-x-2">
                <Link href="/">
                    <Button
                        variant={pathname === "/" ? "primary" : "secondary"}
                        className="flex h-auto w-full flex-col items-center space-y-0 py-2"
                    >
                        <House />
                        Accueil
                    </Button>
                </Link>
                <Link href="/semelles">
                    <Button
                        variant={pathname === "/semelles" ? "primary" : "secondary"}
                        className="flex h-auto w-full flex-col items-center space-y-0 py-2"
                    >
                        <Person />
                        Mes semelles
                    </Button>
                </Link>
                <Link href="/visu">
                    <Button
                        variant={pathname === "/visu" ? "primary" : "secondary"}
                        className="flex h-auto w-full flex-col items-center space-y-0 py-2"
                    >
                        <AntennaSignal />
                        En direct
                    </Button>
                </Link>
            </div>
        </nav>
    );
}
