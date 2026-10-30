/** Messages must be safe to return to a browser: never include upstream bodies or credentials. */
import type {PlannerDiagnostic} from '../../dynamic-scenarios/diagnostics.ts';
export class AiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly plannerValidation?: PlannerDiagnostic;

  constructor(message: string, code: string, status: number, plannerValidation?: PlannerDiagnostic) {
    super(message);
    this.name = 'AiError';
    this.code = code;
    this.status = status;
    if(plannerValidation)this.plannerValidation=plannerValidation;
  }
}
