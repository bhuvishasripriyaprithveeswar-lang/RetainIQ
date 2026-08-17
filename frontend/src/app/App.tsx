import { useState, useEffect, useMemo } from "react";
import { analyticsApi, type Summary, type GeographyItem, type ProductsItem, type ActivityItem, type ModelPerformance, type ShapFeatureItem } from "./services/analytics";
import { dashboardApi } from "./services/dashboardService";

type DashSummary = Summary;
type DashModelPerf = ModelPerformance;
type DashShapItem = ShapFeatureItem;
import { segmentsApi, type SegmentItem } from "./services/customerSegmentsService";
import { predictChurn, type PredictRequest, type PredictResponse } from "./services/api";
import {
  login,
  saveSession,
  getStoredUser,
  getStoredToken,
  clearSession,
  register,
  isTokenValid,
  SESSION_EXPIRED_MESSAGE,
  type AuthUser,
} from "./services/authService";
import {
  LayoutDashboard, Users, TrendingUp, FileText, Settings, Brain,
  ChevronDown, ArrowRight, CheckCircle, Zap,
  Shield, BarChart3, LogOut, Download,
  AlertTriangle, TrendingDown, DollarSign, Activity, Star,
  ChevronRight, RefreshCw, Eye, Layers, Target,
  PieChart, Clock, Mail, Phone, Building2, Globe, Lock,
  User, Palette, Cpu, ArrowUpRight, ArrowDownRight,
  Sparkles,
  ChevronLeft, Database, Search, Check, AlertCircle, Info,
  Filter, HelpCircle, FileCheck, ArrowLeft, Sliders, ExternalLink,
  ShieldAlert, RefreshCcw
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend, BarChart, Bar,
  AreaChart, Area
} from "recharts";

// ─── Design Tokens & Palettes ────────────────────────────────────────────────
const C = {
  primary: "#0F172A",       // Slate 900
  secondary: "#475569",     // Slate 600
  accent1: "#2563EB",       // Enterprise Blue (Primary Brand)
  accent2: "#F59E0B",       // Amber 500 (Warning / Churn Risk)
  bg: "#F8FAFC",            // Slate 50 (Clean Canvas)
  card: "#FFFFFF",          // Pure White
  neutral: "#94A3B8",       // Slate 400
  border: "#E2E8F0",        // Slate 200
  sidebar: "#0F172A",       // Dark Slate Sidebar
  sidebarAccent: "#3B82F6", // Bright Blue
  sidebarText: "#F8FAFC",
  success: "#16A34A",       // Green 600
  danger: "#DC2626",        // Red 600
};

type ThemePreference = "light" | "dark" | "system";

const LIGHT_COLORS = {
  primary: "#0F172A",
  secondary: "#475569",
  accent2: "#F59E0B",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  neutral: "#94A3B8",
  border: "#E2E8F0",
  sidebar: "#0F172A",
  sidebarAccent: "#3B82F6",
  sidebarText: "#F8FAFC",
  success: "#16A34A",
  danger: "#DC2626",
};

const DARK_COLORS = {
  primary: "#F8FAFC",
  secondary: "#94A3B8",
  accent2: "#FBBF24",
  bg: "#0B0F19",
  card: "#111827",
  neutral: "#64748B",
  border: "#334155",
  sidebar: "#0B0F19",
  sidebarAccent: "#3B82F6",
  sidebarText: "#F8FAFC",
  success: "#22C55E",
  danger: "#EF4444",
};

const ACCENT_OPTIONS = [
  { id: "blue", name: "Enterprise Blue", color: "#2563EB", swatches: ["#EFF6FF", "#2563EB", "#1E3A8A"] },
  { id: "indigo", name: "Indigo Violet", color: "#4F46E5", swatches: ["#EEF2FF", "#4F46E5", "#312E81"] },
  { id: "emerald", name: "Emerald Growth", color: "#059669", swatches: ["#ECFDF5", "#059669", "#064E3B"] },
  { id: "slate", name: "Slate Corporate", color: "#334155", swatches: ["#F8FAFC", "#334155", "#0F172A"] },
];

const THEME_STORAGE_KEY = "retailiq_theme";
const ACCENT_STORAGE_KEY = "retailiq_accent";

function getStoredThemePreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "light";
}

function getStoredAccentColor(): string {
  const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
  return ACCENT_OPTIONS.some(option => option.color === stored) ? stored : ACCENT_OPTIONS[0].color;
}

function getEffectiveTheme(theme: ThemePreference): "light" | "dark" {
  if (theme !== "system") return theme;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyAppearance(theme: ThemePreference, accentColor: string) {
  if (typeof document === "undefined") return;
  const effectiveTheme = getEffectiveTheme(theme);
  const palette = effectiveTheme === "dark" ? DARK_COLORS : LIGHT_COLORS;

  C.primary = palette.primary;
  C.secondary = palette.secondary;
  C.accent1 = accentColor;
  C.accent2 = palette.accent2;
  C.bg = palette.bg;
  C.card = palette.card;
  C.neutral = palette.neutral;
  C.border = palette.border;
  C.sidebar = palette.sidebar;
  C.sidebarAccent = accentColor;
  C.sidebarText = palette.sidebarText;
  C.success = palette.success;
  C.danger = palette.danger;

  document.documentElement.classList.toggle("dark", effectiveTheme === "dark");
  document.documentElement.style.setProperty("--primary", accentColor);
  document.documentElement.style.setProperty("--ring", accentColor);
  document.documentElement.style.setProperty("--chart-1", accentColor);
  document.documentElement.style.setProperty("--sidebar-primary", accentColor);
}

// Progressive disclosure helpers
function getShowAdvancedFlag(): boolean {
  try {
    return localStorage.getItem("retailiq_show_advanced") === "1";
  } catch {
    return false;
  }
}

function isAdminUser(): boolean {
  try {
    const u = getStoredUser();
    if (!u || !u.email) return false;
    // Basic heuristic: email containing 'admin' or known admin address
    return u.email.toLowerCase().includes("admin") || u.email.toLowerCase().endsWith("@retailiq.ai");
  } catch {
    return false;
  }
}

// ─── Realistic Datasets ─────────────────────────────────────────────────────
const churnTrendData = [
  { month: "Jan", churnRate: 8.2, retained: 91.8, benchmark: 9.0 },
  { month: "Feb", churnRate: 7.8, retained: 92.2, benchmark: 8.8 },
  { month: "Mar", churnRate: 9.1, retained: 90.9, benchmark: 8.9 },
  { month: "Apr", churnRate: 6.5, retained: 93.5, benchmark: 8.5 },
  { month: "May", churnRate: 7.2, retained: 92.8, benchmark: 8.3 },
  { month: "Jun", churnRate: 5.9, retained: 94.1, benchmark: 8.0 },
  { month: "Jul", churnRate: 6.3, retained: 93.7, benchmark: 7.9 },
  { month: "Aug", churnRate: 4.8, retained: 95.2, benchmark: 7.6 },
];

const predictions = [
  { id: "C-10421", name: "Sarah Mitchell", email: "s.mitchell@retailcorp.com", risk: 87, segment: "High Risk", ltv: "$12,400", date: "2024-07-22", products: 1, active: "No" },
  { id: "C-10388", name: "James Okafor", email: "j.okafor@vertexretail.io", risk: 62, segment: "Low Engagement", ltv: "$8,750", date: "2024-07-21", products: 2, active: "No" },
  { id: "C-10355", name: "Priya Nair", email: "priya.n@synapsemart.co", risk: 34, segment: "Potential Growth", ltv: "$21,200", date: "2024-07-21", products: 2, active: "Yes" },
  { id: "C-10302", name: "Tom Becker", email: "t.becker@finterragroup.com", risk: 91, segment: "High Risk", ltv: "$5,300", date: "2024-07-20", products: 3, active: "No" },
  { id: "C-10289", name: "Aisha Kamara", email: "aisha@horizonsretail.ai", risk: 18, segment: "High Value Loyal", ltv: "$34,600", date: "2024-07-20", products: 2, active: "Yes" },
  { id: "C-10264", name: "Marcus Vance", email: "m.vance@apexmerchants.com", risk: 76, segment: "High Risk", ltv: "$9,150", date: "2024-07-19", products: 1, active: "No" },
];

const predictionHistory = [
  { id: "P-2847", customer: "Sarah Mitchell", date: "Jul 22, 2024", risk: 87, action: "Personalized Retention Email", outcome: "Pending", segment: "High Risk" },
  { id: "P-2831", customer: "Tom Becker", date: "Jul 20, 2024", risk: 91, action: "Dedicated Store Manager Call", outcome: "Converted", segment: "High Risk" },
  { id: "P-2819", customer: "Hana Yuki", date: "Jul 19, 2024", risk: 55, action: "15% Loyalty Tier Discount", outcome: "Converted", segment: "Low Engagement" },
  { id: "P-2804", customer: "Luca Romano", date: "Jul 18, 2024", risk: 72, action: "Re-engagement SMS Series", outcome: "Churned", segment: "High Risk" },
  { id: "P-2791", customer: "Fatima Al-Amin", date: "Jul 17, 2024", risk: 29, action: "Standard Newsletter", outcome: "Active", segment: "Potential Growth" },
  { id: "P-2778", customer: "David Chen", date: "Jul 16, 2024", risk: 68, action: "Free Express Shipping Upgrade", outcome: "Converted", segment: "Low Engagement" },
];

// ─── HCI Helpers ─────────────────────────────────────────────────────────────
function riskColor(r: number) {
  if (r >= 75) return "#DC2626"; // Red 600
  if (r >= 45) return "#D97706"; // Amber 600
  return "#16A34A";             // Green 600
}

function riskBadgeClass(r: number) {
  if (r >= 75) return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800";
  if (r >= 45) return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
  return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
}

function riskLabel(r: number) {
  if (r >= 75) return "Critical / High Risk";
  if (r >= 45) return "Moderate Attention";
  return "Healthy / Low Risk";
}

// ─── HCI Shared Components ───────────────────────────────────────────────────
function Badge({
  children,
  variant = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "neutral" | "primary";
  className?: string;
}) {
  const styles = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    danger: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    primary: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    neutral: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}

function SkeletonLoader({ height = "h-4", width = "w-full", className = "" }: { height?: string; width?: string; className?: string }) {
  return <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded ${height} ${width} ${className}`} />;
}

function KPICard({
  icon: Icon,
  label,
  value,
  subtext,
  change,
  changeDir,
  badgeText,
  badgeVariant = "info",
  loading = false,
  color = C.accent1,
}: {
  icon: any;
  label: string;
  value: string | number;
  subtext?: string;
  change?: string;
  changeDir?: "up" | "down" | "neutral";
  badgeText?: string;
  badgeVariant?: "success" | "warning" | "danger" | "info" | "neutral";
  loading?: boolean;
  color?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow transition-all duration-150 relative overflow-hidden group">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
          style={{ backgroundColor: `${color}14`, color }}
        >
          <Icon size={20} />
        </div>
        {badgeText && <Badge variant={badgeVariant}>{badgeText}</Badge>}
        {change && (
          <span
            className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
              changeDir === "up"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : changeDir === "down"
                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {changeDir === "up" && <ArrowUpRight size={13} />}
            {changeDir === "down" && <ArrowDownRight size={13} />}
            {change}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">{label}</p>
        {loading ? (
          <SkeletonLoader height="h-8" width="w-28" className="my-1" />
        ) : (
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight font-sans">{value}</p>
        )}
        {subtext && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtext}</p>}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon?: any;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm ${className}`}>
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Icon size={16} />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-none">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}

function ErrorAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 flex items-start gap-3">
      <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
      <div className="flex-1 text-xs">
        <p className="font-semibold">Unable to complete request</p>
        <p className="mt-0.5 opacity-90">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-md border border-rose-300 dark:border-rose-700 hover:bg-rose-100 dark:hover:bg-slate-800 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon = Info,
  title,
  description,
  actionText,
  onAction,
}: {
  icon?: any;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 mb-3">
        <Icon size={22} />
      </div>
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-200">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

// ─── Sidebar Navigation ──────────────────────────────────────────────────────
const navItems = [
  { id: "dashboard", label: "Executive Dashboard", icon: LayoutDashboard, badge: "Live" },
  { id: "predict", label: "Predict Customer", icon: Brain, badge: "AI" },
  { id: "result", label: "Prediction Result", icon: Target },
  { id: "segments", label: "Customer Segments", icon: Layers },
  { id: "analytics", label: "Analytics & Trends", icon: BarChart3 },
  { id: "reports", label: "Reports & Logs", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

function Sidebar({
  active,
  onNav,
  collapsed,
  onToggle,
  displayName,
  displayInitials,
  onLogout,
}: {
  active: string;
  onNav: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  displayName: string;
  displayInitials: string;
  onLogout: () => void;
}) {
  return (
    <aside
      className="flex flex-col h-screen sticky top-0 transition-all duration-200 z-30 select-none bg-slate-900 text-slate-300 border-r border-slate-800"
      style={{ width: collapsed ? 72 : 256, minWidth: collapsed ? 72 : 256 }}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800/80">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
          <Brain size={20} />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-none tracking-tight">RetailIQ</p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Enterprise Analytics</p>
          </div>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors ml-auto"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Role / Persona Banner */}
      {!collapsed && (
        <div className="px-4 py-2.5 mx-3 mt-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">Context View</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-slate-200 font-medium truncate">Store Manager / Analytics</p>
        </div>
      )}

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {navItems.map(({ id, label, icon: Icon, badge }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onNav(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 group relative ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/70"
              }`}
            >
              <Icon size={18} className={`${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"} shrink-0`} />
              {!collapsed && <span className="truncate">{label}</span>}
              {!collapsed && badge && !isActive && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {displayInitials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-100 truncate">{displayName}</p>
              <p className="text-[11px] text-slate-400 truncate">Store Admin</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

// ─── Top Navbar ──────────────────────────────────────────────────────────────
function Topbar({
  title,
  onNav,
  displayInitials,
  onRefresh,
  refreshing = false,
}: {
  title: string;
  onNav?: (id: string) => void;
  displayInitials?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(() => getShowAdvancedFlag());

  useEffect(() => {
    function onT(e: any) {
      setShowAdvanced(Boolean(e?.detail));
    }
    window.addEventListener("retailiq:advanced-toggled", onT as EventListener);
    return () => window.removeEventListener("retailiq:advanced-toggled", onT as EventListener);
  }, []);

  function toggleAdvanced() {
    const next = !showAdvanced;
    try {
      localStorage.setItem("retailiq_show_advanced", next ? "1" : "0");
    } catch {}
    setShowAdvanced(next);
    window.dispatchEvent(new CustomEvent("retailiq:advanced-toggled", { detail: next }));
  }
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between px-6 py-3 sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">RetailIQ</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isAdminUser() && (
          <button
            onClick={toggleAdvanced}
            title="Toggle Advanced Insights"
            className={`text-xs px-3 py-1 rounded-full border ${showAdvanced ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
          >
            {showAdvanced ? "Advanced: ON" : "Advanced: OFF"}
          </button>
        )}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-medium text-[11px]">Backend API: Connected</span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh analytics data"
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>
        )}

        <div
          onClick={() => onNav?.("settings")}
          className="w-8 h-8 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center text-xs font-bold cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all shadow-xs"
        >
          {displayInitials ?? "?"}
        </div>
      </div>
    </header>
  );
}

// ─── Screen: Landing Page ────────────────────────────────────────────────────
function LandingPage({ onNav }: { onNav: (id: string) => void }) {
  const features = [
    {
      icon: Layers,
      title: "Hybrid Stacking Ensemble",
      desc: "Combines XGBoost, LightGBM, and Logistic Regression to achieve 86.4% test accuracy for churn detection.",
    },
    {
      icon: Eye,
      title: "SHAP Explainability",
      desc: "Explain individual customer predictions with precise mathematical feature attribution values.",
    },
    {
      icon: Users,
      title: "KMeans Customer Cohorts",
      desc: "Segments retail customers into actionable behavioral clusters to prioritize targeted retention playbooks.",
    },
    {
      icon: BarChart3,
      title: "Interactive Analytics",
      desc: "Comprehensive operational reporting on regional churn, product holdings, and customer health metrics.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <nav className="flex items-center justify-between px-8 lg:px-16 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Brain size={18} />
          </div>
          <span className="font-bold text-base tracking-tight">RetailIQ</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNav("login")}
            className="text-xs font-semibold px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => onNav("register")}
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
          >
            Create Account
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-8 lg:px-16 pt-16 pb-20 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-medium">
              <Sparkles size={13} />
              <span>Explainable AI Retail Intelligence</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight leading-tight">
              Enterprise Customer Retention & Churn Prediction Platform
            </h1>

            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
              Anticipate customer departures before they happen. RetailIQ combines stacked ML classifiers with SHAP attribution to deliver actionable, explainable insights tailored for retail store managers.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNav("login")}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg"
              >
                Access Dashboard
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => onNav("register")}
                className="px-6 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
              >
                Register Free Trial
              </button>
            </div>
          </div>

          {/* Hero Visual Card */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[11px] font-mono text-slate-400">model-v1.0 • stacking-ensemble</span>
              </div>

              {/* Sample Prediction Card */}
              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">Sarah Mitchell (C-10421)</p>
                    <p className="text-[11px] text-slate-400">Balance: $12,400 • France</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
                    87% Risk
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: "87%" }} />
                </div>
                <p className="text-[11px] text-slate-300">
                  <span className="font-semibold text-amber-300">Top Driver:</span> Inactive Member Status (+0.0439 SHAP impact)
                </p>
              </div>

              {/* Stat Pills */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50">
                  <p className="text-sm font-bold text-white">86.4%</p>
                  <p className="text-[10px] text-slate-400">Accuracy</p>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50">
                  <p className="text-sm font-bold text-white">10,000</p>
                  <p className="text-[10px] text-slate-400">Portfolio</p>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50">
                  <p className="text-sm font-bold text-emerald-400">94%</p>
                  <p className="text-[10px] text-slate-400">Precision</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-8 lg:px-16 py-16 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Enterprise Capabilities</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Engineered with advanced machine learning architectures for transparent, reliable retail business decisions.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-xs"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6-Step Workflow */}
      <section className="px-8 lg:px-16 py-16 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">6-Step AI Retention Pipeline</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">From raw customer transactional features to automated retention interventions.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            [Database, "1. Customer Ingestion", "Aggregates credit, demographic, tenure, and product usage records."],
            [RefreshCw, "2. Data Preprocessing", "Applies RobustScaler normalization and one-hot encoding on raw vectors."],
            [Layers, "3. Stacking Ensemble", "Combines XGBoost + LightGBM + Logistic Regression for high-precision scoring."],
            [Eye, "4. SHAP Explainability", "Calculates exact Shapley values to pinpoint individual risk contributors."],
            [PieChart, "5. KMeans Cohorting", "Groups customers into 4 distinct behavioral clusters based on engagement."],
            [Sparkles, "6. Retention Playbook", "Generates targeted promotional and outreach recommendations."],
          ].map(([Icon, title, desc]: any) => (
            <div key={title} className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

// ─── Screen: Login ───────────────────────────────────────────────────────────
function LoginPage({
  onNav,
  onLogin,
  notice,
}: {
  onNav: (id: string) => void;
  onLogin: (user: AuthUser) => void;
  notice?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    if (!email || !pass) return;
    setLoading(true);
    setError(null);
    try {
      const data = await login(email, pass);
      saveSession(data);
      onLogin(data.user);
      onNav("dashboard");
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? "Invalid credentials. Please verify your email and password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-12 font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Left Form Panel */}
      <div className="lg:col-span-6 flex flex-col justify-center px-8 sm:px-16 py-12 bg-white dark:bg-slate-900">
        <div className="max-w-md w-full mx-auto space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Brain size={18} />
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100">RetailIQ</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Sign in to your account</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Access real-time customer analytics and AI predictions.</p>
          </div>

          {notice && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {error && <ErrorAlert message={error} />}

          if (error) {
            return (
              <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
                <EmptyState
                  title="Analytics dataset unavailable"
                  description="Training dataset not found. Prediction functionality remains available."
                />
              </div>
            );
          }

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSignIn()}
                  placeholder="admin@retailiq.ai"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSignIn()}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleSignIn}
              disabled={loading || !email || !pass}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {loading && <RefreshCw size={14} className="animate-spin" />}
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </div>

          <p className="text-xs text-center text-slate-500 dark:text-slate-400 pt-2">
            Don't have an account?{" "}
            <button onClick={() => onNav("register")} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Create an account
            </button>
          </p>
        </div>
      </div>

      {/* Right Feature Showcase Panel */}
      <div className="hidden lg:flex lg:col-span-6 flex-col justify-center px-12 py-12 bg-slate-900 text-white border-l border-slate-800">
        <div className="max-w-md mx-auto space-y-6">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
            <Brain size={22} className="text-white" />
          </div>

          <h3 className="text-2xl font-bold tracking-tight">AI-Powered Churn Prevention</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Gain immediate visibility into customer risk indicators, explainable model attributions, and retention opportunities.
          </p>

          <div className="space-y-3 pt-2">
            {[
              "Real-time customer scoring with XGBoost & LightGBM",
              "SHAP feature importance on individual profiles",
              "Automated KMeans clustering for cohort analysis",
              "PDF and CSV export for executive presentations",
            ].map(text => (
              <div key={text} className="flex items-center gap-3 text-xs text-slate-300">
                <CheckCircle size={15} className="text-emerald-400 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen: Register ────────────────────────────────────────────────────────
function RegisterPage({ onNav }: { onNav: (id: string) => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function validate(): string | null {
    if (!fullName.trim()) return "Full name is required.";
    if (!email.includes("@") || !email.includes(".")) return "Enter a valid email address.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirm) return "Passwords do not match.";
    return null;
  }

  async function handleRegister() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(fullName.trim(), email, password);
      setSuccess(true);
      setTimeout(() => onNav("login"), 1500);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((d: any) => d.msg).join(" ") : detail ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-12 font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="lg:col-span-6 flex flex-col justify-center px-8 sm:px-16 py-12 bg-white dark:bg-slate-900">
        <div className="max-w-md w-full mx-auto space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Brain size={18} />
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100">RetailIQ</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Create an Account</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Get started with AI-driven churn analytics.</p>
          </div>

          {error && <ErrorAlert message={error} />}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle size={15} className="shrink-0" />
              <span>Account created successfully! Redirecting to sign in...</span>
            </div>
          )}

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Mithra N"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@retailiq.ai"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={loading || success || !fullName || !email || !password}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm mt-2"
            >
              {loading && <RefreshCw size={14} className="animate-spin" />}
              {loading ? "Creating..." : "Create Account"}
            </button>
          </div>

          <p className="text-xs text-center text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <button onClick={() => onNav("login")} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex lg:col-span-6 flex-col justify-center px-12 py-12 bg-slate-900 text-white border-l border-slate-800">
        <div className="max-w-md mx-auto space-y-4">
          <h3 className="text-xl font-bold tracking-tight">Deploy Production-Grade Analytics</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Monitor customer attrition, visualize model SHAP attributions, and coordinate proactive retention campaigns across all retail operations.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Screen: Dashboard ───────────────────────────────────────────────────────
function Dashboard({ onNav }: { onNav: (id: string) => void }) {
  const [summary, setSummary] = useState<DashSummary | null>(null);
  const [modelPerf, setModelPerf] = useState<DashModelPerf | null>(null);
  const [shapData, setShapData] = useState<DashShapItem[]>([]);
  const [segments, setSegments] = useState<SegmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const analyticsUnavailable = Boolean(error);
  const [searchFilter, setSearchFilter] = useState("");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(() => getShowAdvancedFlag());

  useEffect(() => {
    function onT(e: any) {
      setShowAdvanced(Boolean(e?.detail));
    }
    window.addEventListener("retailiq:advanced-toggled", onT as EventListener);
    return () => window.removeEventListener("retailiq:advanced-toggled", onT as EventListener);
  }, []);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      dashboardApi.getSummary(),
      dashboardApi.getModelPerformance(),
      dashboardApi.getShapSummary(),
      segmentsApi.getSegments(),
    ])
      .then(([s, m, sh, seg]) => {
        setSummary(s);
        setModelPerf(m);
        setShapData(sh);
        setSegments(seg);
      })
      .catch((e: any) => setError(e?.message ?? "Failed to load dashboard data from backend server."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const segmentColorMap: Record<string, string> = {
    "High Value Loyal": "#10B981", // Emerald
    "Potential Growth": "#3B82F6", // Blue
    "Low Engagement": "#F59E0B",   // Amber
    "High Risk": "#EF4444",        // Red
  };

  const dashboardSegmentData = segments.map(seg => ({
    name: seg.segment,
    value: seg.percentage,
    count: seg.count,
    color: segmentColorMap[seg.segment] ?? "#64748B",
  }));

  const filteredPredictions = useMemo(() => {
    if (!searchFilter.trim()) return predictions;
    const q = searchFilter.toLowerCase();
    return predictions.filter(
      p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.segment.toLowerCase().includes(q)
    );
  }, [searchFilter]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Welcome & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Executive Dashboard</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time portfolio overview, churn risk detection, and model diagnostics.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNav("predict")}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Brain size={15} />
            <span>New Prediction</span>
          </button>
          <button
            onClick={() => onNav("reports")}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <FileText size={15} />
            <span>Export Reports</span>
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadData} />}

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Users}
          label="Total Portfolio"
          value={loading ? "—" : summary ? summary.totalCustomers.toLocaleString() : "10,000"}
          subtext="Total accounts tracked"
          color="#2563EB"
          loading={loading}
          badgeText="Full Set"
          badgeVariant="info"
        />
        <KPICard
          icon={AlertTriangle}
          label="Churned Accounts"
          value={loading ? "—" : summary ? summary.churnCount.toLocaleString() : "2,037"}
          subtext="Total historical exits"
          color="#DC2626"
          loading={loading}
          badgeText="Action Needed"
          badgeVariant="danger"
        />
        <KPICard
          icon={TrendingDown}
          label="Overall Churn Rate"
          value={loading ? "—" : summary ? `${(summary.churnRate * 100).toFixed(1)}%` : "20.4%"}
          subtext="Portfolio attrition rate"
          change="0.8%"
          changeDir="down"
          color="#D97706"
          loading={loading}
        />
        <KPICard
          icon={Activity}
          label="Active Members"
          value={loading ? "—" : summary ? summary.activeCustomers.toLocaleString() : "5,151"}
          subtext="Engaged customers (51.5%)"
          color="#16A34A"
          loading={loading}
          badgeText="Engaged"
          badgeVariant="success"
        />
      </div>

      {/* Row 2: Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Churn Trend Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Monthly Churn Rate Trend</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">8-Month historical trajectory vs retention benchmark</p>
            </div>
            <Badge variant="neutral">Historical Track</Badge>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={churnTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="churnGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.6} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    color: "#F8FAFC",
                    fontSize: 12,
                    borderRadius: 8,
                    padding: "8px 12px",
                  }}
                  formatter={(val: number) => [`${val}%`, "Churn Rate"]}
                />
                <Area type="monotone" dataKey="churnRate" stroke="#2563EB" strokeWidth={2.5} fill="url(#churnGradient)" name="Churn Rate" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Segments Donut */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Customer Segments</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">KMeans behavioral cohorts</p>
            </div>
            <button onClick={() => onNav("segments")} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              View details
            </button>
          </div>

          <div className="h-44 w-full my-auto">
            {analyticsUnavailable ? (
              <div className="h-full flex items-center justify-center">
                <EmptyState
                  title="Analytics dataset unavailable"
                  description="Training dataset not found. Prediction functionality remains available."
                />
              </div>
            ) : loading ? (
              <div className="h-full flex items-center justify-center">
                <SkeletonLoader height="h-32" width="w-32" className="rounded-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={dashboardSegmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {dashboardSegmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      borderColor: "#334155",
                      color: "#F8FAFC",
                      fontSize: 12,
                      borderRadius: 8,
                    }}
                    formatter={(val: number) => [`${val}%`, "Cohort Share"]}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {dashboardSegmentData.map(s => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{s.name}</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Operational Table + AI Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Predictions Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Recent Customer Inferences</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Scored through Stacking ML Classifier</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-1 focus:ring-blue-500 w-44"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Churn Risk</th>
                  <th className="px-4 py-3">Cohort</th>
                  <th className="px-4 py-3">LTV Value</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPredictions.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{p.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div className="h-1.5 rounded-full" style={{ width: `${p.risk}%`, backgroundColor: riskColor(p.risk) }} />
                        </div>
                        <span className="font-bold text-xs" style={{ color: riskColor(p.risk) }}>
                          {p.risk}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${riskBadgeClass(p.risk)}`}>
                        {p.segment}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{p.ltv}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onNav("predict")}
                        className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 text-xs font-semibold transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Actionable Insights Feed */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Sparkles size={15} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">AI Retention Feed</h3>
              <p className="text-[11px] text-slate-400">Prioritized operational actions</p>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {[
              {
                tag: "CRITICAL",
                badge: "danger",
                title: "Inactive High-Balance Accounts",
                desc: "14 accounts with >$50K balance showed zero logins this week. Automated high-priority CSM outreach triggered.",
              },
              {
                tag: "OPPORTUNITY",
                badge: "success",
                title: "Loyal Segment Expansion",
                desc: "High-value loyal cluster grew by 3.2%. Ideal moment to offer multi-product enrollment.",
              },
              {
                tag: "PATTERN",
                badge: "warning",
                title: "Single Product Vulnerability",
                desc: "Customers holding only 1 product have a 27.7% churn rate vs 7.6% for customers holding 2 products.",
              },
            ].map(({ tag, badge, title, desc }: any) => (
              <div key={title} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">{tag}</span>
                  <Badge variant={badge}>{badge === "danger" ? "Urgent" : badge === "success" ? "Positive" : "Notice"}</Badge>
                </div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{title}</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Business summary with optional Advanced Insights */}
      <div className="grid grid-cols-1 gap-6">
        {showAdvanced ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Target size={15} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Advanced Insights</h3>
                  <p className="text-[11px] text-slate-400">Technical model diagnostics for administrators</p>
                </div>
              </div>
              <Badge variant="info">Optional</Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-5">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Target size={15} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Model Performance</h3>
                    <p className="text-[11px] text-slate-400">Held-out validation metrics</p>
                  </div>
                </div>

                {analyticsUnavailable ? (
                  <EmptyState
                    title="Analytics dataset unavailable"
                    description="Training dataset not found. Prediction functionality remains available."
                  />
                ) : loading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <SkeletonLoader key={i} height="h-6" />
                    ))}
                  </div>
                ) : modelPerf ? (
                  <div className="space-y-3.5">
                    {[
                      ["Accuracy", modelPerf.accuracy, "#2563EB"],
                      ["Precision", modelPerf.precision, "#4F46E5"],
                      ["Recall", modelPerf.recall, "#D97706"],
                      ["F1-Score", modelPerf.f1Score, "#059669"],
                      ["ROC-AUC", modelPerf.rocAuc, "#10B981"],
                    ].map(([label, val, barColor]: any) => (
                      <div key={label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">{label}</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{(val * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div className="h-1.5 rounded-full transition-all duration-300" style={{ width: `${val * 100}%`, backgroundColor: barColor }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <BarChart3 size={15} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Feature Importance (SHAP)</h3>
                      <p className="text-[11px] text-slate-400">Mean absolute contribution to customer risk</p>
                    </div>
                  </div>
                  <Badge variant="info">XAI Engine</Badge>
                </div>

                <div className="h-56 w-full">
                  {analyticsUnavailable ? (
                    <div className="h-full flex items-center justify-center">
                      <EmptyState
                        title="Analytics dataset unavailable"
                        description="Training dataset not found. Prediction functionality remains available."
                      />
                    </div>
                  ) : loading ? (
                    <div className="h-full flex items-center justify-center">
                      <SkeletonLoader height="h-44" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={shapData.slice(0, 6)} layout="vertical" barSize={12} margin={{ left: 100, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.6} horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                        <YAxis
                          type="category"
                          dataKey="feature"
                          tick={{ fontSize: 11, fill: "#334155" }}
                          axisLine={false}
                          tickLine={false}
                          width={100}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0F172A",
                            borderColor: "#334155",
                            color: "#F8FAFC",
                            fontSize: 12,
                            borderRadius: 8,
                          }}
                          formatter={(v: number) => [v.toFixed(4), "Mean |SHAP| Value"]}
                        />
                        <Bar dataKey="meanAbsShap" radius={[0, 4, 4, 0]} fill="#2563EB" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 pb-3 mb-4">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                <Info size={15} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Business Overview</h3>
                <p className="text-[11px] text-slate-400">Default view for operational decisions and customer actions.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500">Portfolio Health</p>
                <p className="text-sm font-bold mt-1">Stable</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500">Priority Alerts</p>
                <p className="text-sm font-bold mt-1">3 actions</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500">Recommended Response</p>
                <p className="text-sm font-bold mt-1">Targeted outreach</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500">Trend Signal</p>
                <p className="text-sm font-bold mt-1">Improving</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Screen: Predict Customer ─────────────────────────────────────────────────
function PredictCustomer({
  onNav,
  onResult,
}: {
  onNav: (id: string) => void;
  onResult: (r: PredictResponse) => void;
}) {
  const defaultForm: PredictRequest = {
    CreditScore: 650,
    Age: 35,
    Tenure: 5,
    Balance: 75000,
    NumOfProducts: 2,
    HasCrCard: 1,
    IsActiveMember: 1,
    EstimatedSalary: 60000,
    Geography: "France",
    Gender: "Female",
  };

  const [form, setForm] = useState<PredictRequest>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setNum(key: keyof PredictRequest, val: string) {
    setForm(f => ({ ...f, [key]: val === "" ? 0 : Number(val) }));
  }
  function setStr(key: keyof PredictRequest, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  const loadPreset = (type: "highRisk" | "loyal") => {
    if (type === "highRisk") {
      setForm({
        CreditScore: 510,
        Age: 52,
        Tenure: 1,
        Balance: 128000,
        NumOfProducts: 1,
        HasCrCard: 0,
        IsActiveMember: 0,
        EstimatedSalary: 45000,
        Geography: "Germany",
        Gender: "Female",
      });
    } else {
      setForm({
        CreditScore: 780,
        Age: 32,
        Tenure: 8,
        Balance: 92000,
        NumOfProducts: 2,
        HasCrCard: 1,
        IsActiveMember: 1,
        EstimatedSalary: 95000,
        Geography: "France",
        Gender: "Male",
      });
    }
  };

  async function handlePredict() {
    setLoading(true);
    setError(null);
    try {
      const result = await predictChurn(form);
      onResult(result);
      onNav("result");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Prediction failed. Ensure the FastAPI backend server is online.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Customer Risk Assessment</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review risk level, business drivers, and recommended action for each customer.
          </p>
        </div>

        {/* Quick Presets for Demo / Testing */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadPreset("highRisk")}
            className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-md border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors"
          >
            Load High-Risk Sample
          </button>
          <button
            type="button"
            onClick={() => loadPreset("loyal")}
            className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-md border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
          >
            Load Loyal Sample
          </button>
          <button
            type="button"
            onClick={() => setForm(defaultForm)}
            className="px-2 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-medium"
            title="Reset to default"
          >
            Reset
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="space-y-6">
        {/* Section 1: Demographics */}
        <SectionCard title="1. Customer Demographics & Portfolio" icon={User} subtitle="Base customer metrics and account balance">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Credit Score <span className="text-slate-400 font-normal">(300 - 850)</span>
              </label>
              <input
                type="number"
                min={300}
                max={850}
                value={form.CreditScore}
                onChange={e => setNum("CreditScore", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Age (Years) <span className="text-slate-400 font-normal">(18 - 100)</span>
              </label>
              <input
                type="number"
                min={18}
                max={100}
                value={form.Age}
                onChange={e => setNum("Age", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tenure (Years with Bank)
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={form.Tenure}
                onChange={e => setNum("Tenure", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Account Balance ($)</label>
              <input
                type="number"
                min={0}
                value={form.Balance}
                onChange={e => setNum("Balance", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Estimated Salary ($)</label>
              <input
                type="number"
                min={0}
                value={form.EstimatedSalary}
                onChange={e => setNum("EstimatedSalary", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Number of Products</label>
              <select
                value={form.NumOfProducts}
                onChange={e => setNum("NumOfProducts", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value={1}>1 Product</option>
                <option value={2}>2 Products</option>
                <option value={3}>3 Products</option>
                <option value={4}>4 Products</option>
              </select>
            </div>
          </div>
        </SectionCard>

        {/* Section 2: Account Status & Geography */}
        <SectionCard title="2. Account Profile & Geographic Region" icon={Building2} subtitle="Behavioral flags and geographic origin">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Geography</label>
              <select
                value={form.Geography}
                onChange={e => setStr("Geography", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="France">France</option>
                <option value="Germany">Germany</option>
                <option value="Spain">Spain</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Gender</label>
              <select
                value={form.Gender}
                onChange={e => setStr("Gender", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Has Credit Card</label>
              <select
                value={form.HasCrCard}
                onChange={e => setNum("HasCrCard", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Yes (Active Card)</option>
                <option value={0}>No Card</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Is Active Member</label>
              <select
                value={form.IsActiveMember}
                onChange={e => setNum("IsActiveMember", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Yes (Regular Activity)</option>
                <option value={0}>No (Inactive)</option>
              </select>
            </div>
          </div>
        </SectionCard>

        {/* Action Controls */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handlePredict}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs transition-all shadow-md hover:shadow-lg"
          >
            <Brain size={16} />
            {loading ? "Assessing customer risk..." : "Run Risk Assessment"}
          </button>
          <button
            onClick={() => setForm(defaultForm)}
            className="px-5 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-300 dark:border-slate-700 transition-colors shadow-xs"
          >
            Reset Form
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Screen: Prediction Result ────────────────────────────────────────────────
function PredictionResult({
  onNav,
  result,
}: {
  onNav: (id: string) => void;
  result: PredictResponse | null;
}) {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(() => getShowAdvancedFlag());

  useEffect(() => {
    function onT(e: any) {
      setShowAdvanced(Boolean(e?.detail));
    }
    window.addEventListener("retailiq:advanced-toggled", onT as EventListener);
    return () => window.removeEventListener("retailiq:advanced-toggled", onT as EventListener);
  }, []);

  if (!result) {
    return (
      <div className="p-12 max-w-xl mx-auto font-sans">
        <EmptyState
          icon={Target}
          title="No Prediction Generated"
          description="Submit customer attributes to review risk level, key reasons, and recommended actions for this customer."
          actionText="Open Prediction Form"
          onAction={() => onNav("predict")}
        />
      </div>
    );
  }

  const probability = Math.round(result.probability * 100);
  const showAdvancedInsights = isAdminUser() && showAdvanced;
  const shapEntries = Object.entries(result.shap_values).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  const businessReasons = shapEntries.slice(0, 3).map(([feature, impact]) => {
    const label = feature
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^\s+|\s+$/g, "");

    const businessLabel = {
      IsActiveMember: "Customer inactivity",
      Balance: "High account balance",
      NumOfProducts: "Limited product coverage",
      Tenure: "Short customer tenure",
      CreditScore: "Lower credit profile",
      EstimatedSalary: "Lower income profile",
      Geography: "Regional risk factor",
      HasCrCard: "Limited banking engagement",
      Age: "Age-related risk pattern",
    }[feature] ?? label;

    return {
      label: businessLabel,
      detail: impact >= 0 ? "This is increasing churn risk." : "This is supporting retention.",
      impact,
    };
  });

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Customer Risk Review</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Business-focused risk summary, priority actions, and alerts for customer retention teams.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNav("predict")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            New Prediction
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center flex flex-col items-center justify-center">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Churn Risk</p>
          <div className="relative inline-flex items-center justify-center w-36 h-36 my-2">
            <svg width={144} height={144} viewBox="0 0 144 144">
              <circle cx="72" cy="72" r="54" fill="none" stroke="#E2E8F0" strokeWidth="12" className="dark:stroke-slate-800" />
              <circle
                cx="72"
                cy="72"
                r="54"
                fill="none"
                stroke={riskColor(probability)}
                strokeWidth="12"
                strokeDasharray={`${(probability / 100) * 339.3} 339.3`}
                strokeLinecap="round"
                transform="rotate(-90 72 72)"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100">{probability}%</span>
              <span className="text-[11px] font-semibold mt-0.5" style={{ color: riskColor(probability) }}>
                {probability >= 50 ? "High Risk" : "Low Risk"}
              </span>
            </div>
          </div>
          <Badge variant={probability >= 75 ? "danger" : probability >= 45 ? "warning" : "success"} className="mt-2">
            {riskLabel(probability)}
          </Badge>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Key Reasons</p>
          <div className="space-y-3">
            {businessReasons.map(reason => (
              <div key={reason.label} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Driver</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{reason.label}</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">{reason.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Recommended Actions</p>
          <div className="space-y-3">
            {result.recommendations.slice(0, 3).map((rec, index) => (
              <div key={index} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">{index === 0 ? "Immediate" : index === 1 ? "Short term" : "Ongoing"}</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <AlertTriangle size={16} className="text-amber-500" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Priority Alerts</h3>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm font-medium">
              {probability >= 75 ? "Escalate to store manager within 48 hours." : "Maintain regular follow-up cadence and monitor engagement."}
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300">
              Cohort: {result.customer_segment} • Risk band: {riskLabel(probability)}
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300">
              Recommended response: {result.recommendations[0]}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <TrendingUp size={16} className="text-emerald-500" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Business Outcome Snapshot</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="text-[11px] text-slate-400 uppercase">Customer Segment</p>
              <p className="text-sm font-bold mt-1 text-slate-900 dark:text-slate-100">{result.customer_segment}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="text-[11px] text-slate-400 uppercase">Retention Status</p>
              <p className="text-sm font-bold mt-1 text-slate-900 dark:text-slate-100">{probability >= 50 ? "Needs intervention" : "Healthy"}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="text-[11px] text-slate-400 uppercase">Priority</p>
              <p className="text-sm font-bold mt-1 text-slate-900 dark:text-slate-100">{probability >= 75 ? "High" : probability >= 45 ? "Medium" : "Low"}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="text-[11px] text-slate-400 uppercase">Suggested Channel</p>
              <p className="text-sm font-bold mt-1 text-slate-900 dark:text-slate-100">{probability >= 75 ? "Manager outreach" : "Digital campaign"}</p>
            </div>
          </div>
        </div>
      </div>

      {showAdvancedInsights && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Advanced Insights</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Administrator-only technical diagnostics and model confidence</p>
              </div>
              <Badge variant="info">Advanced</Badge>
            </div>

            <div className="space-y-2.5 pt-2">
              {[
                ["Prediction Confidence", 94, "#2563EB"],
                ["Data Completeness", 100, "#10B981"],
                ["Ensemble Agreement", 91, "#6366F1"],
              ].map(([label, val, col]: any) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-bold">{val}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="h-1.5 rounded-full" style={{ width: `${val}%`, backgroundColor: col }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Local SHAP Feature Importance</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Administrator-only model attribution detail</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-rose-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  <span>Risk</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span>Protects</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              {shapEntries.map(([feature, impact]) => {
                const isRisk = impact >= 0;
                const pct = Math.min(Math.abs(impact) * 350, 100);
                return (
                  <div key={feature} className="flex items-center gap-4 text-xs">
                    <div className="w-48 font-medium text-slate-700 dark:text-slate-300 shrink-0 truncate">{feature}</div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                        {isRisk ? (
                          <div className="h-full bg-rose-500 rounded-full ml-auto" style={{ width: `${pct}%` }} />
                        ) : (
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                        )}
                      </div>
                    </div>
                    <div className={`w-16 text-right font-mono font-bold ${isRisk ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {impact >= 0 ? "+" : ""}{impact.toFixed(4)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Screen: Customer Segments ────────────────────────────────────────────────
function CustomerSegments() {
  const [segments, setSegments] = useState<SegmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSegments = () => {
    setLoading(true);
    setError(null);
    segmentsApi
      .getSegments()
      .then(setSegments)
      .catch((e: any) => setError(e?.message ?? "Failed to load customer segments."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSegments();
  }, []);

  const totalCustomers = segments.reduce((s, x) => s + x.count, 0);

  const colorMap: Record<string, string> = {
    "High Value Loyal": "#10B981",
    "Potential Growth": "#3B82F6",
    "Low Engagement": "#F59E0B",
    "High Risk": "#EF4444",
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">KMeans Customer Cohorts</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Behavioral clustering across {totalCustomers.toLocaleString()} total portfolio records.
          </p>
        </div>
        <button
          onClick={fetchSegments}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Re-cluster Dataset</span>
        </button>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchSegments} />}

      if (error) {
        return (
          <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
            <EmptyState
              title="Analytics dataset unavailable"
              description="Training dataset not found. Prediction functionality remains available."
            />
          </div>
        );
      }

      {/* 4 Segment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading
          ? [...Array(4)].map((_, i) => <SkeletonLoader key={i} height="h-44" />)
          : segments.map(seg => {
              const segColor = colorMap[seg.segment] ?? "#64748B";
              return (
                <div
                  key={seg.segment}
                  className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: segColor }} />
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{seg.segment}</h3>
                    </div>
                    <Badge variant={seg.segment.includes("Risk") ? "danger" : seg.segment.includes("Loyal") ? "success" : "info"}>
                      {seg.percentage}% Share
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-1">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <p className="text-[11px] text-slate-400">Customer Count</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{seg.count.toLocaleString()}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <p className="text-[11px] text-slate-400">Cohort Proportion</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{seg.percentage}%</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{seg.description}</p>

                  <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-xs">
                    <p className="font-semibold text-blue-900 dark:text-blue-300">Recommended Operational Action</p>
                    <p className="text-[11px] text-blue-800 dark:text-blue-200 mt-0.5">{seg.recommendedAction}</p>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Distribution Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">Cohort Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Customer proportions by KMeans segment</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie data={segments} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="count" nameKey="segment">
                  {segments.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colorMap[entry.segment] ?? "#64748B"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    color: "#F8FAFC",
                    fontSize: 12,
                    borderRadius: 8,
                  }}
                  formatter={(val: number) => [`${val.toLocaleString()} Customers`, "Cohort Size"]}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">Cohort Volume Breakdown</h3>
          <p className="text-xs text-slate-500 mb-4">Total accounts in each group</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={segments} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.6} vertical={false} />
                <XAxis dataKey="segment" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    color: "#F8FAFC",
                    fontSize: 12,
                    borderRadius: 8,
                  }}
                  formatter={(val: number) => [val.toLocaleString(), "Total Customers"]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {segments.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={colorMap[entry.segment] ?? "#2563EB"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen: Analytics ────────────────────────────────────────────────────────
function Analytics() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [geography, setGeography] = useState<GeographyItem[]>([]);
  const [products, setProducts] = useState<ProductsItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [modelPerf, setModelPerf] = useState<ModelPerformance | null>(null);
  const [shapData, setShapData] = useState<ShapFeatureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsApi.getSummary(),
      analyticsApi.getGeography(),
      analyticsApi.getProducts(),
      analyticsApi.getActivity(),
      analyticsApi.getModelPerformance(),
      analyticsApi.getShapSummary(),
    ])
      .then(([s, g, p, a, m, sh]) => {
        setSummary(s);
        setGeography(g);
        setProducts(p);
        setActivity(a);
        setModelPerf(m);
        setShapData(sh);
      })
      .catch((e: any) => setError(e?.message ?? "Failed to load analytics data."))
      .finally(() => setLoading(false));
  }, []);

  const geoChartData = geography.map(g => ({
    name: g.geography,
    total: g.total,
    churned: g.churned,
    churnRate: +(g.churnRate * 100).toFixed(1),
  }));

  const productsChartData = products.map(p => ({
    name: `${p.NumOfProducts} Product${p.NumOfProducts > 1 ? "s" : ""}`,
    churnRate: +(p.churnRate * 100).toFixed(1),
    retained: +((1 - p.churnRate) * 100).toFixed(1),
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Portfolio Analytics &amp; Demographics</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Multi-dimensional breakdown of churn drivers across geography, holdings, and user activity.
        </p>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Users}
          label="Total Dataset"
          value={loading ? "—" : summary ? summary.totalCustomers.toLocaleString() : "10,000"}
          color="#2563EB"
          loading={loading}
        />
        <KPICard
          icon={AlertTriangle}
          label="Total Churned"
          value={loading ? "—" : summary ? summary.churnCount.toLocaleString() : "2,037"}
          color="#DC2626"
          loading={loading}
        />
        <KPICard
          icon={TrendingDown}
          label="Portfolio Churn Rate"
          value={loading ? "—" : summary ? `${(summary.churnRate * 100).toFixed(1)}%` : "20.4%"}
          color="#D97706"
          loading={loading}
        />
        <KPICard
          icon={Activity}
          label="Active Accounts"
          value={loading ? "—" : summary ? summary.activeCustomers.toLocaleString() : "5,151"}
          color="#16A34A"
          loading={loading}
        />
      </div>

      {/* Geography & Product Tier Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geography */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">Attrition by Geographic Region</h3>
          <p className="text-xs text-slate-500 mb-4">Total portfolio vs churn volume by country</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={geoChartData} barSize={26}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.6} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    color: "#F8FAFC",
                    fontSize: 12,
                    borderRadius: 8,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total" fill="#94A3B8" radius={[4, 4, 0, 0]} name="Total Customers" />
                <Bar dataKey="churned" fill="#DC2626" radius={[4, 4, 0, 0]} name="Churned Accounts" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Holdings */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">Churn Rate by Product Tier</h3>
          <p className="text-xs text-slate-500 mb-4">Churn vs retention % per number of products held</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={productsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.6} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    color: "#F8FAFC",
                    fontSize: 12,
                    borderRadius: 8,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="churnRate" stroke="#DC2626" strokeWidth={2.5} dot={{ r: 4, fill: "#DC2626" }} name="Churn Rate %" />
                <Line type="monotone" dataKey="retained" stroke="#16A34A" strokeWidth={2.5} dot={{ r: 4, fill: "#16A34A" }} name="Retained %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Status & SHAP Global Mean */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">Active vs Inactive Customer Behavior</h3>
          <p className="text-xs text-slate-500 mb-4">Impact of engagement status on customer exits</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activity} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.6} vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    color: "#F8FAFC",
                    fontSize: 12,
                    borderRadius: 8,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total" fill="#94A3B8" radius={[4, 4, 0, 0]} name="Total Members" />
                <Bar dataKey="churned" fill="#D97706" radius={[4, 4, 0, 0]} name="Exited Members" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global SHAP Ranking */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">Global Feature Impact (SHAP)</h3>
          <p className="text-xs text-slate-500 mb-4">Mean absolute impact across 11 features</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shapData} layout="vertical" barSize={11} margin={{ left: 110 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.6} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="feature" tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} width={110} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    color: "#F8FAFC",
                    fontSize: 12,
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="meanAbsShap" fill="#2563EB" radius={[0, 4, 4, 0]} name="Mean |SHAP|" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen: Reports & Export Center ──────────────────────────────────────────
function exportCSV(result: PredictResponse, timestamp: string, customerId: string) {
  const rows = [
    ["Customer ID", "Prediction", "Probability", "Cohort Segment", "Timestamp"],
    [
      customerId,
      result.prediction === 1 ? "Likely Exited" : "Retained",
      `${Math.round(result.probability * 100)}%`,
      result.customer_segment,
      timestamp,
    ],
  ];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `retailiq-prediction-report-${customerId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(result: PredictResponse, timestamp: string, customerId: string) {
  const probability = Math.round(result.probability * 100);
  const shapEntries = Object.entries(result.shap_values)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 5);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>RetailIQ Executive Report</title><style>
    body{font-family:'Segoe UI',Roboto,Helvetica,sans-serif;color:#0F172A;padding:32px;max-width:760px;margin:0 auto;line-height:1.5}
    .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #E2E8F0;padding-bottom:16px;margin-bottom:24px}
    .logo{font-size:20px;font-weight:800;color:#2563EB}
    .meta{font-size:12px;color:#64748B;text-align:right}
    .title{font-size:18px;font-weight:700;margin-bottom:16px}
    .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:24px}
    .card{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 16px}
    .card-label{font-size:11px;color:#64748B;text-transform:uppercase;font-weight:600}
    .card-val{font-size:16px;font-weight:700;margin-top:4px}
    .risk-high{color:#DC2626}.risk-low{color:#16A34A}
    table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:12px}
    th{background:#F1F5F9;text-align:left;padding:8px 12px;border:1px solid #E2E8F0}
    td{padding:8px 12px;border:1px solid #E2E8F0}
    .rec-box{background:#EFF6FF;border-left:4px solid #2563EB;padding:10px 14px;margin-bottom:8px;font-size:12px;border-radius:0 6px 6px 0}
    .footer{margin-top:40px;font-size:11px;color:#94A3B8;text-align:center;border-top:1px solid #E2E8F0;padding-top:12px}
  </style></head><body>
    <div class="header">
      <div class="logo">RetailIQ Analytics</div>
      <div class="meta">Generated: ${timestamp}<br/>Customer Reference: ${customerId}</div>
    </div>
    <div class="title">Customer Churn Diagnostic Report</div>
    <div class="grid">
      <div class="card"><div class="card-label">Customer ID</div><div class="card-val">${customerId}</div></div>
      <div class="card"><div class="card-label">Churn Probability</div><div class="card-val ${probability >= 50 ? "risk-high" : "risk-low"}">${probability}% (${probability >= 50 ? "High Risk" : "Low Risk"})</div></div>
      <div class="card"><div class="card-label">KMeans Cohort</div><div class="card-val">${result.customer_segment}</div></div>
      <div class="card"><div class="card-label">Model Classification</div><div class="card-val">${result.prediction === 1 ? "Class 1 (Will Exit)" : "Class 0 (Retained)"}</div></div>
    </div>
    <div style="font-weight:700;font-size:14px;margin-bottom:8px">Top SHAP Risk Drivers</div>
    <table>
      <thead><tr><th>Feature Attribute</th><th style="text-align:right">SHAP Impact Value</th><th>Impact Direction</th></tr></thead>
      <tbody>
        ${shapEntries.map(([f, v]) => `<tr><td>${f}</td><td style="text-align:right;font-family:monospace;font-weight:700">${v >= 0 ? "+" : ""}${v.toFixed(4)}</td><td style="color:${v >= 0 ? "#DC2626" : "#16A34A"}">${v >= 0 ? "Increases Churn" : "Protects Retention"}</td></tr>`).join("")}
      </tbody>
    </table>
    <div style="font-weight:700;font-size:14px;margin-bottom:8px">Retention Recommendations</div>
    ${result.recommendations.map(r => `<div class="rec-box">${r}</div>`).join("")}
    <div class="footer">RetailIQ • Explainable AI Churn Prediction System • Confidential</div>
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  win.close();
}

function Reports({ result }: { result: PredictResponse | null }) {
  const timestamp = result ? new Date().toLocaleString() : "";
  const customerId = result ? `C-${String(result.probability).replace(".", "").slice(0, 5)}` : "";
  const probability = result ? Math.round(result.probability * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Reports &amp; Export Center</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Download executive audit summaries and view customer inference histories.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => result && exportCSV(result, timestamp, customerId)}
            disabled={!result}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors shadow-xs"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => result && exportPDF(result, timestamp, customerId)}
            disabled={!result}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-40 transition-colors shadow-xs"
          >
            <FileText size={14} />
            <span>Print PDF Report</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Brain} label="Total Inferences" value="2,847" color="#2563EB" badgeText="Logged" badgeVariant="info" />
        <KPICard icon={CheckCircle} label="Interventions" value="1,203" color="#10B981" badgeText="84% Delivery" badgeVariant="success" />
        <KPICard icon={TrendingUp} label="Churns Prevented" value="891" color="#F59E0B" change="+14%" changeDir="up" />
        <KPICard icon={DollarSign} label="Portfolio Protected" value="$1.8M" color="#059669" change="+22%" changeDir="up" />
      </div>

      {/* Latest Report Preview */}
      {result ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileCheck size={18} className="text-blue-600" />
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Active Inference Record ({customerId})</h3>
            </div>
            <Badge variant={probability >= 50 ? "danger" : "success"}>
              {probability}% {probability >= 50 ? "High Risk" : "Low Risk"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-slate-400 font-medium">Customer ID</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">{customerId}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-slate-400 font-medium">Prediction Outcome</p>
              <p className="font-bold mt-0.5" style={{ color: result.prediction === 1 ? "#DC2626" : "#16A34A" }}>
                {result.prediction === 1 ? "Will Churn" : "Will Retain"}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-slate-400 font-medium">Cohort Cluster</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">{result.customer_segment}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-slate-400 font-medium">Timestamp</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">{timestamp}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-500">Run a single customer prediction to generate an exportable PDF and CSV dossier.</p>
        </div>
      )}

      {/* History Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Historical Prediction Audit Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Inference ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Risk Assessment</th>
                <th className="px-4 py-3">Intervention Action</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {predictionHistory.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-slate-500">{p.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{p.customer}</td>
                  <td className="px-4 py-3 text-slate-500">{p.date}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${riskBadgeClass(p.risk)}`}>
                      {p.risk}% Risk
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.action}</td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant={p.outcome === "Converted" ? "success" : p.outcome === "Churned" ? "danger" : "warning"}>
                      {p.outcome}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Screen: Settings ─────────────────────────────────────────────────────────
function SettingsPage({
  user,
  themePreference,
  accentColor,
  onThemeChange,
  onAccentChange,
  onLogout,
}: {
  user: AuthUser | null;
  themePreference: ThemePreference;
  accentColor: string;
  onThemeChange: (theme: ThemePreference) => void;
  onAccentChange: (color: string) => void;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState("profile");
  const fullName = user?.full_name ?? getStoredUser()?.full_name ?? "RetailIQ Administrator";
  const email = user?.email ?? getStoredUser()?.email ?? "admin@retailiq.ai";
  const initials = fullName
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto font-sans">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Platform Settings</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage operator profile, color theme, and analytics preferences.</p>
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        {/* Navigation Tabs */}
        <div className="md:col-span-4 space-y-1">
          {[
            { id: "profile", label: "Operator Profile", icon: User },
            { id: "theme", label: "Display & Theme", icon: Palette },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === id
                  ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <LogOut size={16} />
              <span>Sign Out Session</span>
            </button>
          </div>
        </div>

        {/* Tab Content Panel */}
        <div className="md:col-span-8">
          {tab === "profile" && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Operator Profile Information</h3>
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
                  {initials}
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{fullName}</p>
                  <p className="text-xs text-slate-400">{email}</p>
                  <Badge variant="info" className="mt-1">
                    Store Manager / Admin
                  </Badge>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Email Address</label>
                  <input
                    type="text"
                    value={email}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "theme" && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">Theme Appearance</h3>
                <p className="text-xs text-slate-500 mb-4">Choose your preferred lighting mode for the platform.</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "light", label: "Light Mode" },
                    { id: "dark", label: "Dark Mode" },
                    { id: "system", label: "System Default" },
                  ].map(({ id, label }: any) => {
                    const active = themePreference === id;
                    return (
                      <button
                        key={id}
                        onClick={() => onThemeChange(id)}
                        className={`p-3 rounded-lg border text-xs font-semibold transition-all text-center ${
                          active
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-1 ring-blue-600"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">Primary Accent Color</h3>
                <p className="text-xs text-slate-500 mb-4">Select the primary highlight color for cards, buttons, and charts.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {ACCENT_OPTIONS.map(({ name, color, swatches }) => {
                    const active = accentColor === color;
                    return (
                      <button
                        key={name}
                        onClick={() => onAccentChange(color)}
                        className={`p-3 rounded-lg border text-left text-xs transition-all ${
                          active
                            ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-600"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex gap-1 mb-2">
                          {swatches.map((c, i) => (
                            <span key={i} className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{name}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── App Shell & Router Orchestration ────────────────────────────────────────
const screenTitles: Record<string, string> = {
  dashboard: "Executive Dashboard",
  predict: "Predict Customer Churn",
  result: "Prediction & XAI Result",
  segments: "Customer Segments",
  analytics: "Portfolio Analytics",
  reports: "Reports & Logs",
  settings: "Platform Settings",
};

const protectedScreens = new Set(Object.keys(screenTitles));

function isProtectedScreen(screen: string) {
  return protectedScreens.has(screen);
}

function getInitialAuthState(): { screen: string; user: AuthUser | null; notice: string | null } {
  if (typeof window === "undefined") {
    return { screen: "landing", user: null, notice: null };
  }

  const token = getStoredToken();
  const savedScreen = sessionStorage.getItem("retailiq_current_screen");

  if (!savedScreen) {
    if (token && isTokenValid(token)) {
      const user = getStoredUser();
      return { screen: "landing", user, notice: null };
    }
    return { screen: "landing", user: null, notice: null };
  }

  if (!token) {
    let targetScreen = "landing";
    if (savedScreen === "register" || savedScreen === "login") {
      targetScreen = savedScreen;
    }
    return { screen: targetScreen, user: null, notice: null };
  }

  if (!isTokenValid(token)) {
    clearSession();
    sessionStorage.removeItem("retailiq_current_screen");
    if (isProtectedScreen(savedScreen)) {
      return { screen: "login", user: null, notice: SESSION_EXPIRED_MESSAGE };
    }
    return { screen: "landing", user: null, notice: null };
  }

  const user = getStoredUser();
  if (!user) {
    clearSession();
    sessionStorage.removeItem("retailiq_current_screen");
    if (isProtectedScreen(savedScreen)) {
      return { screen: "login", user: null, notice: SESSION_EXPIRED_MESSAGE };
    }
    return { screen: "landing", user: null, notice: null };
  }

  return { screen: savedScreen, user, notice: null };
}

function AuthGuard({
  user,
  onUnauthenticated,
  children,
}: {
  user: AuthUser | null;
  onUnauthenticated: () => void;
  children: React.ReactNode;
}) {
  const isAuthenticated = Boolean(user && isTokenValid(getStoredToken()));

  useEffect(() => {
    if (!isAuthenticated) {
      onUnauthenticated();
    }
  }, [isAuthenticated, onUnauthenticated]);

  if (!isAuthenticated) return null;

  return <>{children}</>;
}

export default function App() {
  const [initialAuthState] = useState(getInitialAuthState);
  const [screen, setScreen] = useState(initialAuthState.screen);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictResponse | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(initialAuthState.user);
  const [loginNotice, setLoginNotice] = useState<string | null>(initialAuthState.notice);
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => getStoredThemePreference());
  const [accentColor, setAccentColor] = useState(() => getStoredAccentColor());

  applyAppearance(themePreference, accentColor);

  useEffect(() => {
    sessionStorage.setItem("retailiq_current_screen", screen);
  }, [screen]);

  useEffect(() => {
    if (themePreference !== "system" || typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      applyAppearance("system", accentColor);
    };

    media.addEventListener("change", handleSystemThemeChange);
    return () => media.removeEventListener("change", handleSystemThemeChange);
  }, [themePreference, accentColor]);

  function handleThemeChange(theme: ThemePreference) {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    setThemePreference(theme);
  }

  function handleAccentChange(color: string) {
    localStorage.setItem(ACCENT_STORAGE_KEY, color);
    setAccentColor(color);
  }

  function redirectToLogin(notice: string | null = null) {
    clearSession();
    setAuthUser(null);
    setLoginNotice(notice);
    setScreen("login");
  }

  function navigateToScreen(nextScreen: string) {
    if (isProtectedScreen(nextScreen)) {
      const token = getStoredToken();
      if (!token) {
        redirectToLogin();
        return;
      }

      if (!isTokenValid(token)) {
        redirectToLogin(SESSION_EXPIRED_MESSAGE);
        return;
      }

      const user = authUser ?? getStoredUser();
      if (!user) {
        redirectToLogin(SESSION_EXPIRED_MESSAGE);
        return;
      }

      setAuthUser(user);
    }

    if (nextScreen !== "login") {
      setLoginNotice(null);
    }
    setScreen(nextScreen);
  }

  function handleLogout() {
    clearSession();
    setAuthUser(null);
    setScreen("landing");
  }

  const displayName = authUser?.full_name ?? "Store Administrator";
  const displayInitials = displayName
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (screen === "landing") {
    return <LandingPage onNav={navigateToScreen} />;
  }

  if (screen === "register") {
    return <RegisterPage onNav={navigateToScreen} />;
  }

  if (screen === "login") {
    return <LoginPage onNav={navigateToScreen} onLogin={setAuthUser} notice={loginNotice} />;
  }

  return (
    <AuthGuard user={authUser} onUnauthenticated={() => redirectToLogin(SESSION_EXPIRED_MESSAGE)}>
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
        <Sidebar
          active={screen}
          onNav={navigateToScreen}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
          displayName={displayName}
          displayInitials={displayInitials}
          onLogout={handleLogout}
        />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Topbar
            title={screenTitles[screen] || screen}
            onNav={navigateToScreen}
            displayInitials={displayInitials}
          />
          <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950" style={{ scrollbarWidth: "thin" }}>
            {screen === "dashboard" && <Dashboard onNav={navigateToScreen} />}
            {screen === "predict" && <PredictCustomer onNav={navigateToScreen} onResult={setPredictionResult} />}
            {screen === "result" && <PredictionResult onNav={navigateToScreen} result={predictionResult} />}
            {screen === "segments" && <CustomerSegments />}
            {screen === "analytics" && <Analytics />}
            {screen === "reports" && <Reports result={predictionResult} />}
            {screen === "settings" && (
              <SettingsPage
                user={authUser}
                themePreference={themePreference}
                accentColor={accentColor}
                onThemeChange={handleThemeChange}
                onAccentChange={handleAccentChange}
                onLogout={handleLogout}
              />
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
