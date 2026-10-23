import { apiClient as client } from "./client";

export interface PredictRequest {
  CreditScore: number;
  Age: number;
  Tenure: number;
  Balance: number;
  NumOfProducts: number;
  HasCrCard: number;
  IsActiveMember: number;
  EstimatedSalary: number;
  Geography: string;
  Gender: string;
}

export interface PredictResponse {
  prediction: number;
  probability: number;
  customer_segment: string;
  shap_values: Record<string, number>;
  recommendations: string[];
  customer_id?: string;
}

export async function predictChurn(data: PredictRequest): Promise<PredictResponse> {
  // frontend should allow optional customer_id in the payload if provided by caller inside `data` object
  // `PredictRequest` currently doesn't include customer_id; callers should pass `{ ...data, customer_id }` by constructing the payload here if needed
  const payload: any = { customer_id: null, features: data };
  const res = await client.post<PredictResponse>("/predict", payload);
  return res.data;
}
