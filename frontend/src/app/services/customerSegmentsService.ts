import { apiClient as client } from "./client";

export interface SegmentItem {
  segment: string;
  count: number;
  percentage: number;
  description: string;
  recommendedAction: string;
}

export const segmentsApi = {
  getSegments: () => client.get<SegmentItem[]>("/analytics/segments").then(r => r.data),
};
