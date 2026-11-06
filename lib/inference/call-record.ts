import type {InferenceCallRecordV1} from '../stakeholder-simulation/inference-contract.ts';
/** Browser-safe social accounting, including bounded transport validation diagnostics. */
export interface InferenceCallRecord extends InferenceCallRecordV1 {socialValidationRule?:string;socialValidationPath?:string}
