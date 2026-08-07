import axios from "axios";

const getBaseURL = () => {
  if (import.meta.env.VITE_API_BASE_URL !== undefined) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // Dynamically fallback to port 8000 when developing on port 5173 or 3000
  if (typeof window !== "undefined" && (window.location.port === "5173" || window.location.port === "3000")) {
    return `${window.location.protocol}//${window.location.hostname}:` + "8000";
  }
  return "";
};

export const apiClient = axios.create({
  baseURL: getBaseURL(),
});

