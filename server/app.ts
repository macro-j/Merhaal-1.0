import express, { type ErrorRequestHandler } from "express";
import type { PlanningErrorPayload } from "../shared/tripTypes";
import { GroqTripCopywriter, type TripCopywriter } from "./ai/groqTripCopywriter";
import { PlanningError } from "./planning/errors";
import { createTripsRouter } from "./routes/trips";

export function createApp(copywriter: TripCopywriter = new GroqTripCopywriter()) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));
  app.use("/api/trips", createTripsRouter(copywriter));

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof PlanningError) {
      const payload: PlanningErrorPayload = {
        error: { code: error.code, message: error.message, details: error.details },
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
