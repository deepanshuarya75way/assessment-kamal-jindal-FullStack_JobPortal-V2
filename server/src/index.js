import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import connectDB from "./config/db.js";
import applicationRoutes from "./routes/applications.js";
import authRoutes from "./routes/auth.js";
import jobRoutes from "./routes/jobs.js";

dotenv.config();

const envSchema = z.object({
  MONGO_URI: z.string().min(1, "MONGO_URI is required."),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters."),
  CLIENT_URL: z.string().optional(),
  PORT: z.string().optional(),
  NODE_ENV: z.string().optional()
});

export const env = envSchema.parse(process.env);

const app = express();
const port = process.env.PORT || 5000;
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(currentDir, "../../client/dist");
const clientIndexPath = path.join(clientDistPath, "index.html");
const defaultClientOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5000",
  "http://127.0.0.1:5000"
];
const configuredClientOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...defaultClientOrigins, ...configuredClientOrigins,
  "https://full-stack-job-portal-khnkyab4t-jindalk800-1607s-projects.vercel.app",
  "https://full-stack-job-portal-gilt.vercel.app"]);

const csrfOriginGuard = (req, res, next) => {
  const isSafeMethod = ["GET", "HEAD", "OPTIONS"].includes(req.method);

  if (isSafeMethod || !req.cookies?.jobPortalToken) {
    return next();
  }

  const origin = req.get("origin");

  if (!origin || allowedOrigins.has(origin)) {
    return next();
  }

  return res.status(403).json({ message: "Request origin is not allowed." });
};

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(csrfOriginGuard);

app.get("/api/health", (_req, res) => {
  res.json({ message: "Job Portal API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);

if (fs.existsSync(clientIndexPath)) {
  app.use(express.static(clientDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    return res.sendFile(clientIndexPath);
  });
} else {
  app.get("/", (_req, res) => {
    res.json({ message: "Job Portal API is running. Build client/dist to serve the frontend from Express." });
  });
}

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Something went wrong"
  });
});

export { app };

if (process.env.NODE_ENV !== "test") {
  connectDB();
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}
