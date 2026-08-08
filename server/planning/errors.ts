import type { PlanningErrorCode } from "../../shared/tripTypes";

export class PlanningError extends Error {
  constructor(
    public readonly code: PlanningErrorCode,
    message: string,
    public readonly details: string[] = [],
    public readonly status = 422
  ) {
    super(message);
    this.name = "PlanningError";
  }
}
