import {
  Mail,
  PenSquare,
  TriangleAlert,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import type { SupportType } from "@prisma/client";

/**
 * The catalogue of support options. Adding a new option is a one-entry change
 * here — the nav, the dynamic `/dashboard/support/[category]` page and the
 * generic request form are all driven off this list.
 *
 * `fields: "detailed"` shows priority + page URL (for actionable, site-specific
 * requests); "basic" is just subject + message.
 */
export type SupportFields = "basic" | "detailed";

export type SupportCategory = {
  slug: string;
  type: SupportType;
  label: string;
  hint: string;
  icon: LucideIcon;
  description: string;
  fields: SupportFields;
  subjectLabel: string;
  subjectPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  submitLabel: string;
  successText: string;
};

export const SUPPORT_CATEGORIES: SupportCategory[] = [
  {
    slug: "contact",
    type: "CONTACT",
    label: "Contact us",
    hint: "Questions & feedback",
    icon: Mail,
    description:
      "Questions, feedback, or anything else — send us a message and the Vylora X team will get back to you.",
    fields: "basic",
    subjectLabel: "Subject",
    subjectPlaceholder: "How can we help?",
    messageLabel: "Message",
    messagePlaceholder: "Tell us what you need…",
    submitLabel: "Send message",
    successText: "Sent — we'll be in touch shortly.",
  },
  {
    slug: "website-edits",
    type: "WEBSITE_EDIT",
    label: "Website edits",
    hint: "Request changes",
    icon: PenSquare,
    description:
      "Need a change to your site? Tell us what you'd like updated and we'll take care of it — no technical detail required.",
    fields: "detailed",
    subjectLabel: "Title",
    subjectPlaceholder: "e.g. Update homepage hero text",
    messageLabel: "What would you like changed?",
    messagePlaceholder: "Describe the edit in as much detail as you like…",
    submitLabel: "Submit request",
    successText: "Request submitted — we'll get on it.",
  },
  {
    slug: "report-issue",
    type: "BUG_REPORT",
    label: "Report an issue",
    hint: "Something's broken",
    icon: TriangleAlert,
    description:
      "Spotted something not working on your site? Let us know what's wrong and where, and we'll investigate right away.",
    fields: "detailed",
    subjectLabel: "What's the issue?",
    subjectPlaceholder: "e.g. Contact form not sending",
    messageLabel: "Describe the problem",
    messagePlaceholder:
      "What happened, what did you expect, and how can we reproduce it?",
    submitLabel: "Report issue",
    successText: "Thanks — we've logged the issue and will look into it.",
  },
  {
    slug: "billing",
    type: "BILLING",
    label: "Billing & plans",
    hint: "Invoices & payments",
    icon: CreditCard,
    description:
      "Questions about an invoice, your plan, or payment details? Send us a note and we'll sort it out.",
    fields: "basic",
    subjectLabel: "Subject",
    subjectPlaceholder: "e.g. Question about my latest invoice",
    messageLabel: "Message",
    messagePlaceholder: "How can we help with billing?",
    submitLabel: "Send message",
    successText: "Sent — our team will follow up shortly.",
  },
];

const BY_SLUG = new Map(SUPPORT_CATEGORIES.map((c) => [c.slug, c]));
const BY_TYPE = new Map(SUPPORT_CATEGORIES.map((c) => [c.type, c]));

export function categoryBySlug(slug: string): SupportCategory | undefined {
  return BY_SLUG.get(slug);
}

export function categoryByType(type: SupportType): SupportCategory | undefined {
  return BY_TYPE.get(type);
}

/** The URL slug for a request of the given type (for back-links etc.). */
export function slugForType(type: SupportType): string {
  return BY_TYPE.get(type)?.slug ?? "contact";
}
