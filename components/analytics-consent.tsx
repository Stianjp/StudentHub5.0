"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { resolveAnalyticsMeasurementId, sanitizeAnalyticsPath } from "@/lib/analytics";

type Choice = "granted" | "denied";
type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

const COOKIE_NAME = "osh_analytics_consent";
const CHOICE_EVENT = "osh-analytics-consent-change";
const noopSubscribe = () => () => undefined;
const getHostname = () => window.location.hostname;

function readChoice(): Choice | null {
  const value = document.cookie.split("; ").find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`))?.split("=")[1];
  return value === "granted" || value === "denied" ? value : null;
}

function saveChoice(choice: Choice) {
  const host = window.location.hostname;
  const domain = host === "oslostudenthub.no" || host.endsWith(".oslostudenthub.no")
    ? "; Domain=.oslostudenthub.no"
    : "";
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=${choice}; Path=/; Max-Age=15552000; SameSite=Lax${domain}${secure}`;
  window.dispatchEvent(new Event(CHOICE_EVENT));
}

function subscribeChoice(onChange: () => void) {
  window.addEventListener(CHOICE_EVENT, onChange);
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener(CHOICE_EVENT, onChange);
    window.removeEventListener("focus", onChange);
  };
}

function disableAnalytics(measurementId: string) {
  (window as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] = true;
  const suffix = measurementId.replace(/^G-/, "");
  for (const name of ["_ga", `_ga_${suffix}`]) {
    document.cookie = `${name}=; Path=/; Max-Age=0`;
    if (window.location.hostname === "oslostudenthub.no" || window.location.hostname.endsWith(".oslostudenthub.no")) {
      document.cookie = `${name}=; Path=/; Domain=.oslostudenthub.no; Max-Age=0; Secure`;
    }
  }
}

function sendPageView(measurementId: string) {
  const analyticsWindow = window as AnalyticsWindow;
  const pagePath = sanitizeAnalyticsPath(window.location.pathname);
  let pageReferrer: string | undefined;
  try {
    const referrer = new URL(document.referrer);
    pageReferrer = referrer.origin;
  } catch {
    // A direct visit has no referrer.
  }
  analyticsWindow.gtag?.("event", "page_view", {
    send_to: measurementId,
    page_title: window.location.hostname.startsWith("student.") || window.location.hostname.startsWith("bedrift.") ? "Oslo Student Hub portal" : document.title,
    page_location: `${window.location.origin}${pagePath}`,
    page_path: pagePath,
    page_referrer: pageReferrer,
  });
}

export function AnalyticsConsent() {
  const pathname = usePathname();
  const hostname = useSyncExternalStore(noopSubscribe, getHostname, () => "");
  const measurementId = resolveAnalyticsMeasurementId(hostname);
  const choice = useSyncExternalStore(subscribeChoice, readChoice, () => null);
  const lastPageView = useRef<string | null>(null);

  useEffect(() => {
    if (!measurementId || choice === null) return;
    if (choice === "denied") {
      disableAnalytics(measurementId);
      lastPageView.current = null;
      return;
    }

    (window as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] = false;
    const analyticsWindow = window as AnalyticsWindow;
    if (!analyticsWindow.gtag) {
      analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
      analyticsWindow.gtag = (...args: unknown[]) => { analyticsWindow.dataLayer?.push(args); };
      analyticsWindow.gtag("js", new Date());
      analyticsWindow.gtag("config", measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(script);
    }
    const pageLocation = `${window.location.origin}${window.location.pathname}`;
    if (lastPageView.current !== pageLocation) {
      sendPageView(measurementId);
      lastPageView.current = pageLocation;
    }
  }, [choice, pathname, measurementId]);

  if (!measurementId) return null;

  return choice === null ? (
    <aside aria-label="Analytics choice" className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-xl rounded-2xl border border-white/20 bg-[#140249] p-5 text-white shadow-2xl">
      <p className="text-sm font-semibold">Help us understand how our website is used</p>
      <p className="mt-2 text-sm text-white/80">With your permission, we use Google Analytics to count visits and see which pages are used. You can change your choice later. <a className="underline" href="https://www.oslostudenthub.no/personvern">Privacy policy</a></p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => saveChoice("granted")} className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#140249]">Allow analytics</button>
        <button type="button" onClick={() => saveChoice("denied")} className="rounded-full border border-white px-5 py-2 text-sm font-semibold text-white">Decline</button>
      </div>
    </aside>
  ) : (
    <button
      type="button"
      onClick={() => saveChoice(choice === "granted" ? "denied" : "granted")}
      className="fixed bottom-4 left-4 z-[100] rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-[#140249] shadow-md"
      aria-label={`Analytics: ${choice === "granted" ? "on" : "off"}. Change choice`}
    >
      Analytics: {choice === "granted" ? "on" : "off"}
    </button>
  );
}
