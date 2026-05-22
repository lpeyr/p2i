import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/nav";
import { Providers } from "@/providers";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

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
        <html lang="en" className={`${inter.variable} h-full antialiased`}>
            <body className="bg-background text-foreground flex min-h-full flex-col">
                <Providers>
                    {children}
                    <NavBar />
                </Providers>
            </body>
        </html>
    );
}
