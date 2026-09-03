import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import healthCheckRouter from "./routes/healthcheck.routes.ts";
import authRouter from "./routes/auth.routes.ts";

const app = express();
app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}));
app.use(express.static("public"));
app.use(cookieParser());

// cors
app.use(
    cors({
        origin: process.env.CORS_ORIGIN?.split(",") || "http://locahost:5173",
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }),
);
app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);

export default app;
