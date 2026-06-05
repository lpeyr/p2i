import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Semelle",
        short_name: "Semelle",
        description: "Application de suivi pour le projet de semelle connectée",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#589c00",
        icons: [
            { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
        ],
    };
}
