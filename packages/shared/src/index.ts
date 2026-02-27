export type RequestId = string;
export type Version = number;

export interface IntentEnvelope<TPayload> {
  request_id: RequestId;
  expected_version: Version;
  actor_id: string;
  payload: TPayload;
}
