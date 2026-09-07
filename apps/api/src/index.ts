import "dotenv/config";
import express from "express";

import { db } from "@cognis/database";

const app = express();

app.get("/api/health", (_req, res) => {
    return res.json({ message: "Healthy" });
});

try {
    await db.execute("SELECT 1");
    console.log("✅ Database connected");
} catch (error) {
    console.error("Database connection failed:", error);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server started at PORT: ${PORT}`);
});
