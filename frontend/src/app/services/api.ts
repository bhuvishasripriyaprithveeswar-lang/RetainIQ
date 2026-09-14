import { apiClient as client } from "./client";

export interface PredictRequest {
  Age: number;
  Gender: string;
  Subscription_Type: string;
  Tenure_Months: number;
  Monthly_Spend: number;
  Login_Frequency: number;
  Avg_Session_Duration: number;
  Monthly_Content_Hours: number;
  Days_Since_Last_Login: number;
  Content_Completion_Rate: number;
  Search_Frequency: number;
  Subscription_Changes: number;
  Payment_Failures: number;
  Support_Tickets: number;
  Complaints_Count: number;
  Discount_Usage: number;
  Auto_Renewal: number;
  Satisfaction_Score: number;
}

export interface PredictResponse {
  customer_id?: string;
  prediction: number;
  probability: number;
  customer_segment: string;
  shap_values: Record<string, number>;
  recommendations: string[];
}

export async function predictChurn(data: PredictRequest, customerId?: string): Promise<PredictResponse> {
  const res = await client.post<PredictResponse>("/predict", {
    customer_id: customerId && customerId.trim() !== "" ? customerId : null,
    features: data,
  });
  return res.data;
}
