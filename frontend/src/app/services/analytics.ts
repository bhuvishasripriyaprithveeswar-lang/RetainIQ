import { apiClient as client } from "./client";

export interface Summary {
  totalCustomers: number;
  churnCount: number;
  churnRate: number;
  activeCustomers: number;
  inactiveCustomers: number;
}

export interface GeographyItem {
  geography: string;
  total: number;
  churned: number;
  churnRate: number;
}

export interface ProductsItem {
  NumOfProducts: number;
  total: number;
  churned: number;
  churnRate: number;
}

export interface ActivityItem {
  status: string;
  IsActiveMember: number;
  total: number;
  churned: number;
  churnRate: number;
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc: number;
}

export interface ShapFeatureItem {
  feature: string;
  meanAbsShap: number;
}

export interface ChurnByAgeItem {
  age_group: string;
  total: number;
  churned: number;
  churnRate: number;
}

export interface InsightItem {
  tag: string;
  text: string;
  color: string;
}

export interface PredictionHistoryItem {
  id: string;
  customer_id: string;
  prediction: number;
  probability: number;
  segment: string;
  timestamp: string;
}

export const analyticsApi = {
  getSummary: () => client.get<Summary>("/analytics/summary").then(r => r.data),
  getGeography: () => client.get<GeographyItem[]>("/analytics/geography").then(r => r.data),
  getProducts: () => client.get<ProductsItem[]>("/analytics/products").then(r => r.data),
  getActivity: () => client.get<ActivityItem[]>("/analytics/activity").then(r => r.data),
  getModelPerformance: () => client.get<ModelPerformance>("/analytics/model-performance").then(r => r.data),
  getShapSummary: () => client.get<ShapFeatureItem[]>("/analytics/shap-summary").then(r => r.data),
  getChurnByAge: () => client.get<ChurnByAgeItem[]>("/analytics/churn-by-age").then(r => r.data),
  getInsights: () => client.get<InsightItem[]>("/analytics/insights").then(r => r.data),
  getPredictionHistory: () => client.get<PredictionHistoryItem[]>("/predictions/history").then(r => r.data),
};
