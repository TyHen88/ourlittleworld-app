import "dotenv/config";
import { defineConfig } from "prisma/config";

const url = process.env["DIRECT_URL"] || process.env["DATABASE_URL"];
const directUrl = process.env["DIRECT_URL"];

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    ...(url
        ? {
            datasource: {
                url,
                ...(directUrl ? { directUrl } : {}),
            },
        }
        : {}),
});
