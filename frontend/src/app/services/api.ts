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
}

export async function predictChurn(data: PredictRequest): Promise<PredictResponse> {
  const res = await client.post<PredictResponse>("/predict", { customer_id: null, features: data });
  return res.data;
}
