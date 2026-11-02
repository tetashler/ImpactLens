import {handleSpeechTranscription} from '../../../../lib/server/speech/service';

export const runtime='nodejs';
export function POST(request:Request) {return handleSpeechTranscription(request);}
