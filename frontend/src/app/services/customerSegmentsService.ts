import { apiClient as client } from "./client";

export interface SegmentItem {
  segment_id: number;
  segment: string;
  count: number;
  percentage: number;
  average_age: number;
  average_tenure: number;
  average_monthly_spend: number;
  average_login_frequency: number;
  average_monthly_content_hours: number;
  average_days_since_last_login: number;
  average_content_completion_rate: number;
  average_support_tickets: number;
  average_complaints: number;
  average_satisfaction: number;
  churn_rate: number;
  dominant_subscription_type: string;
  description: string;
  recommendedAction?: string;
}

export const segmentsApi = {
  getSegments: () => client.get<SegmentItem[]>("/analytics/segments").then(r => r.data),
};
