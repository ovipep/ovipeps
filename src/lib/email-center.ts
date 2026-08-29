import { Resend } from "resend";
import { db } from "@/lib/db";

export interface CustomerEmailRecord {
  email: string;
  name: string | null;
  sources: Array<"Account" | "Order" | "Affiliate">;
  roles: string[];
  orderCount: number;
  totalSpent: number;
  lastActivity: Date;
  newsletterStatus: "subscribed" | "unsubscribed" | null;
}

export interface SentEmailRecord {
  id: string;
  to: string[];
  from: string;
  subject: string;
  status: string;
  createdAt: string;
}

export interface NewsletterContactRecord {
  id: string;
  email: string;
  name: string | null;
  unsubscribed: boolean;
  createdAt: string;
}

export interface ResendAdminResult<T> {
  data: T;
  error: string | null;
  configured: boolean;
}

function managementClient() {
  const apiKey = process.env.RESEND_ADMIN_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

export async function getSentEmails(): Promise<
  ResendAdminResult<SentEmailRecord[]>
> {
  const resend = managementClient();
  if (!resend) {
    return {
      data: [],
      error: "Sent history is waiting for the Resend admin key.",
      configured: false,
    };
  }

  try {
    const { data, error } = await resend.emails.list({ limit: 100 });
    if (error) {
      return { data: [], error: error.message, configured: true };
    }
    return {
      data: (data?.data ?? []).map((email) => ({
        id: email.id,
        to: email.to,
        from: email.from,
        subject: email.subject,
        status: email.last_event,
        createdAt: email.created_at,
      })),
      error: null,
      configured: true,
    };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : "Unable to load sent emails.",
      configured: true,
    };
  }
}

export async function getNewsletterContacts(): Promise<
  ResendAdminResult<NewsletterContactRecord[]>
> {
  const resend = managementClient();
  if (!resend) {
    return {
      data: [],
      error: "Newsletter contacts are waiting for the Resend admin key.",
      configured: false,
    };
  }

  try {
    const { data, error } = await resend.contacts.list({ limit: 100 });
    if (error) {
      return { data: [], error: error.message, configured: true };
    }
    return {
      data: (data?.data ?? []).map((contact) => ({
        id: contact.id,
        email: contact.email,
        name: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || null,
        unsubscribed: contact.unsubscribed,
        createdAt: contact.created_at,
      })),
      error: null,
      configured: true,
    };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : "Unable to load contacts.",
      configured: true,
    };
  }
}

interface MutableCustomerRecord {
  email: string;
  name: string | null;
  sources: Set<CustomerEmailRecord["sources"][number]>;
  roles: Set<string>;
  orderCount: number;
  totalSpent: number;
  lastActivity: Date;
  newsletterStatus: CustomerEmailRecord["newsletterStatus"];
}

function newerDate(current: Date, candidate: Date) {
  return candidate.getTime() > current.getTime() ? candidate : current;
}

export async function getCustomerEmailRecords(
  contacts: NewsletterContactRecord[] = []
): Promise<CustomerEmailRecord[]> {
  const [users, orders, applications] = await Promise.all([
    db.user.findMany({
      select: {
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.order.findMany({
      select: {
        email: true,
        total: true,
        createdAt: true,
        shippingAddress: true,
      },
    }),
    db.affiliateApplication.findMany({
      select: { email: true, name: true, createdAt: true, updatedAt: true },
    }),
  ]);

  const customers = new Map<string, MutableCustomerRecord>();
  const getRecord = (rawEmail: string, activity: Date) => {
    const email = rawEmail.trim().toLowerCase();
    const existing = customers.get(email);
    if (existing) {
      existing.lastActivity = newerDate(existing.lastActivity, activity);
      return existing;
    }
    const created: MutableCustomerRecord = {
      email,
      name: null,
      sources: new Set(),
      roles: new Set(),
      orderCount: 0,
      totalSpent: 0,
      lastActivity: activity,
      newsletterStatus: null,
    };
    customers.set(email, created);
    return created;
  };

  for (const user of users) {
    const record = getRecord(user.email, newerDate(user.createdAt, user.updatedAt));
    record.sources.add("Account");
    record.roles.add(user.role);
    record.name =
      [user.firstName, user.lastName].filter(Boolean).join(" ") || record.name;
  }

  for (const order of orders) {
    const record = getRecord(order.email, order.createdAt);
    record.sources.add("Order");
    record.orderCount += 1;
    record.totalSpent += order.total;
    if (!record.name && order.shippingAddress && typeof order.shippingAddress === "object") {
      const address = order.shippingAddress as Record<string, unknown>;
      const firstName = typeof address.firstName === "string" ? address.firstName : "";
      const lastName = typeof address.lastName === "string" ? address.lastName : "";
      record.name = [firstName, lastName].filter(Boolean).join(" ") || null;
    }
  }

  for (const application of applications) {
    const record = getRecord(
      application.email,
      newerDate(application.createdAt, application.updatedAt)
    );
    record.sources.add("Affiliate");
    record.name = application.name || record.name;
  }

  for (const contact of contacts) {
    const record = getRecord(contact.email, new Date(contact.createdAt));
    record.newsletterStatus = contact.unsubscribed ? "unsubscribed" : "subscribed";
    record.name = contact.name || record.name;
  }

  return Array.from(customers.values())
    .map((record) => ({
      ...record,
      sources: Array.from(record.sources),
      roles: Array.from(record.roles),
    }))
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
}
