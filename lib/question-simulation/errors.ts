import type {StakeholderSimulationRunV1} from '../stakeholder-simulation/contract.ts';
const messages:Record<string,string>={
 AI_PROVIDER_IDENTITY:'The required serving model and provider could not be verified.',
 AI_TIMEOUT:'A participant model call timed out. Start a new attempt.',
 AI_CONFIG:'Live inference is not configured or enabled on the server.',
 AI_INVALID_RESPONSE:'The provider returned an invalid structured action.',
 AI_RATE_LIMIT:'The provider rate limit was reached.',
 AI_UPSTREAM:'The provider could not complete a participant call.',
 AI_UNSUPPORTED_MODEL:'The provider could not supply the required structured output.',
 STAKEHOLDER_CALL_BUDGET:'The bounded inference budget was exhausted.',
 CANCELLED:'The recorded execution was cancelled.',
 TURN_FAILED:'A participant turn could not be generated or accepted.',
};
/** Display finite local text; a run remains immutable and keeps its original record. */
export function questionRunErrorMessage(run:StakeholderSimulationRunV1):string|null{
 return run.error?(Object.hasOwn(messages,run.error.code)?messages[run.error.code]:'This execution did not complete safely.'):null;
}
