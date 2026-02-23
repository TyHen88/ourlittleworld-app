import { ImageResponse } from "next/og";
import React from "react";

export const runtime = "edge";

export function GET() {
    const size = 96;

    const heartPath =
        "M12 21s-6.716-4.49-9.428-7.2C.66 11.888.427 9.07 2.1 7.4c1.67-1.67 4.377-1.438 6.3.485L12 11.485l3.6-3.6c1.923-1.923 4.63-2.155 6.3-.485 1.673 1.67 1.44 4.488-.472 6.4C18.716 16.51 12 21 12 21z";

    const iconSize = Math.round(size * 0.67);
    const radius = Math.round(size * 0.25);

    const node = React.createElement(
        "div",
        {
            style: {
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(180deg, #ffffff 0%, #fff1f2 100%)",
                borderRadius: radius,
            },
        },
        React.createElement(
            "div",
            { style: { position: "relative", width: iconSize, height: iconSize, display: "flex" } },
            React.createElement(
                "svg",
                {
                    width: iconSize,
                    height: iconSize,
                    viewBox: "0 0 24 24",
                    fill: "#fb7185",
                    style: { opacity: 0.22 },
                },
                React.createElement("path", { d: heartPath })
            ),
            React.createElement(
                "svg",
                {
                    width: iconSize,
                    height: iconSize,
                    viewBox: "0 0 24 24",
                    fill: "#e11d48",
                    style: { position: "absolute", inset: 0 },
                },
                React.createElement("path", { d: heartPath })
            )
        )
    );

    return new ImageResponse(node, { width: size, height: size });
}
