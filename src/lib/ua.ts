import { UAParser } from "ua-parser-js";
import type { DeviceType } from "@prisma/client";

export type ParsedUA = {
  browser: string | null;
  os: string | null;
  deviceType: DeviceType;
};

// Cheap, allowlist-light bot signal. The collector also relies on this to drop
// obvious crawlers before they pollute analytics.
const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|pinterest|vkshare|w3c_validator|whatsapp|telegrambot|headlesschrome|phantomjs|lighthouse|gtmetrix|pingdom|uptimerobot|semrush|ahrefs|dotbot|mj12bot/i;

export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true; // missing UA is overwhelmingly automated traffic
  return BOT_RE.test(userAgent);
}

export function parseUA(userAgent: string | null | undefined): ParsedUA {
  if (!userAgent) return { browser: null, os: null, deviceType: "unknown" };
  const parsed = UAParser(userAgent);
  const deviceType = mapDeviceType(parsed.device.type);
  return {
    browser: parsed.browser.name ?? null,
    os: parsed.os.name ?? null,
    deviceType,
  };
}

function mapDeviceType(type: string | undefined): DeviceType {
  switch (type) {
    case "mobile":
      return "mobile";
    case "tablet":
      return "tablet";
    case undefined:
      // ua-parser-js leaves desktop devices undefined.
      return "desktop";
    default:
      return "unknown";
  }
}
