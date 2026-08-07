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

export const analyticsApi = {
  getSummary: () => client.get<Summary>("/analytics/summary").then(r => r.data),
  getGeography: () => client.get<GeographyItem[]>("/analytics/geography").then(r => r.data),
  getProducts: () => client.get<ProductsItem[]>("/analytics/products").then(r => r.data),
  getActivity: () => client.get<ActivityItem[]>("/analytics/activity").then(r => r.data),
  getModelPerformance: () => client.get<ModelPerformance>("/analytics/model-performance").then(r => r.data),
  getShapSummary: () => client.get<ShapFeatureItem[]>("/analytics/shap-summary").then(r => r.data),
};
