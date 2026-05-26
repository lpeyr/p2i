import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/nav";
import { Providers } from "@/providers";

export const metadata: Metadata = {
    title: "Semelle",
    description: "Application de suivi pour le projet P2I.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="h-full antialiased" suppressHydrationWarning>
            <body className="bg-background text-foreground flex min-h-full flex-col">
                <Providers>
                    {children}
                    <NavBar />
                </Providers>
            </body>
        </html>
    );
}
