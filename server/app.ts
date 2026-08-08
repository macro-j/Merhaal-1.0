import express, { type ErrorRequestHandler } from "express";
import type { PlanningErrorPayload } from "../shared/tripTypes";
import {
  GroqTripCopywriter,
  type TripCopywriter,
} from "./ai/groqTripCopywriter";
import { PlanningError } from "./planning/errors";
import { createTripsRouter } from "./routes/trips";

export function createApp(
  copywriter: TripCopywriter = new GroqTripCopywriter()
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));

  app.get("/api/health", (_request, response) => {
    response.status(200).json({ status: "ok", service: "merhaal-api" });
  });

  app.get("/api/ready", (_request, response) => {
    const aiConfigured = Boolean(process.env.GROQ_API_KEY?.trim());
    response.status(aiConfigured ? 200 : 503).json({
      status: aiConfigured ? "ready" : "not_ready",
      checks: { api: "ok", ai: aiConfigured ? "configured" : "missing" },
    });
  });

  app.use("/api/trips", createTripsRouter(copywriter));

  app.use("/api", (_request, response) => {
    const payload: PlanningErrorPayload = {
      error: { code: "INTERNAL_ERROR", message: "مسار API المطلوب غير موجود." },
    };
    response.status(404).json(payload);
  });

  const errorHandler: ErrorRequestHandler = (
    error,
    _request,
    response,
    _next
  ) => {
    if (error instanceof PlanningError) {
      const payload: PlanningErrorPayload = {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      };
      response.status(error.status).json(payload);
      return;
    }
    console.error("[Server] Unhandled error", error);
    const payload: PlanningErrorPayload = {
      error: { code: "INTERNAL_ERROR", message: "حدث خطأ داخلي غير متوقع." },
    };
    response.status(500).json(payload);
  };
  app.use(errorHandler);
  return app;
}
