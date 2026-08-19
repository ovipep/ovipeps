/**
 * Analytics event tracking architecture for OVIpeps.
 * Events are dispatched to window.dataLayer for GTM/GA4 integration.
 * No PII is included in event payloads.
 */

export type AnalyticsEvent =
  | { event: "product_view"; product_id: string; product_name: string }
  | { event: "search"; search_term: string; results_count: number }
  | { event: "add_to_cart"; product_id: string; variant_id: string; value: number }
  | { event: "begin_checkout"; value: number; item_count: number }
  | { event: "order_created"; order_number: string; value: number }
  | { event: "payment_confirmed"; order_number: string; value: number }
  | { event: "purchase"; order_number: string; value: number; currency: string }
  | { event: "affiliate_click"; affiliate_code: string }
  | { event: "affiliate_code_applied"; affiliate_code: string }
  | { event: "affiliate_conversion"; affiliate_code: string; order_number: string; value: number }
  | { event: "calculator_opened" }
  | { event: "calculator_completed" }
  | { event: "coa_viewed"; coa_id: string; product_name: string }
  | { event: "article_viewed"; article_slug: string; article_title: string };

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function trackEvent(payload: AnalyticsEvent) {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);

  if (process.env.NODE_ENV === "development") {
    console.debug("[Analytics]", payload);
  }
}
