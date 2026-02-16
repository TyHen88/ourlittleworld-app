import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "OurLittleWorld",
        short_name: "LittleWorld",
        description: "A private digital sanctuary for couples.",
        start_url: "/",
        display: "standalone",
        background_color: "#FDFBF7",
        theme_color: "#FFE4E1",
        icons: [
            {
                src: "/icon-192x192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}
