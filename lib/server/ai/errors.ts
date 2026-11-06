/** Messages must be safe to return to a browser: never include upstream bodies or credentials. */
import type {PlannerDiagnostic} from '../../dynamic-scenarios/diagnostics.ts';
export class AiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly plannerValidation?: PlannerDiagnostic;
  readonly retryAfterSeconds?: number;

  constructor(message: string, code: string, status: number, plannerValidation?: PlannerDiagnostic, retryAfterSeconds?: number) {
    super(message);
    this.name = 'AiError';
    this.code = code;
    this.status = status;
    if(plannerValidation)this.plannerValidation=plannerValidation;
    if(typeof retryAfterSeconds==='number'&&Number.isSafeInteger(retryAfterSeconds)&&retryAfterSeconds>=1&&retryAfterSeconds<=86400)this.retryAfterSeconds=retryAfterSeconds;
  }
}
