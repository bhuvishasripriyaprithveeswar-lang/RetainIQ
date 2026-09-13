import { useState, useEffect, useLayoutEffect, useMemo } from "react";
import { analyticsApi, type Summary, type GeographyItem, type ProductsItem, type ActivityItem, type ModelPerformance, type ShapFeatureItem, type PredictionHistoryItem } from "./services/analytics";

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
  Sparkles, Lightbulb,
  ChevronLeft, Database
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend, BarChart, Bar,
  AreaChart, Area
} from "recharts";

// --- Color tokens ----------------------------------------------------------
const C = {
  primary: "#424658",
  secondary: "#6C739C",
  accent1: "#C56B62",
  accent2: "#DEA785",
  bg: "#F0DAD5",
  card: "#FFFFFF",
  neutral: "#BABBB1",
  sidebarAccent: "#D9A69F",
  sidebar: "#424658",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  input: "#FAF6F5",
  border: "#D8C7C1",
  success: "#3F8F66",
  chart2: "#6C739C",
  chart3: "#DEA785",
};

type ThemePreference = "light" | "dark" | "system";

type AccentId = "terracotta" | "ocean" | "forest";

type AccentOption = {
  id: AccentId;
  name: string;
  color: string;
  swatches: string[];
  light: {
    accent2: string;
    bg: string;
    sidebarAccent: string;
    chart2: string;
    chart3: string;
  };
  dark: {
    accent2: string;
    sidebarAccent: string;
    chart2: string;
    chart3: string;
  };
};

const BASE_LIGHT_COLORS = {
  primary: "#424658",
  secondary: "#6C739C",
  card: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFCFB",
  input: "#FAF6F5",
  neutral: "#BABBB1",
  border: "#D8C7C1",
  sidebar: "#424658",
  success: "#3F8F66",
};

const BASE_DARK_COLORS = {
  primary: "#F6F7FB",
  secondary: "#AEB8CB",
  bg: "#10141D",
  card: "#181E2A",
  surface: "#151B26",
  surfaceElevated: "#202838",
  input: "#111823",
  neutral: "#7F8AA0",
  border: "#2B3547",
  sidebar: "#0B111B",
  success: "#5CBF8A",
};

const ACCENT_OPTIONS: AccentOption[] = [
  {
    id: "terracotta",
    name: "Terracotta",
    color: "#C56B62",
    swatches: ["#F0DAD5", "#C56B62", "#424658"],
    light: { accent2: "#DEA785", bg: "#F0DAD5", sidebarAccent: "#D9A69F", chart2: "#6C739C", chart3: "#DEA785" },
    dark: { accent2: "#D9A783", sidebarAccent: "#E0A197", chart2: "#8D97C5", chart3: "#D9A783" },
  },
  {
    id: "ocean",
    name: "Ocean",
    color: "#2563EB",
    swatches: ["#E8F4FD", "#2563EB", "#1E3A5F"],
    light: { accent2: "#38BDF8", bg: "#E8F4FD", sidebarAccent: "#93C5FD", chart2: "#1E3A5F", chart3: "#38BDF8" },
    dark: { accent2: "#38BDF8", sidebarAccent: "#60A5FA", chart2: "#7DD3FC", chart3: "#93C5FD" },
  },
  {
    id: "forest",
    name: "Forest",
    color: "#4A7C59",
    swatches: ["#F0F4EF", "#4A7C59", "#2D4A3E"],
    light: { accent2: "#8DAA6D", bg: "#F0F4EF", sidebarAccent: "#A7C59B", chart2: "#2D4A3E", chart3: "#8DAA6D" },
    dark: { accent2: "#A3C585", sidebarAccent: "#8FC98E", chart2: "#70A982", chart3: "#B4D08B" },
  },
];

const THEME_STORAGE_KEY = "retainiq_theme";
const ACCENT_STORAGE_KEY = "retainiq_accent";
const RETAINIQ_LOGO_SRC = "/retainiq-logo.png";

function getStoredThemePreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "light";
}

function getStoredAccentColor(): string {
  const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
  return ACCENT_OPTIONS.some(option => option.color === stored) ? stored : ACCENT_OPTIONS[0].color;
}

function getAccentOption(accentColor: string): AccentOption {
  return ACCENT_OPTIONS.find(option => option.color === accentColor) ?? ACCENT_OPTIONS[0];
}

function getEffectiveTheme(theme: ThemePreference): "light" | "dark" {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function buildAppearance(theme: "light" | "dark", accentColor: string) {
  const accent = getAccentOption(accentColor);
  const base = theme === "dark" ? BASE_DARK_COLORS : BASE_LIGHT_COLORS;
  const accentPalette = theme === "dark" ? accent.dark : accent.light;
  return {
    ...base,
    ...accentPalette,
    accent1: accent.color,
  };
}

function setCssVar(name: string, value: string) {
  document.documentElement.style.setProperty(name, value);
}

function applyAppearance(theme: "light" | "dark", accentColor: string) {
  const palette = buildAppearance(theme, accentColor);

  Object.assign(C, palette);

  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.retainiqTheme = theme;
  document.documentElement.dataset.retainiqAccent = getAccentOption(accentColor).id;
  document.documentElement.style.colorScheme = theme;

  setCssVar("--background", palette.bg);
  setCssVar("--foreground", palette.primary);
  setCssVar("--card", palette.card);
  setCssVar("--card-foreground", palette.primary);
  setCssVar("--popover", palette.surfaceElevated);
  setCssVar("--popover-foreground", palette.primary);
  setCssVar("--primary", palette.accent1);
  setCssVar("--primary-foreground", "#FFFFFF");
  setCssVar("--secondary", palette.secondary);
  setCssVar("--secondary-foreground", "#FFFFFF");
  setCssVar("--muted", palette.surface);
  setCssVar("--muted-foreground", palette.neutral);
  setCssVar("--accent", palette.accent2);
  setCssVar("--accent-foreground", theme === "dark" ? "#0B111B" : palette.primary);
  setCssVar("--destructive", palette.accent1);
  setCssVar("--destructive-foreground", "#FFFFFF");
  setCssVar("--border", palette.border);
  setCssVar("--input", palette.border);
  setCssVar("--input-background", palette.input);
  setCssVar("--switch-background", palette.neutral);
  setCssVar("--ring", palette.accent1);
  setCssVar("--chart-1", palette.accent1);
  setCssVar("--chart-2", palette.chart2);
  setCssVar("--chart-3", palette.chart3);
  setCssVar("--chart-4", palette.sidebarAccent);
  setCssVar("--chart-5", palette.primary);
  setCssVar("--sidebar", palette.sidebar);
  setCssVar("--sidebar-foreground", "#FFFFFF");
  setCssVar("--sidebar-primary", palette.accent1);
  setCssVar("--sidebar-primary-foreground", "#FFFFFF");
  setCssVar("--sidebar-accent", palette.sidebarAccent);
  setCssVar("--sidebar-accent-foreground", theme === "dark" ? "#0B111B" : palette.primary);
  setCssVar("--sidebar-border", theme === "dark" ? "#202A3A" : "rgba(255,255,255,0.12)");
  setCssVar("--sidebar-ring", palette.sidebarAccent);

  return palette;
}

// --- Mock data removed - replaced with real backend data --------------------
// churnTrendData -> GET /analytics/churn-by-age
// predictions -> GET /predictions/history
// revenueData -> not available from current dataset
// clusterData -> kept for segment visualization, populated by GET /analytics/segments
// predictionHistory -> GET /predictions/history

// --- Utility ----------------------------------------------------------------
function riskColor(r: number) {
  if (r >= 75) return C.accent1;
  if (r >= 45) return C.accent2;
  return C.success;
}

function riskLabel(r: number) {
  if (r >= 75) return "High Risk";
  if (r >= 45) return "Medium";
  return "Low Risk";
}

// --- Shared Components -------------------------------------------------------
function Badge({ children, color = C.accent1 }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: color + "22", color }}>
      {children}
    </span>
  );
}

function BrandLogo({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={RETAINIQ_LOGO_SRC}
      alt="RetainIQ logo"
      className={`object-contain shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

function KPICard({ icon: Icon, label, value, change, changeDir, color = C.secondary }: any) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border" style={{ borderColor: C.neutral + "40" }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + "18" }}>
          <Icon size={20} style={{ color }} />
        </div>
        {change && (
          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: changeDir === "up" ? C.success : C.accent1 }}>
            {changeDir === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold mb-1" style={{ color: C.primary }}>{value}</p>
      <p className="text-sm" style={{ color: C.neutral }}>{label}</p>
    </div>
  );
}

// --- Sidebar -----------------------------------------------------------------
const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "predict", label: "Predict Customer", icon: Brain },
  { id: "result", label: "Prediction Result", icon: Target },
  { id: "segments", label: "Customer Segments", icon: Layers },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

function Sidebar({ active, onNav, collapsed, onToggle, displayName, displayInitials, onLogout }: {
  active: string; onNav: (id: string) => void; collapsed: boolean; onToggle: () => void;
  displayName: string; displayInitials: string; onLogout: () => void;
}) {
  return (
    <aside
      className="flex flex-col h-screen sticky top-0 transition-all duration-300 z-20"
      style={{ width: collapsed ? 72 : 240, background: C.sidebar, minWidth: collapsed ? 72 : 240 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <BrandLogo size={36} />
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-sm leading-none">RetainIQ</p>
            <p className="text-xs mt-0.5" style={{ color: C.sidebarAccent }}>AI Churn Platform</p>
          </div>
        )}
        <button onClick={onToggle} className="ml-auto text-white opacity-50 hover:opacity-100 transition-opacity">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onNav(id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-150 relative group"
              style={{
                color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
              }}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full" style={{ background: C.accent1 }} />
              )}
              <Icon size={18} style={{ color: isActive ? C.sidebarAccent : "rgba(255,255,255,0.55)", flexShrink: 0 }} />
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: C.sidebarAccent, color: C.primary }}>
            {displayInitials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{displayName}</p>
              <p className="text-xs truncate" style={{ color: C.sidebarAccent }}>Admin</p>
            </div>
          )}
          {!collapsed && <LogOut size={15} onClick={onLogout} style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0, cursor: "pointer" }} />}
        </div>
      </div>
    </aside>
  );
}

// --- Top Navbar ---------------------------------------------------------------
function Topbar({ title, onNav, displayInitials }: { title: string; onNav?: (id: string) => void; displayInitials?: string }) {
  return (
    <header className="bg-white border-b flex items-center gap-4 px-6 py-3 sticky top-0 z-10" style={{ borderColor: C.neutral + "40" }}>
      <BrandLogo size={30} />
      <div>
        <h1 className="text-base font-semibold" style={{ color: C.primary }}>{title}</h1>
      </div>
      <div className="flex-1" />
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer" style={{ background: C.sidebarAccent, color: C.primary }}>
        {displayInitials ?? "?"}
      </div>
    </header>
  );
}

// --- Screen: Landing Page ----------------------------------------------------
function LandingPage({ onNav }: { onNav: (id: string) => void }) {
  const features = [
    { number: "01", icon: Target, title: "Predict", desc: "Identify customers showing signs of churn.", span: "lg:col-span-5" },
    { number: "02", icon: Eye, title: "Understand", desc: "Discover the signals behind customer risk.", span: "lg:col-span-7" },
    { number: "03", icon: Layers, title: "Segment", desc: "Group customers by meaningful customer patterns.", span: "lg:col-span-7" },
    { number: "04", icon: Sparkles, title: "Act", desc: "Turn insights into focused retention decisions.", span: "lg:col-span-5" },
  ];

  return (
    <div className="min-h-screen overflow-hidden" style={{ background: `linear-gradient(145deg, ${C.bg} 0%, ${C.card} 48%, ${C.bg} 100%)`, fontFamily: "Poppins, sans-serif" }}>
      <nav className="relative z-20 px-5 sm:px-8 lg:px-12 py-5">
        <div className="max-w-7xl mx-auto flex items-center">
          <button onClick={() => onNav("landing")} className="group flex items-center gap-3 text-left">
            <BrandLogo size={36} className="transition-transform duration-300 group-hover:-rotate-6" />
            <span className="font-bold text-lg" style={{ color: C.primary }}>RetainIQ</span>
          </button>
        </div>
      </nav>

      <section className="relative px-5 sm:px-8 lg:px-12 pt-10 pb-16 lg:pt-14 lg:pb-20">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 18% 16%, ${C.accent2}55 0, transparent 28%), radial-gradient(circle at 88% 18%, ${C.secondary}1F 0, transparent 30%)` }} />
        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[0.94fr_1.06fr] gap-12 lg:gap-16 items-center">
          <div className="retainiq-reveal">
            <p className="text-xs font-bold uppercase mb-5" style={{ color: C.accent1, letterSpacing: "0.18em" }}>Customer retention intelligence</p>
            <h1 className="max-w-2xl font-extrabold leading-[1.02] text-[clamp(2.55rem,5.6vw,4.9rem)]" style={{ color: C.primary }}>
              Know who might leave. Know why. Act early.
            </h1>
            <p className="mt-7 max-w-xl text-lg sm:text-xl leading-relaxed" style={{ color: C.secondary }}>
              Identify customer churn risk, understand the signals behind it, and make smarter retention decisions.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 max-w-xl">
              <button onClick={() => onNav("register")} className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full text-white font-semibold text-sm transition-all duration-300 hover:-translate-y-1" style={{ background: C.accent1, boxShadow: `0 18px 40px ${C.accent1}40` }}>
                Get Started
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <button onClick={() => onNav("login")} className="px-7 py-4 rounded-full font-semibold text-sm transition-all duration-300 hover:-translate-y-1" style={{ color: C.primary, background: "rgba(255,255,255,0.54)", boxShadow: `inset 0 0 0 1px ${C.neutral}35` }}>
                Sign In
              </button>
            </div>
          </div>

          <div className="retainiq-reveal relative min-h-[390px] lg:min-h-[500px]" style={{ animationDelay: "120ms" }}>
            <div className="absolute inset-4 rounded-[48px]" style={{ background: `linear-gradient(145deg, ${C.sidebar} 0%, ${C.primary} 58%, ${C.accent1} 140%)`, boxShadow: `0 34px 90px ${C.primary}35` }} />
            <svg className="absolute inset-0 w-full h-full retainiq-flow" viewBox="0 0 620 560" fill="none" aria-hidden="true">
              <path d="M92 324 C160 188, 278 184, 350 274 S498 358, 552 206" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
              <path d="M88 400 C198 292, 266 418, 374 330 S510 246, 558 314" stroke={C.sidebarAccent} strokeOpacity="0.62" strokeWidth="2" />
              <path d="M128 210 C218 108, 340 160, 418 104 S514 112, 556 78" stroke={C.accent2} strokeOpacity="0.5" strokeWidth="1.2" />
            </svg>
            {[
              ["12%", "58%", "Customer health", C.sidebarAccent],
              ["28%", "31%", "Usage signal", "#FFFFFF"],
              ["55%", "48%", "Risk rising", C.accent1],
              ["77%", "25%", "Renewal focus", C.accent2],
              ["70%", "70%", "Action ready", "#FFFFFF"],
            ].map(([left, top, label, color]) => (
              <div key={label} className="absolute retainiq-node" style={{ left, top }}>
                <span className="block w-4 h-4 rounded-full" style={{ background: color, boxShadow: `0 0 0 10px ${color}24, 0 16px 34px rgba(0,0,0,0.2)` }} />
                <span className="absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.72)" }}>{label}</span>
              </div>
            ))}
            <div className="absolute left-8 right-8 bottom-8 sm:left-12 sm:right-auto sm:w-[360px] p-5 backdrop-blur-xl transition-transform duration-500 hover:-translate-y-1" style={{ background: "rgba(255,255,255,0.11)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16), 0 26px 70px rgba(0,0,0,0.24)" }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase font-bold" style={{ color: C.sidebarAccent, letterSpacing: "0.16em" }}>Relationship signal</p>
                  <p className="mt-2 text-2xl font-bold text-white">Risk becoming visible</p>
                </div>
                <Activity size={26} style={{ color: C.accent2 }} />
              </div>
              <div className="mt-5 flex items-end gap-2 h-16">
                {[42, 54, 47, 68, 74, 82].map((height, i) => (
                  <span key={i} className="flex-1 rounded-t-sm retainiq-bar" style={{ height: `${height}%`, background: i > 3 ? C.accent1 : C.sidebarAccent, opacity: i > 3 ? 0.98 : 0.65, animationDelay: `${i * 90}ms` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 sm:px-8 lg:px-12 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-4 sm:gap-8 text-xl sm:text-3xl font-semibold" style={{ color: C.primary }}>
            <span>Predict</span>
            <span className="h-px w-10 sm:w-24" style={{ background: C.neutral + "70" }} />
            <span>Understand</span>
            <span className="h-px w-10 sm:w-24" style={{ background: C.neutral + "70" }} />
            <span>Retain</span>
          </div>
        </div>
      </section>

      <section className="px-5 sm:px-8 lg:px-12 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-6">
            <div className="lg:col-span-4 lg:pr-6">
              <p className="text-xs font-bold uppercase mb-4" style={{ color: C.accent1, letterSpacing: "0.16em" }}>What RetainIQ helps you do</p>
              <h2 className="text-4xl sm:text-5xl font-bold leading-tight" style={{ color: C.primary }}>A clearer way to move from signal to decision.</h2>
            </div>
            <div className="lg:col-span-8 grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-3">
              {features.map(({ number, icon: Icon, title, desc, span }, index) => (
                <div key={title} className={`${span} group border-t pt-6 pb-8 transition-all duration-300 hover:translate-x-1`} style={{ borderColor: C.neutral + "55" }}>
                  <div className="flex items-start gap-5">
                    <span className="text-5xl sm:text-6xl font-extrabold leading-none transition-colors duration-300" style={{ color: index === 1 ? C.accent1 : C.neutral + "80" }}>{number}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <Icon size={20} className="transition-transform duration-300 group-hover:-translate-y-0.5" style={{ color: C.accent1 }} />
                        <h3 className="text-2xl font-bold" style={{ color: C.primary }}>{title}</h3>
                      </div>
                      <p className="mt-3 text-base leading-relaxed" style={{ color: C.secondary }}>{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 sm:px-8 lg:px-12 py-10 lg:py-12" style={{ background: `linear-gradient(135deg, ${C.primary} 0%, ${C.sidebar} 66%)` }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[0.76fr_1.24fr] gap-7 lg:gap-9 items-center">
          <div>
            <p className="text-[11px] font-bold uppercase mb-3" style={{ color: C.sidebarAccent, letterSpacing: "0.16em" }}>From risk to action</p>
            <h2 className="text-[2rem] sm:text-[2.25rem] font-bold leading-tight text-white">See the risk, the reason, and the next move together.</h2>
            <p className="mt-3 text-[15px] sm:text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.68)" }}>
              RetainIQ turns customer signals into a focused view of risk, indicators, and practical recommendations for retention work.
            </p>
          </div>
          <div className="relative min-h-[350px] sm:min-h-[365px] lg:min-h-[300px]">
            <div className="absolute inset-0" style={{ background: `linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05))`, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.13), 0 34px 80px rgba(0,0,0,0.22)" }}>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 760 300" fill="none" aria-hidden="true">
                <path d="M75 246 C190 142 286 292 410 198 S596 102 684 166" stroke="rgba(255,255,255,0.24)" strokeWidth="1.4" />
                <path d="M82 282 C198 248 302 318 418 238 S612 184 690 222" stroke={C.accent2} strokeOpacity="0.62" strokeWidth="2" />
                {[100, 190, 282, 412, 548, 668].map((cx, i) => (
                  <circle key={cx} cx={cx} cy={[236, 178, 244, 198, 142, 170][i]} r={i === 4 ? 8 : 5} fill={i === 4 ? C.accent1 : C.sidebarAccent} opacity={i === 4 ? 1 : 0.8} />
                ))}
              </svg>
              <div className="absolute left-3 right-3 top-3 sm:left-5 sm:right-auto sm:w-[220px] p-3.5" style={{ background: "rgba(255,255,255,0.92)" }}>
                <p className="text-[10px] uppercase font-bold" style={{ color: C.accent1, letterSpacing: "0.14em" }}>Risk score</p>
                <div className="mt-2 flex items-end gap-3">
                  <span className="text-4xl font-extrabold leading-none" style={{ color: C.primary }}>78</span>
                  <span className="pb-1.5 text-xs font-semibold" style={{ color: C.accent1 }}>High attention</span>
                </div>
                <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: C.bg }}>
                  <div className="h-full rounded-full" style={{ width: "78%", background: `linear-gradient(90deg, ${C.accent2}, ${C.accent1})` }} />
                </div>
              </div>
              <div className="absolute left-3 right-3 top-[118px] sm:left-auto sm:right-5 sm:top-5 sm:w-[250px] p-3.5" style={{ background: "rgba(255,255,255,0.12)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)" }}>
                <p className="text-[10px] uppercase font-bold" style={{ color: C.sidebarAccent, letterSpacing: "0.14em" }}>Risk indicators</p>
                <div className="mt-2.5 space-y-2">
                  {["Engagement has softened", "Recent activity changed", "Account pattern needs review"].map((item, i) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: i === 0 ? C.accent1 : C.accent2 }} />
                      <span className="text-xs sm:text-sm text-white">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute left-3 right-3 bottom-3 sm:left-6 sm:right-6 p-3.5" style={{ background: C.card }}>
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: C.accent1 + "18" }}>
                    <CheckCircle size={17} style={{ color: C.accent1 }} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold" style={{ color: C.accent1, letterSpacing: "0.14em" }}>Recommendation</p>
                    <p className="mt-1.5 text-sm sm:text-[15px] font-semibold leading-snug" style={{ color: C.primary }}>Prioritize outreach, review customer health signals, and align the account team around a focused retention decision.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-5 sm:px-8 lg:px-12 py-10 border-t" style={{ borderColor: C.neutral + "40", background: "rgba(255,255,255,0.52)" }}>
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center gap-4">
          <div>
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <BrandLogo size={32} />
              <span className="font-bold text-base" style={{ color: C.primary }}>RetainIQ</span>
            </div>
            <p className="text-sm" style={{ color: C.secondary }}>Predict. Understand. Retain.</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs" style={{ color: C.neutral }}>Developed by Mithra N &middot; Bhuvisha Sri Priya</p>
            <p className="text-xs" style={{ color: C.neutral }}>PSG College of Technology &middot; MCA Mini Project</p>
            <p className="text-xs" style={{ color: C.neutral }}>&copy; 2026 RetainIQ</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Screen: Login ------------------------------------------------------------
function LoginPage({ onNav, onLogin, notice }: { onNav: (id: string) => void; onLogin: (user: AuthUser) => void; notice?: string | null }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      const data = await login(email, pass);
      saveSession(data);
      onLogin(data.user);
      onNav("dashboard");
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? "Login failed. Please check your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-2" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Left - form */}
      <div className="flex flex-col justify-center px-16 py-12 bg-white">
        <div className="flex items-center gap-2.5 mb-12">
          <BrandLogo size={32} />
          <span className="font-bold text-base" style={{ color: C.primary }}>RetainIQ</span>
        </div>
        <h2 className="text-3xl font-bold mb-2" style={{ color: C.primary }}>Welcome back</h2>
        <p className="text-sm mb-10" style={{ color: C.secondary }}>Sign in to your account to continue</p>

        <div className="space-y-5">
          {notice && !error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium" style={{ background: C.accent1 + "12", color: C.accent1 }}>
              <AlertTriangle size={13} style={{ flexShrink: 0 }} />
              {notice}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: C.primary }}>Email address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: C.neutral }} />
              <input
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSignIn()}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none focus:ring-2"
                style={{ borderColor: error ? C.accent1 + "80" : C.neutral + "60", fontFamily: "Poppins", color: C.primary, background: C.bg + "80" }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: C.primary }}>Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: C.neutral }} />
              <input
                type="password" value={pass} onChange={e => setPass(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSignIn()}
                placeholder="Enter your password"
                className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none"
                style={{ borderColor: error ? C.accent1 + "80" : C.neutral + "60", fontFamily: "Poppins", color: C.primary, background: C.bg + "80" }}
              />
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium" style={{ background: C.accent1 + "12", color: C.accent1 }}>
              <AlertTriangle size={13} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}
          <button
            onClick={handleSignIn}
            disabled={loading || !email || !pass}
            className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: C.accent1 }}
          >
            {loading && <RefreshCw size={14} className="animate-spin" />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>

        <p className="text-xs text-center mt-8" style={{ color: C.neutral }}>
          {"Don't have an account? "}
          <button onClick={() => onNav("register")} className="font-semibold" style={{ color: C.accent1, background: "none", border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>Start free trial</button>
        </p>
      </div>

      {/* Right - visual */}
      <div className="flex flex-col justify-center p-12" style={{ background: C.sidebar }}>
        <div className="max-w-sm mx-auto">
          <BrandLogo size={56} className="mb-8" />
          <h3 className="text-2xl font-bold text-white mb-4">Welcome to RetainIQ</h3>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            Predict customer churn, understand customer risk, and make informed retention decisions.
          </p>
          <div className="space-y-4">
            {[
              "Customer Churn Prediction",
              "Customer Risk Insights",
              "Retention Analytics",
            ].map(t => (
              <div key={t} className="flex items-start gap-3">
                <CheckCircle size={16} style={{ color: C.sidebarAccent, flexShrink: 0, marginTop: 1 }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{t}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.07)" }}>
            <p className="text-xs font-semibold text-white mb-2">Built for retention teams</p>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
              Sign in to access customer insights, retention analytics, and team-ready risk views.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Screen: Register --------------------------------------------------------
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
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setError(null);
    try {
      await register(fullName.trim(), email, password);
      setSuccess(true);
      setTimeout(() => onNav("login"), 2000);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg).join(" "));
      } else {
        setError(detail ?? "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !loading && !success && fullName && email && password && confirm;

  return (
    <div className="min-h-screen grid grid-cols-2" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Left - form */}
      <div className="flex flex-col justify-center px-16 py-12 bg-white">
        <div className="flex items-center gap-2.5 mb-12">
          <BrandLogo size={32} />
          <span className="font-bold text-base" style={{ color: C.primary }}>RetainIQ</span>
        </div>
        <h2 className="text-3xl font-bold mb-2" style={{ color: C.primary }}>Create your account</h2>
        <p className="text-sm mb-10" style={{ color: C.secondary }}>Start predicting churn in minutes. No credit card required.</p>

        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: C.primary }}>Full Name</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: C.neutral }} />
              <input
                value={fullName} onChange={e => { setFullName(e.target.value); setError(null); }}
                onKeyDown={e => e.key === "Enter" && handleRegister()}
                placeholder="Mithra N"
                className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none focus:ring-2"
                style={{ borderColor: error && !fullName.trim() ? C.accent1 + "80" : C.neutral + "60", fontFamily: "Poppins", color: C.primary, background: C.bg + "80" }}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: C.primary }}>Email address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: C.neutral }} />
              <input
                value={email} onChange={e => { setEmail(e.target.value); setError(null); }}
                onKeyDown={e => e.key === "Enter" && handleRegister()}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none focus:ring-2"
                style={{ borderColor: C.neutral + "60", fontFamily: "Poppins", color: C.primary, background: C.bg + "80" }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: C.primary }}>Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: C.neutral }} />
              <input
                type="password" value={password} onChange={e => { setPassword(e.target.value); setError(null); }}
                onKeyDown={e => e.key === "Enter" && handleRegister()}
                placeholder="Min. 8 characters"
                className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none"
                style={{ borderColor: C.neutral + "60", fontFamily: "Poppins", color: C.primary, background: C.bg + "80" }}
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: C.primary }}>Confirm Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: C.neutral }} />
              <input
                type="password" value={confirm} onChange={e => { setConfirm(e.target.value); setError(null); }}
                onKeyDown={e => e.key === "Enter" && handleRegister()}
                placeholder="Re-enter your password"
                className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none"
                style={{ borderColor: password && confirm && password !== confirm ? C.accent1 + "80" : C.neutral + "60", fontFamily: "Poppins", color: C.primary, background: C.bg + "80" }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium" style={{ background: C.accent1 + "12", color: C.accent1 }}>
              <AlertTriangle size={13} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium" style={{ background: C.success + "18", color: C.success }}>
              <CheckCircle size={13} style={{ flexShrink: 0 }} />
              Account created successfully. Redirecting to sign in...
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleRegister}
            disabled={!canSubmit}
            className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: C.accent1 }}
          >
            {loading && <RefreshCw size={14} className="animate-spin" />}
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </div>

        <p className="text-xs text-center mt-8" style={{ color: C.neutral }}>
          Already have an account?{" "}
          <button onClick={() => onNav("login")} className="font-semibold" style={{ color: C.accent1, background: "none", border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>Sign in</button>
        </p>
      </div>

      {/* Right - visual (mirrors Login page) */}
      <div className="flex flex-col justify-center p-12" style={{ background: C.sidebar }}>
        <div className="max-w-sm mx-auto">
          <BrandLogo size={56} className="mb-8" />
          <h3 className="text-2xl font-bold text-white mb-4">Welcome to RetainIQ</h3>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            Predict customer churn, understand customer risk, and make informed retention decisions.
          </p>
          <div className="space-y-4">
            {[
              "Customer Churn Prediction",
              "Customer Risk Insights",
              "Retention Analytics",
            ].map(t => (
              <div key={t} className="flex items-start gap-3">
                <CheckCircle size={16} style={{ color: C.sidebarAccent, flexShrink: 0, marginTop: 1 }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Screen: Dashboard --------------------------------------------------------
function Dashboard({ onNav }: { onNav: (id: string) => void }) {
  const [summary, setSummary] = useState<DashSummary | null>(null);
  const [modelPerf, setModelPerf] = useState<DashModelPerf | null>(null);
  const [shapData, setShapData] = useState<DashShapItem[]>([]);
  const [segments, setSegments] = useState<SegmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentPredictions, setRecentPredictions] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [churnByAge, setChurnByAge] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      dashboardApi.getSummary(),
      dashboardApi.getModelPerformance(),
      dashboardApi.getShapSummary(),
      segmentsApi.getSegments(),
      dashboardApi.getInsights(),
      dashboardApi.getChurnByAge(),
      dashboardApi.getPredictionHistory(),
    ])
      .then(([s, m, sh, seg, ins, cba, ph]) => {
        setSummary(s); 
        setModelPerf(m); 
        setShapData(sh); 
        setSegments(seg);
        setInsights(ins || []);
        setChurnByAge(cba || []);
        setRecentPredictions(ph || []);
      })
      .catch((e: any) => setError(e?.response?.data?.detail ?? e?.message ?? "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const dashboardSegmentData = segments.map(seg => ({
    name: seg.segment,
    value: seg.percentage,
    color: segmentColor(seg.segment),
  }));

  return (
    <div className="p-6 space-y-6" style={{ background: C.bg, fontFamily: "Poppins, sans-serif" }}>
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: C.accent1 + "15", color: C.accent1 }}>
          {error}
        </div>
      )}

      {/* KPIs - populated from /analytics/summary */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          icon={Users} label="Total Customers" color={C.secondary}
          value={loading ? "-" : summary ? summary.totalCustomers.toLocaleString() : "-"}
        />
        <KPICard
          icon={AlertTriangle} label="Churned Customers" color={C.accent1}
          value={loading ? "-" : summary ? summary.churnCount.toLocaleString() : "-"}
        />
        <KPICard
          icon={TrendingDown} label="Churn Rate" color={C.accent2}
          value={loading ? "-" : summary ? `${(summary.churnRate * 100).toFixed(1)}%` : "-"}
        />
        <KPICard
          icon={Activity} label="Active Members" color={C.success}
          value={loading ? "-" : summary ? summary.activeCustomers.toLocaleString() : "-"}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Churn by Age Group - derived from actual dataset statistics */}
        <div className="col-span-2 bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-sm" style={{ color: C.primary }}>Churn Rate by Age Group</h3>
              <p className="text-xs mt-0.5" style={{ color: C.neutral }}>Calculated dynamically from dataset age cohorts</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={churnByAge.length ? churnByAge.map(x => ({ month: x.age_group, churnRate: +(x.churnRate * 100).toFixed(1) })) : []}>
              <defs>
                <linearGradient id="churnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.accent1} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={C.accent1} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.neutral + "25"} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.neutral, fontFamily: "Poppins" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.neutral, fontFamily: "Poppins" }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ fontFamily: "Poppins", fontSize: 12, borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Area type="monotone" dataKey="churnRate" stroke={C.accent1} fill="url(#churnGrad)" strokeWidth={2.5} dot={false} name="Churn Rate %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Segment donut */}
        <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
          <h3 className="font-semibold text-sm mb-1" style={{ color: C.primary }}>Customer Segments</h3>
          <p className="text-xs mb-4" style={{ color: C.neutral }}>Distribution by health score</p>
          <ResponsiveContainer width="100%" height={160}>
            <RechartsPieChart>
              <Pie data={dashboardSegmentData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {dashboardSegmentData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ fontFamily: "Poppins", fontSize: 11, borderRadius: 10 }} />
            </RechartsPieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5">
            {dashboardSegmentData.map(s => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span style={{ color: C.secondary }}>{s.name}</span>
                </div>
                <span className="font-semibold" style={{ color: C.primary }}>{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table + Insights */}
      <div className="grid grid-cols-3 gap-4">
        {/* Table */}
        <div className="col-span-2 bg-white rounded-2xl border overflow-hidden" style={{ borderColor: C.neutral + "30" }}>
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: C.neutral + "20" }}>
            <h3 className="font-semibold text-sm" style={{ color: C.primary }}>Recent Predictions</h3>
            <button onClick={() => onNav("reports")} className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: C.accent1 }}>
              View all
              <ArrowRight size={13} />
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ background: C.bg + "60" }}>
                {["Customer ID", "Risk Score", "Segment", "Prediction", "Date", "Action"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: C.neutral }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentPredictions.length ? recentPredictions.slice(0, 5).map((p: any) => {
                const riskScore = Math.round((p.probability || 0) * 100);
                const date = p.timestamp ? new Date(p.timestamp).toLocaleDateString() : "-";
                return (
                  <tr key={p.id} className="border-t hover:bg-gray-50 transition-colors" style={{ borderColor: C.neutral + "20" }}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold" style={{ color: C.primary }}>{p.customer_id}</p>
                        <p className="text-xs" style={{ color: C.neutral }}>{p.id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 w-16">
                          <div className="h-1.5 rounded-full" style={{ width: `${riskScore}%`, background: riskColor(riskScore) }} />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: riskColor(riskScore) }}>{riskScore}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge color={riskColor(riskScore)}>{p.segment}</Badge></td>
                    <td className="px-4 py-3 text-xs font-medium" style={{ color: p.prediction === 1 ? C.accent1 : C.success }}>
                      {p.prediction === 1 ? "Will Churn" : "Will Stay"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: C.neutral }}>{date}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => onNav("reports")} className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: C.accent1 + "15", color: C.accent1 }}>
                        View
                      </button>
                    </td>
                  </tr>
                );
              }) : <tr><td colSpan={6} className="px-4 py-6 text-center text-xs" style={{ color: C.neutral }}>No recent predictions</td></tr>}
            </tbody>
          </table>
        </div>

        {/* AI Insights */}
        <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.accent2 + "30" }}>
              <Sparkles size={14} style={{ color: C.accent2 }} />
            </div>
            <h3 className="font-semibold text-sm" style={{ color: C.primary }}>AI Insights</h3>
          </div>
          <div className="space-y-4">
            {insights && insights.length > 0 ? (
              insights.map((insight: any, idx: number) => {
                const tag = insight.tag || "Insight";
                const text = insight.text || "";
                const color = insight.color || C.accent2;
                return (
                  <div key={idx} className="rounded-xl p-3 border-l-2" style={{ background: color + "0D", borderColor: color }}>
                    <span className="text-xs font-bold" style={{ color }}>{tag}</span>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: C.primary }}>{text}</p>
                  </div>
                );
              })
            ) : (
              <p className="text-xs" style={{ color: C.neutral }}>No insights available</p>
            )}
          </div>
        </div>
      </div>


      {/* Model Accuracy + Top SHAP Features - populated from /analytics/model-performance and /analytics/shap-summary */}
      <div className="grid grid-cols-3 gap-4">
        {/* Model accuracy */}
        <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.secondary + "18" }}>
              <Target size={14} style={{ color: C.secondary }} />
            </div>
            <h3 className="font-semibold text-sm" style={{ color: C.primary }}>Model Accuracy</h3>
          </div>
          {loading ? (
            <p className="text-xs" style={{ color: C.neutral }}>Loading...</p>
          ) : modelPerf ? (
            <div className="space-y-3">
              {([
                ["Accuracy",  modelPerf.accuracy,  C.secondary],
                ["Precision", modelPerf.precision, C.accent2],
                ["Recall",    modelPerf.recall,    C.accent1],
                ["ROC-AUC",   modelPerf.rocAuc,    C.success],
              ] as [string, number, string][]).map(([label, val, color]) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: C.neutral }}>{label}</span>
                    <span className="text-xs font-bold" style={{ color }}>{(val * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${val * 100}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Top SHAP features */}
        <div className="col-span-2 bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.accent1 + "18" }}>
              <BarChart3 size={14} style={{ color: C.accent1 }} />
            </div>
            <div>
              <h3 className="font-semibold text-sm" style={{ color: C.primary }}>Top SHAP Features</h3>
              <p className="text-xs" style={{ color: C.neutral }}>Mean |SHAP| across dataset sample</p>
            </div>
          </div>
          {loading ? (
            <p className="text-xs" style={{ color: C.neutral }}>Loading...</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={shapData.slice(0, 6)} layout="vertical" barSize={12} margin={{ left: 110 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.neutral + "25"} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: C.neutral, fontFamily: "Poppins" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="feature" tick={{ fontSize: 11, fill: C.primary, fontFamily: "Poppins" }} axisLine={false} tickLine={false} width={110} />
                <Tooltip contentStyle={{ fontFamily: "Poppins", fontSize: 12, borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} formatter={(v: number) => [v.toFixed(4), "Mean |SHAP|"] } />
                <Bar dataKey="meanAbsShap" radius={[0, 4, 4, 0]}>
                  {shapData.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={i === 0 ? C.accent1 : i === 1 ? C.accent2 : C.secondary} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Screen: Predict Customer -------------------------------------------------
function PredictCustomer({ onNav, onResult }: { onNav: (id: string) => void; onResult: (r: PredictResponse) => void }) {
  const [customerId, setCustomerId] = useState("");
  const [form, setForm] = useState<PredictRequest>({
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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setNum(key: keyof PredictRequest, val: string) {
    setForm(f => ({ ...f, [key]: val === "" ? 0 : Number(val) }));
  }
  function setStr(key: keyof PredictRequest, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handlePredict() {
    setLoading(true);
    setError(null);
    try {
      const result = await predictChurn(form, customerId);
      onResult(result);
      onNav("result");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Prediction failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setForm({ CreditScore: 650, Age: 35, Tenure: 5, Balance: 75000, NumOfProducts: 2, HasCrCard: 1, IsActiveMember: 1, EstimatedSalary: 60000, Geography: "France", Gender: "Female" });
    setCustomerId("");
    setError(null);
  }

  return (
    <div className="p-6" style={{ background: C.bg, fontFamily: "Poppins, sans-serif" }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold" style={{ color: C.primary }}>Predict Customer Churn</h2>
          <p className="text-sm mt-1" style={{ color: C.secondary }}>Enter customer data to generate an AI-powered churn prediction with SHAP explanations.</p>
        </div>

        <div className="space-y-4">
          <SectionCard title="Customer Profile" icon={Building2}>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.primary }}>Customer ID (Optional)</label>
                <input type="text" value={customerId} onChange={e => setCustomerId(e.target.value)} placeholder="e.g. C-10245"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 transition-shadow"
                  style={{ borderColor: C.border, fontFamily: "Poppins", color: C.primary, background: C.input }} />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.primary }}>Credit Score</label>
                <input type="number" value={form.CreditScore} onChange={e => setNum("CreditScore", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 transition-shadow"
                  style={{ borderColor: C.border, fontFamily: "Poppins", color: C.primary, background: C.input }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.primary }}>Age</label>
                <input type="number" value={form.Age} onChange={e => setNum("Age", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 transition-shadow"
                  style={{ borderColor: C.border, fontFamily: "Poppins", color: C.primary, background: C.input }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.primary }}>Tenure (years)</label>
                <input type="number" value={form.Tenure} onChange={e => setNum("Tenure", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 transition-shadow"
                  style={{ borderColor: C.border, fontFamily: "Poppins", color: C.primary, background: C.input }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.primary }}>Balance ($)</label>
                <input type="number" value={form.Balance} onChange={e => setNum("Balance", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 transition-shadow"
                  style={{ borderColor: C.border, fontFamily: "Poppins", color: C.primary, background: C.input }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.primary }}>Estimated Salary ($)</label>
                <input type="number" value={form.EstimatedSalary} onChange={e => setNum("EstimatedSalary", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 transition-shadow"
                  style={{ borderColor: C.border, fontFamily: "Poppins", color: C.primary, background: C.input }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.primary }}>Num of Products</label>
                <input type="number" value={form.NumOfProducts} onChange={e => setNum("NumOfProducts", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 transition-shadow"
                  style={{ borderColor: C.border, fontFamily: "Poppins", color: C.primary, background: C.input }} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Account Details" icon={Activity}>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.primary }}>Geography</label>
                <select value={form.Geography} onChange={e => setStr("Geography", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: C.border, fontFamily: "Poppins", color: C.primary, background: C.input }}>
                  <option>France</option>
                  <option>Germany</option>
                  <option>Spain</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.primary }}>Gender</label>
                <select value={form.Gender} onChange={e => setStr("Gender", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: C.border, fontFamily: "Poppins", color: C.primary, background: C.input }}>
                  <option>Female</option>
                  <option>Male</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.primary }}>Has Credit Card</label>
                <select value={form.HasCrCard} onChange={e => setNum("HasCrCard", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: C.border, fontFamily: "Poppins", color: C.primary, background: C.input }}>
                  <option value={1}>Yes</option>
                  <option value={0}>No</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: C.primary }}>Is Active Member</label>
                <select value={form.IsActiveMember} onChange={e => setNum("IsActiveMember", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: C.border, fontFamily: "Poppins", color: C.primary, background: C.input }}>
                  <option value={1}>Yes</option>
                  <option value={0}>No</option>
                </select>
              </div>
            </div>
          </SectionCard>
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: C.accent1 + "15", color: C.accent1 }}>
            {error}
          </div>
        )}

        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handlePredict}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white text-sm transition-all hover:opacity-90 shadow-lg disabled:opacity-60"
            style={{ background: C.accent1, boxShadow: `0 8px 24px ${C.accent1}30` }}
          >
            <Brain size={17} />
            {loading ? "Running..." : "Run Churn Prediction"}
          </button>
          <button onClick={handleClear} className="flex items-center gap-2 px-6 py-4 rounded-2xl font-medium text-sm border transition-colors hover:bg-white" style={{ borderColor: C.neutral + "60", color: C.secondary }}>
            <RefreshCw size={15} />
            Clear Form
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, placeholder, type = "text" }: { label: string; placeholder: string; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: C.primary }}>{label}</label>
      <input
        type={type}
        value={placeholder}
        readOnly
        aria-readonly="true"
        className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 transition-shadow"
        style={{ borderColor: C.border, fontFamily: "Poppins", color: C.primary, background: C.input }}
      />
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.secondary + "18" }}>
          <Icon size={15} style={{ color: C.secondary }} />
        </div>
        <h3 className="font-semibold text-sm" style={{ color: C.primary }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

// --- Screen: Prediction Result ------------------------------------------------
function PredictionResult({ onNav, result }: { onNav: (id: string) => void; result: PredictResponse | null }) {
  if (!result) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full" style={{ background: C.bg, fontFamily: "Poppins, sans-serif" }}>
        <Brain size={40} style={{ color: C.neutral, marginBottom: 16 }} />
        <p className="text-sm font-medium" style={{ color: C.secondary }}>No prediction yet.</p>
        <button onClick={() => onNav("predict")} className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: C.accent1 }}>
          Run a Prediction
        </button>
      </div>
    );
  }

  const probability = Math.round(result.probability * 100);
  const shapEntries = Object.entries(result.shap_values).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  return (
    <div className="p-6 space-y-4" style={{ background: C.bg, fontFamily: "Poppins, sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: C.primary }}>Prediction Result</h2>
          <p className="text-sm mt-0.5" style={{ color: C.secondary }}>Generated just now</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => onNav("predict")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: C.accent1 }}>
            New Prediction
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Gauge card */}
        <div className="bg-white rounded-2xl p-6 border text-center" style={{ borderColor: C.neutral + "30" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: C.primary }}>Churn Probability</p>
          <div className="relative inline-flex items-center justify-center w-36 h-36 mx-auto">
            <svg width={144} height={144} viewBox="0 0 144 144">
              <circle cx="72" cy="72" r="54" fill="none" stroke={C.neutral + "30"} strokeWidth="14" />
              <circle
                cx="72" cy="72" r="54" fill="none" stroke={riskColor(probability)} strokeWidth="14"
                strokeDasharray={`${(probability / 100) * 339.3} 339.3`}
                strokeLinecap="round" transform="rotate(-90 72 72)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold" style={{ color: riskColor(probability) }}>{probability}%</span>
              <span className="text-xs font-medium" style={{ color: C.neutral }}>{riskLabel(probability)}</span>
            </div>
          </div>
                  <div className="mt-4 rounded-xl p-3" style={{ background: riskColor(probability) + "0F" }}>
                    <p className="text-xs font-semibold" style={{ color: riskColor(probability) }}>
                      {result.prediction === 1 ? "Likely to churn within 30 days" : "Low churn risk"}
                    </p>
                    <p className="text-xs mt-1" style={{ color: C.neutral }}>Customer ID: {result.customer_id ?? "(generated by backend)"}</p>
                  </div>
        </div>

        {/* Segment card */}
        <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: C.primary }}>Customer Profile</p>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: C.sidebarAccent, color: C.primary }}>
              <Users size={18} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: C.primary }}>Customer</p>
              <p className="text-xs" style={{ color: C.neutral }}>Segment: {result.customer_segment}</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              ["Segment", result.customer_segment, riskColor(probability)],
              ["Prediction", result.prediction === 1 ? "Will Churn" : "Will Stay", result.prediction === 1 ? C.accent1 : C.success],
              ["Churn Probability", `${probability}%`, riskColor(probability)],
            ].map(([k, v, color]) => (
              <div key={k as string} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: C.neutral }}>{k}</span>
                <span className="text-xs font-semibold" style={{ color: color as string }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Model Info */}
        <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: C.primary }}>Model Information</p>
          <div className="rounded-xl p-3 border" style={{ borderColor: C.neutral + "30", background: C.bg }}>
            <p className="text-xs font-semibold mb-1" style={{ color: C.primary }}>Model Architecture</p>
            <p className="text-xs" style={{ color: C.secondary, fontFamily: "DM Mono, monospace" }}>StackingClassifier (Ensemble)</p>
            <p className="text-xs mt-2 font-semibold" style={{ color: C.primary }}>Explainability</p>
            <p className="text-xs" style={{ color: C.secondary }}>SHAP KernelExplainer</p>
            <p className="text-xs mt-1" style={{ color: C.neutral }}>Shows top feature drivers for this prediction</p>
          </div>
        </div>
      </div>

      {/* SHAP chart */}
      <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.secondary + "18" }}>
            <BarChart3 size={14} style={{ color: C.secondary }} />
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: C.primary }}>SHAP Feature Importance</h3>
            <p className="text-xs" style={{ color: C.neutral }}>Key drivers of this prediction</p>
          </div>
        </div>
        <div className="space-y-3">
          {shapEntries.map(([feature, impact]) => {
            const direction = impact >= 0 ? "high" : "low";
            const pct = Math.min(Math.abs(impact) * 300, 100);
            return (
              <div key={feature} className="flex items-center gap-4">
                <div className="w-48 text-xs shrink-0" style={{ color: C.primary }}>{feature}</div>
                <div className="flex-1 flex items-center gap-2">
                  {direction === "low" && (
                    <>
                      <div className="flex-1 h-2 rounded-full flex justify-end overflow-hidden" style={{ background: C.neutral + "20" }}>
                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: C.success }} />
                      </div>
                      <div className="w-px h-4" style={{ background: C.neutral }} />
                      <div className="flex-1" />
                    </>
                  )}
                  {direction === "high" && (
                    <>
                      <div className="flex-1" />
                      <div className="w-px h-4" style={{ background: C.neutral }} />
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: C.neutral + "20" }}>
                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: C.accent1 }} />
                      </div>
                    </>
                  )}
                </div>
                <div className="w-14 text-xs font-semibold text-right" style={{ color: direction === "high" ? C.accent1 : C.success }}>
                  {impact >= 0 ? "+" : ""}{impact.toFixed(3)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t" style={{ borderColor: C.neutral + "20" }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: C.neutral }}>
            <span className="w-3 h-3 rounded-sm" style={{ background: C.accent1 }} />
            Increases churn risk
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: C.neutral }}>
            <span className="w-3 h-3 rounded-sm" style={{ background: C.success }} />
            Decreases churn risk
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.accent2 + "30" }}>
            <Sparkles size={14} style={{ color: C.accent2 }} />
          </div>
          <h3 className="font-semibold text-sm" style={{ color: C.primary }}>AI Retention Recommendations</h3>
        </div>
        <div className="space-y-3">
          {result.recommendations.map((rec, i) => (
            <div key={i} className="rounded-xl p-4 border" style={{ borderColor: C.neutral + "30", background: C.bg + "60" }}>
              <div className="flex items-start gap-3">
                {(() => {
                  const RecommendationIcon = i === 0 ? AlertTriangle : i === 1 ? Lightbulb : BarChart3;
                  const iconColor = i === 0 ? C.accent1 : i === 1 ? C.accent2 : C.secondary;
                  return <RecommendationIcon size={16} className="mt-0.5 shrink-0" style={{ color: iconColor }} />;
                })()}
                <p className="text-xs leading-relaxed" style={{ color: C.primary }}>{rec}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Screen: Customer Segments ------------------------------------------------
function segmentColor(name: string) {
  const colors: Record<string, string> = {
    "High Value Loyal": C.chart2,
    "High Risk": C.accent1,
    "Potential Growth": C.success,
    "Low Engagement": C.accent2,
  };
  return colors[name] ?? C.neutral;
}

function CustomerSegments() {
  const [segments, setSegments] = useState<SegmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    segmentsApi.getSegments()
      .then(setSegments)
      .catch((e: any) => setError(e?.message ?? "Failed to load segments"))
      .finally(() => setLoading(false));
  }, []);

  const totalCustomers = segments.reduce((s, x) => s + x.count, 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64" style={{ background: C.bg, fontFamily: "Poppins, sans-serif" }}>
        <p className="text-sm" style={{ color: C.neutral }}>Loading segments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" style={{ background: C.bg, fontFamily: "Poppins, sans-serif" }}>
        <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: C.accent1 + "15", color: C.accent1 }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5" style={{ background: C.bg, fontFamily: "Poppins, sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: C.primary }}>Customer Segments</h2>
          <p className="text-sm mt-0.5" style={{ color: C.secondary }}>
            AI-powered KMeans clustering across {totalCustomers.toLocaleString()} customers
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); setError(null); segmentsApi.getSegments().then(setSegments).catch((e: any) => setError(e?.message ?? "Failed")).finally(() => setLoading(false)); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: C.accent1 }}
        >
          <RefreshCw size={14} />
          Re-cluster
        </button>
      </div>

      {/* Segment cards */}
      <div className="grid grid-cols-2 gap-4">
        {segments.map(seg => {
          const color = segmentColor(seg.segment);
          return (
            <div key={seg.segment} className="bg-white rounded-2xl p-5 border hover:shadow-md transition-shadow" style={{ borderColor: C.neutral + "30" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                  <h3 className="font-semibold text-sm" style={{ color: C.primary }}>{seg.segment}</h3>
                </div>
                <Badge color={color}>{seg.percentage}%</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-xs" style={{ color: C.neutral }}>Customers</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: C.primary }}>{seg.count.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: C.neutral }}>Share</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: C.primary }}>{seg.percentage}%</p>
                </div>
              </div>
              <p className="text-xs mb-3 leading-relaxed" style={{ color: C.secondary }}>{seg.description}</p>
              <div className="rounded-xl px-3 py-2 border-l-2" style={{ background: color + "0D", borderColor: color }}>
                <p className="text-xs font-semibold" style={{ color }}>Recommended Action</p>
                <p className="text-xs mt-0.5" style={{ color: C.primary }}>{seg.recommendedAction}</p>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: C.neutral }}>Segment Share</span>
                  <span className="text-xs font-semibold" style={{ color }}>{seg.percentage}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${seg.percentage}%`, background: color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Distribution charts row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Donut chart */}
        <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
          <h3 className="font-semibold text-sm mb-1" style={{ color: C.primary }}>Segment Distribution</h3>
          <p className="text-xs mb-4" style={{ color: C.neutral }}>Customer share by KMeans cluster</p>
          <ResponsiveContainer width="100%" height={200}>
            <RechartsPieChart>
              <Pie data={segments.map(s => ({ name: s.segment, value: s.count }))} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {segments.map((s, i) => <Cell key={i} fill={segmentColor(s.segment)} />)}
              </Pie>
              <Tooltip contentStyle={{ fontFamily: "Poppins", fontSize: 11, borderRadius: 10 }} formatter={(v: number) => [v.toLocaleString(), "Customers"]} />
            </RechartsPieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5">
            {segments.map(s => (
              <div key={s.segment} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: segmentColor(s.segment) }} />
                  <span style={{ color: C.secondary }}>{s.segment}</span>
                </div>
                <span className="font-semibold" style={{ color: C.primary }}>{s.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
          <h3 className="font-semibold text-sm mb-5" style={{ color: C.primary }}>Cluster Size Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={segments.map(s => ({ cluster: s.segment, customers: s.count }))} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.neutral + "25"} vertical={false} />
              <XAxis dataKey="cluster" tick={{ fontSize: 10, fill: C.neutral, fontFamily: "Poppins" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.neutral, fontFamily: "Poppins" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontFamily: "Poppins", fontSize: 12, borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} formatter={(v: number) => [v.toLocaleString(), "Customers"]} />
              <Bar dataKey="customers" radius={[6, 6, 0, 0]}>
                {segments.map((s, i) => <Cell key={i} fill={segmentColor(s.segment)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// --- Screen: Analytics --------------------------------------------------------
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
      .catch((e: any) => setError(e?.message ?? "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  // Shape geography data for the BarChart (reuses existing BarChart component)
  const geoChartData = geography.map(g => ({
    name: g.geography,
    total: g.total,
    churned: g.churned,
    churnRate: +(g.churnRate * 100).toFixed(1),
  }));

  // Shape products data for the LineChart (reuses existing LineChart component)
  const productsChartData = products.map(p => ({
    name: `${p.NumOfProducts} Product${p.NumOfProducts > 1 ? "s" : ""}`,
    churnRate: +(p.churnRate * 100).toFixed(1),
    retained: +((1 - p.churnRate) * 100).toFixed(1),
  }));

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64" style={{ background: C.bg, fontFamily: "Poppins, sans-serif" }}>
        <p className="text-sm" style={{ color: C.neutral }}>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" style={{ background: C.bg, fontFamily: "Poppins, sans-serif" }}>
        <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: C.accent1 + "15", color: C.accent1 }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5" style={{ background: C.bg, fontFamily: "Poppins, sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: C.primary }}>Analytics</h2>
          <p className="text-sm mt-0.5" style={{ color: C.secondary }}>Revenue, retention, and churn intelligence</p>
        </div>
      </div>

      {/* KPI cards - populated from /analytics/summary */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard icon={Users} label="Total Customers" value={summary ? summary.totalCustomers.toLocaleString() : "-"} color={C.secondary} />
        <KPICard icon={AlertTriangle} label="Churned Customers" value={summary ? summary.churnCount.toLocaleString() : "-"} color={C.accent1} />
        <KPICard icon={TrendingDown} label="Churn Rate" value={summary ? `${(summary.churnRate * 100).toFixed(1)}%` : "-"} color={C.accent2} />
        <KPICard icon={Activity} label="Active Members" value={summary ? summary.activeCustomers.toLocaleString() : "-"} color={C.success} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Chart 1 - Churn by Geography - populated from /analytics/geography */}
        <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
          <h3 className="font-semibold text-sm mb-1" style={{ color: C.primary }}>Churn by Geography</h3>
          <p className="text-xs mb-4" style={{ color: C.neutral }}>Total customers vs. churned by region</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={geoChartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.neutral + "25"} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.neutral, fontFamily: "Poppins" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.neutral, fontFamily: "Poppins" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontFamily: "Poppins", fontSize: 12, borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Legend wrapperStyle={{ fontFamily: "Poppins", fontSize: 11 }} />
              <Bar dataKey="total" fill={C.secondary} radius={[4, 4, 0, 0]} name="Total" />
              <Bar dataKey="churned" fill={C.accent1} radius={[4, 4, 0, 0]} name="Churned" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2 - Churn Rate by Num of Products - populated from /analytics/products */}
        <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
          <h3 className="font-semibold text-sm mb-1" style={{ color: C.primary }}>Churn Rate by Number of Products</h3>
          <p className="text-xs mb-4" style={{ color: C.neutral }}>Churn % vs. retained % per product tier</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={productsChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.neutral + "25"} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.neutral, fontFamily: "Poppins" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.neutral, fontFamily: "Poppins" }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ fontFamily: "Poppins", fontSize: 12, borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Legend wrapperStyle={{ fontFamily: "Poppins", fontSize: 11 }} />
              <Line type="monotone" dataKey="churnRate" stroke={C.accent1} strokeWidth={2.5} dot={{ r: 4, fill: C.accent1 }} name="Churn %" />
              <Line type="monotone" dataKey="retained" stroke={C.secondary} strokeWidth={2.5} dot={{ r: 4, fill: C.secondary }} name="Retained %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Active vs Inactive - populated from /analytics/activity */}
        <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
          <h3 className="font-semibold text-sm mb-1" style={{ color: C.primary }}>Active vs Inactive Members</h3>
          <p className="text-xs mb-4" style={{ color: C.neutral }}>Customer distribution and churn rate by activity</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activity} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.neutral + "25"} vertical={false} />
              <XAxis dataKey="status" tick={{ fontSize: 11, fill: C.neutral, fontFamily: "Poppins" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.neutral, fontFamily: "Poppins" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontFamily: "Poppins", fontSize: 12, borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Legend wrapperStyle={{ fontFamily: "Poppins", fontSize: 11 }} />
              <Bar dataKey="total" fill={C.secondary} radius={[4, 4, 0, 0]} name="Total" />
              <Bar dataKey="churned" fill={C.accent1} radius={[4, 4, 0, 0]} name="Churned" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Model Performance - populated from /analytics/model-performance */}
        <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
          <h3 className="font-semibold text-sm mb-5" style={{ color: C.primary }}>Model Performance</h3>
          {modelPerf && (
            <div className="space-y-3">
              {([
                ["Accuracy",  modelPerf.accuracy,  C.secondary],
                ["Precision", modelPerf.precision, C.accent2],
                ["Recall",    modelPerf.recall,    C.accent1],
                ["F1 Score",  modelPerf.f1Score,   C.primary],
                ["ROC-AUC",   modelPerf.rocAuc,    C.success],
              ] as [string, number, string][]).map(([label, val, color]) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: C.neutral }}>{label}</span>
                    <span className="text-xs font-bold" style={{ color }}>{(val * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${val * 100}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SHAP Summary - populated from /analytics/shap-summary */}
      <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
        <h3 className="font-semibold text-sm mb-1" style={{ color: C.primary }}>SHAP Feature Importance (Dataset Average)</h3>
        <p className="text-xs mb-5" style={{ color: C.neutral }}>Mean absolute SHAP value per feature across a sample of 30 customers</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={shapData} layout="vertical" barSize={14} margin={{ left: 120 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.neutral + "25"} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: C.neutral, fontFamily: "Poppins" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="feature" tick={{ fontSize: 11, fill: C.primary, fontFamily: "Poppins" }} axisLine={false} tickLine={false} width={120} />
            <Tooltip contentStyle={{ fontFamily: "Poppins", fontSize: 12, borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
            <Bar dataKey="meanAbsShap" name="Mean |SHAP|" radius={[0, 4, 4, 0]}>
              {shapData.map((_, i) => <Cell key={i} fill={i === 0 ? C.accent1 : i === 1 ? C.accent2 : C.secondary} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --- Reports: export helpers -------------------------------------------------
function exportCSV(result: PredictResponse, timestamp: string, customerId: string) {
  const rows = [
    ["Customer ID", "Prediction", "Probability", "Segment", "Timestamp"],
    [
      customerId,
      result.prediction === 1 ? "Will Churn" : "Will Stay",
      `${Math.round(result.probability * 100)}%`,
      result.customer_segment,
      timestamp,
    ],
  ];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `retainiq-report-${customerId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(result: PredictResponse, timestamp: string, customerId: string) {
  const probability = Math.round(result.probability * 100);
  const riskCls = probability >= 75 ? "risk-high" : probability >= 45 ? "risk-med" : "risk-low";
  const logoUrl = `${window.location.origin}${RETAINIQ_LOGO_SRC}`;
  const shapEntries = Object.entries(result.shap_values)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 5);
  const html = `<!DOCTYPE html><html><head><style>
    body{font-family:'Segoe UI',sans-serif;color:${C.primary};background:${C.card};padding:40px;max-width:720px;margin:0 auto}
    .logo{display:flex;align-items:center;gap:10px;margin-bottom:32px}
    .logo-image{width:36px;height:36px;object-fit:contain;display:block}
    h1{font-size:22px;margin:0 0 4px}
    .sub{color:${C.neutral};font-size:12px;margin-bottom:32px}
    .sec-title{font-size:12px;font-weight:700;color:${C.secondary};text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;border-bottom:1px solid ${C.border};padding-bottom:6px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
    .kv{background:${C.bg};border-radius:10px;padding:12px 16px}
    .kv-label{font-size:11px;color:${C.neutral};margin-bottom:2px}
    .kv-value{font-size:15px;font-weight:700}
    .risk-high{color:${C.accent1}}.risk-med{color:${C.accent2}}.risk-low{color:${C.success}}
    .shap-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid ${C.border};font-size:12px}
    .rec{background:${C.bg};border-radius:10px;padding:10px 14px;margin-bottom:8px;font-size:12px;line-height:1.5}
    .footer{margin-top:40px;font-size:11px;color:${C.neutral};text-align:center}
  </style></head><body>
    <div class="logo"><img class="logo-image" src="${logoUrl}" alt="RetainIQ logo" /><div><div style="font-weight:800;font-size:18px">RetainIQ</div><div style="font-size:11px;color:${C.neutral}">AI Churn Platform</div></div></div>
    <h1>Prediction Report</h1>
    <div class="sub">Generated: ${timestamp} &nbsp;&middot;&nbsp; Customer ID: ${customerId}</div>
    <div class="sec-title">Prediction Summary</div>
    <div class="grid">
      <div class="kv"><div class="kv-label">Customer ID</div><div class="kv-value">${customerId}</div></div>
      <div class="kv"><div class="kv-label">Prediction</div><div class="kv-value ${riskCls}">${result.prediction === 1 ? "Will Churn" : "Will Stay"}</div></div>
      <div class="kv"><div class="kv-label">Churn Probability</div><div class="kv-value ${riskCls}">${probability}%</div></div>
      <div class="kv"><div class="kv-label">Customer Segment</div><div class="kv-value">${result.customer_segment}</div></div>
    </div>
    <div class="sec-title">Top SHAP Features</div>
    ${shapEntries.map(([f, v]) => `<div class="shap-row"><span>${f}</span><span style="font-weight:700;color:${v >= 0 ? C.accent1 : C.success}">${v >= 0 ? "+" : ""}${v.toFixed(4)}</span></div>`).join("")}
    <div style="margin-bottom:24px"></div>
    <div class="sec-title">AI Recommendations</div>
    ${result.recommendations.map(r => `<div class="rec">${r}</div>`).join("")}
    <div class="footer">RetainIQ &middot; Explainable AI Churn Prediction &middot; retainiq.ai</div>
  </body></html>`;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  win.close();
}

// --- Screen: Reports ----------------------------------------------------------
function Reports({ result }: { result: PredictResponse | null }) {
  const timestamp = result ? new Date().toLocaleString() : "";
  const customerId = result ? (result.customer_id ?? "(generated by backend)") : "";
  const [history, setHistory] = useState<any[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    // fetch prediction history when reports screen mounts using authenticated API client
    setHistoryLoading(true);
    setHistoryError(null);
    (async () => {
      try {
        const data = await analyticsApi.getPredictionHistory();
        setHistory(data);
      } catch (err: any) {
        setHistoryError(err?.message ?? "Failed to fetch history");
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, []);
  const probability = result ? Math.round(result.probability * 100) : 0;
  const shapEntries = result
    ? Object.entries(result.shap_values).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    : [];

  return (
    <div className="p-6 space-y-5" style={{ background: C.bg, fontFamily: "Poppins, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: C.primary }}>Reports</h2>
          <p className="text-sm mt-0.5" style={{ color: C.secondary }}>Prediction history and export center</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => result && exportCSV(result, timestamp, customerId)}
            disabled={!result}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: C.neutral + "50", color: C.secondary }}
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={() => result && exportPDF(result, timestamp, customerId)}
            disabled={!result}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: C.accent1 }}
          >
            <Download size={14} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Summary KPI cards - calculated from prediction history */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard 
          icon={Brain} 
          label="Total Predictions" 
          value={historyLoading ? "-" : ((history?.length) || 0).toString()} 
          color={C.secondary} 
        />
        <KPICard 
          icon={CheckCircle} 
          label="High-Risk Predictions" 
          value={historyLoading ? "-" : ((history?.filter((p: any) => (p.probability ?? 0) > 0.75).length) || 0).toString()} 
          color={C.success} 
        />
        <KPICard 
          icon={TrendingUp} 
          label="Average Probability" 
          value={(() => {
            if (historyLoading) return "-";
            if (!history || history.length === 0) return "-";
            const avg = history.reduce((sum: number, p: any) => sum + (p.probability ?? 0), 0) / history.length * 100;
            return `${avg.toFixed(1)}%`;
          })()}
          color={C.accent2} 
        />
        <KPICard 
          icon={DollarSign} 
          label="Prediction Status" 
          value={historyLoading ? "-" : `${history ? history.length : 0} records`}
          color={C.accent1} 
        />
      </div>

      {/* Latest Prediction Report */}
      {!result ? (
        <div className="bg-white rounded-2xl p-10 border flex flex-col items-center justify-center gap-3" style={{ borderColor: C.neutral + "30" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: C.neutral + "18" }}>
            <FileText size={22} style={{ color: C.neutral }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: C.primary }}>No prediction available.</p>
          <p className="text-xs" style={{ color: C.neutral }}>Run a prediction first to generate a report.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Report summary card */}
          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.accent1 + "18" }}>
                  <FileText size={14} style={{ color: C.accent1 }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: C.primary }}>Latest Prediction Report</h3>
                  <p className="text-xs" style={{ color: C.neutral }}>Generated: {timestamp}</p>
                </div>
              </div>
              <Badge color={riskColor(probability)}>{riskLabel(probability)}</Badge>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {([
                ["Customer ID", customerId, C.secondary],
                ["Prediction", result.prediction === 1 ? "Will Churn" : "Will Stay", result.prediction === 1 ? C.accent1 : C.success],
                ["Churn Probability", `${probability}%`, riskColor(probability)],
                ["Segment", result.customer_segment, C.primary],
              ] as any[]).map(([label, value, color]) => (
                <div key={label} className="rounded-xl p-3" style={{ background: C.bg }}>
                  <p className="text-xs mb-1" style={{ color: C.neutral }}>{label}</p>
                  <p className="text-sm font-bold" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SHAP + Recommendations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.secondary + "18" }}>
                  <BarChart3 size={14} style={{ color: C.secondary }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: C.primary }}>Top SHAP Features</h3>
                  <p className="text-xs" style={{ color: C.neutral }}>Key drivers of this prediction</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {shapEntries.map(([feature, impact]) => {
                  const pct = Math.min(Math.abs(impact) * 300, 100);
                  const positive = impact >= 0;
                  return (
                    <div key={feature}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: C.primary }}>{feature}</span>
                        <span className="text-xs font-semibold" style={{ color: positive ? C.accent1 : C.success }}>
                          {positive ? "+" : ""}{impact.toFixed(3)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: positive ? C.accent1 : C.success }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-5 mt-4 pt-3 border-t" style={{ borderColor: C.neutral + "20" }}>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: C.neutral }}>
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: C.accent1 }} />
                  Increases risk
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: C.neutral }}>
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: C.success }} />
                  Decreases risk
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: C.neutral + "30" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.accent2 + "30" }}>
                  <Sparkles size={14} style={{ color: C.accent2 }} />
                </div>
                <h3 className="font-semibold text-sm" style={{ color: C.primary }}>AI Recommendations</h3>
              </div>
              <div className="space-y-3">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="rounded-xl p-3 border-l-2" style={{ background: C.accent2 + "0D", borderColor: C.accent2 }}>
                    <div className="flex items-start gap-2">
                      {(() => {
                        const RecommendationIcon = i === 0 ? AlertTriangle : i === 1 ? Lightbulb : BarChart3;
                        const iconColor = i === 0 ? C.accent1 : i === 1 ? C.accent2 : C.secondary;
                        return <RecommendationIcon size={15} className="mt-0.5 shrink-0" style={{ color: iconColor }} />;
                      })()}
                      <p className="text-xs leading-relaxed" style={{ color: C.primary }}>{rec}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History table */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: C.neutral + "30" }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: C.neutral + "20" }}>
          <h3 className="font-semibold text-sm" style={{ color: C.primary }}>Prediction History</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: C.bg + "60" }}>
              {["Prediction ID", "Customer ID", "Timestamp", "Risk Score", "Prediction", "Segment"].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold" style={{ color: C.neutral }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {historyLoading ? (
              <tr><td colSpan={6} className="px-5 py-6 text-center text-xs" style={{ color: C.neutral }}>Loading history...</td></tr>
            ) : historyError ? (
              <tr><td colSpan={6} className="px-5 py-6 text-center text-xs" style={{ color: C.accent1 }}>{historyError}</td></tr>
            ) : history && history.length > 0 ? (
              history.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50 transition-colors" style={{ borderColor: C.neutral + "20" }}>
                  <td className="px-5 py-3 text-xs font-medium" style={{ color: C.secondary, fontFamily: "DM Mono, monospace" }}>{p.id}</td>
                  <td className="px-5 py-3 text-xs font-semibold" style={{ color: C.primary }}>{p.customer_id ?? "Unknown"}</td>
                  <td className="px-5 py-3 text-xs" style={{ color: C.neutral }}>{p.timestamp ? new Date(p.timestamp).toLocaleString() : "-"}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: riskColor(Math.round((p.probability ?? 0) * 100)) + "18", color: riskColor(Math.round((p.probability ?? 0) * 100)) }}>
                      {Math.round((p.probability ?? 0) * 100)}% {riskLabel(Math.round((p.probability ?? 0) * 100))}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs font-semibold" style={{ color: p.prediction === 1 ? C.accent1 : C.success }}>
                    {p.prediction === 1 ? "Will Churn" : "Will Stay"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge color={segmentColor(p.segment)}>{p.segment}</Badge>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="px-5 py-6 text-center text-xs" style={{ color: C.neutral }}>No history available.</td></tr>
            )}
          </tbody>
        </table>

      </div>
    </div>
  );
}

// --- Screen: Settings ---------------------------------------------------------
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
  const fullName = user?.full_name ?? getStoredUser()?.full_name ?? "RetainIQ User";
  const email = user?.email ?? getStoredUser()?.email ?? "No email available";
  const initials = fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "theme", label: "Appearance", icon: Palette },
  ];
  const themeOptions: { id: ThemePreference; label: string }[] = [
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
    { id: "system", label: "System" },
  ];

  return (
    <div className="p-6 space-y-5" style={{ background: C.bg, fontFamily: "Poppins, sans-serif" }}>
      <div>
        <h2 className="text-xl font-bold" style={{ color: C.primary }}>Settings</h2>
        <p className="text-sm mt-0.5" style={{ color: C.secondary }}>Manage your account and appearance preferences</p>
      </div>

      <div className="flex gap-5">
        {/* Tabs sidebar */}
        <div className="bg-white rounded-2xl p-3 border w-52 shrink-0 self-start" style={{ borderColor: C.neutral + "30", background: C.card }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: tab === id ? C.accent1 + "15" : "transparent",
                color: tab === id ? C.accent1 : C.secondary,
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {tab === "profile" && (
            <div className="bg-white rounded-2xl p-6 border space-y-5" style={{ borderColor: C.neutral + "30", background: C.card }}>
              <h3 className="font-semibold text-sm" style={{ color: C.primary }}>Profile Information</h3>
              <div className="flex items-center gap-4 pb-5 border-b" style={{ borderColor: C.neutral + "20" }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold" style={{ background: C.sidebarAccent, color: C.primary }}>{initials}</div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: C.primary }}>{fullName}</p>
                  <p className="text-xs" style={{ color: C.neutral }}>{email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[["Full Name", fullName], ["Email", email]].map(([l, v]) => (
                  <FormField key={l} label={l} placeholder={v} />
                ))}
              </div>
              <button onClick={onLogout} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: C.accent1 }}>
                <LogOut size={15} />
                Logout
              </button>
            </div>
          )}

          {tab === "theme" && (
            <div className="bg-white rounded-2xl p-6 border space-y-5" style={{ borderColor: C.neutral + "30", background: C.card }}>
              <h3 className="font-semibold text-sm" style={{ color: C.primary }}>Appearance</h3>
              <div>
                <p className="text-xs font-semibold mb-3" style={{ color: C.primary }}>Theme</p>
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map(({ id, label }) => {
                    const active = themePreference === id;
                    return (
                      <button key={id} onClick={() => onThemeChange(id)} className="rounded-xl p-3 border cursor-pointer transition-all text-left" style={{ borderColor: active ? C.accent1 : C.neutral + "40", background: active ? C.accent1 + "08" : C.card }}>
                        <p className="text-xs font-medium" style={{ color: active ? C.accent1 : C.primary }}>{label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold mb-3" style={{ color: C.primary }}>Accent Color</p>
                <div className="grid grid-cols-3 gap-3">
                  {ACCENT_OPTIONS.map(({ name, color, swatches }) => {
                    const active = accentColor === color;
                    return (
                    <button key={name} onClick={() => onAccentChange(color)} className="rounded-xl p-3 border cursor-pointer transition-all text-left" style={{ borderColor: active ? C.accent1 : C.neutral + "40", background: active ? C.accent1 + "08" : C.card }}>
                      <div className="flex gap-1.5 mb-2">
                        {swatches.map((c, i) => <div key={i} className="w-5 h-5 rounded-full" style={{ background: i === 1 ? color : c }} />)}
                      </div>
                      <p className="text-xs font-medium" style={{ color: active ? C.accent1 : C.primary }}>{name}</p>
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

// --- App Shell ----------------------------------------------------------------
const screenTitles: Record<string, string> = {
  dashboard: "Dashboard",
  predict: "Predict Customer",
  result: "Prediction Result",
  segments: "Customer Segments",
  analytics: "Analytics",
  reports: "Reports",
  settings: "Settings",
};

const protectedScreens = new Set(Object.keys(screenTitles));

function isProtectedScreen(screen: string) {
  return protectedScreens.has(screen);
}

function getInitialAuthState(): { screen: string; user: AuthUser | null; notice: string | null } {
  const token = getStoredToken();

  // Root visits should always begin on the public landing page. Saved in-app
  // screen state is cleared so stale values like "register" cannot hijack startup.
  sessionStorage.removeItem("retainiq_current_screen");

  if (!token) {
    return { screen: "landing", user: null, notice: null };
  }

  if (!isTokenValid(token)) {
    clearSession();
    return { screen: "landing", user: null, notice: null };
  }

  const user = getStoredUser();
  if (!user) {
    clearSession();
    return { screen: "landing", user: null, notice: null };
  }

  return { screen: "landing", user, notice: null };
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
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => getEffectiveTheme("system"));

  const effectiveTheme = themePreference === "system" ? systemTheme : themePreference;
  const currentAppearance = useMemo(() => buildAppearance(effectiveTheme, accentColor), [effectiveTheme, accentColor]);

  Object.assign(C, currentAppearance);

  useLayoutEffect(() => {
    applyAppearance(effectiveTheme, accentColor);
  }, [effectiveTheme, accentColor]);

  useEffect(() => {
    if (isProtectedScreen(screen)) {
      sessionStorage.setItem("retainiq_current_screen", screen);
    } else {
      sessionStorage.removeItem("retainiq_current_screen");
    }
  }, [screen]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => setSystemTheme(media.matches ? "dark" : "light");

    handleSystemThemeChange();
    media.addEventListener("change", handleSystemThemeChange);
    return () => media.removeEventListener("change", handleSystemThemeChange);
  }, []);

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

  // Derive sidebar display values from real user or fallback
  const displayName = authUser?.full_name ?? "Guest";
  const displayInitials = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  if (screen === "landing") {
    return (
      <div style={{ fontFamily: "Poppins, sans-serif" }}>
        <LandingPage onNav={navigateToScreen} />
      </div>
    );
  }

  if (screen === "register") {
    return (
      <div style={{ fontFamily: "Poppins, sans-serif" }}>
        <RegisterPage onNav={navigateToScreen} />
      </div>
    );
  }

  if (screen === "login") {
    return (
      <div style={{ fontFamily: "Poppins, sans-serif" }}>
        <LoginPage onNav={navigateToScreen} onLogin={setAuthUser} notice={loginNotice} />
      </div>
    );
  }

  return (
    <AuthGuard user={authUser} onUnauthenticated={() => redirectToLogin(SESSION_EXPIRED_MESSAGE)}>
      <div className="flex h-screen overflow-hidden" style={{ fontFamily: "Poppins, sans-serif", background: C.bg }}>
        <Sidebar active={screen} onNav={navigateToScreen} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} displayName={displayName} displayInitials={displayInitials} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar title={screenTitles[screen] || screen} onNav={navigateToScreen} displayInitials={displayInitials} />
          <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
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

