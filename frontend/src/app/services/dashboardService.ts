// Dashboard data service — delegates to existing analytics endpoints
export type { Summary, ModelPerformance, ShapFeatureItem } from "./analytics";
export { analyticsApi as dashboardApi } from "./analytics";
