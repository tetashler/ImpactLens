import { randomUUID } from 'node:crypto';
import { parseScenarioRequest, parseScenarioResponse, SCENARIO_LIMITS } from '../../scenarios/contract.ts';
import { planScenario, type PlannerDependencies } from './planner.ts';
import { AiError } from '../ai/errors.ts';
import { readImpactBody, ImpactApiError } from '../impact-api-service.ts';

const json = (value:unknown,status=200) => Response.json(value,{ status,headers:{'Cache-Control':'no-store'} });
export async function handleScenarioRequest(request: Request, overrides: Partial<PlannerDependencies> = {}): Promise<Response> {
  try {
    const url = new URL(request.url), origin = request.headers.get('origin');
    const localOrigin = new URL(`${url.protocol}//${request.headers.get('host') ?? url.host}`).origin;
    if (origin && origin !== localOrigin) throw new AiError('Use planning from the application origin.','SCENARIO_ORIGIN',403);
    if (url.search) throw new AiError('Planning does not accept query parameters.','SCENARIO_REQUEST',400);
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new AiError('Send application/json.','SCENARIO_MEDIA_TYPE',415);
    let input;
    try { input = parseScenarioRequest(await readImpactBody(request)); }
    catch (error) {
      if (error instanceof ImpactApiError) throw new AiError(error.status === 413 ? 'Request exceeds 16 KiB.' : 'Supply a valid JSON planning request.','SCENARIO_REQUEST',error.status);
      throw new AiError('Supply a bounded question, request token and optional user-selected map points.','SCENARIO_REQUEST',400);
    }
    const result = await planScenario(input,request.signal,overrides);
    const response = await parseScenarioResponse({ version:1, requestId:randomUUID(), clientRequestId:input.clientRequestId, ...result },input);
    if (new TextEncoder().encode(JSON.stringify(response)).byteLength > SCENARIO_LIMITS.responseBytes) throw new Error('Response budget');
    return json(response);
  } catch (error) {
    if (error instanceof AiError) return json({ error:error.message, code:error.code },error.status);
    return json({ error:'Unable to prepare a scenario plan. Please retry with a shorter question.',code:'SCENARIO_UNAVAILABLE' },500);
  }
}
