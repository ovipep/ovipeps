import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailTemplateEditor } from "@/components/admin/email-template-editor";
import {
  getCustomerEmailRecords,
  getNewsletterContacts,
  getSentEmails,
} from "@/lib/email-center";
import { getEditableEmailTemplates } from "@/lib/emails";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "customers", label: "Customers" },
  { key: "sent", label: "Sent emails" },
  { key: "templates", label: "Templates" },
] as const;

type EmailView = (typeof VIEWS)[number]["key"];

function isEmailView(value: string | undefined): value is EmailView {
  return VIEWS.some((view) => view.key === value);
}

function statusVariant(status: string) {
  if (["delivered", "opened", "clicked"].includes(status)) return "success" as const;
  if (["bounced", "failed", "complained", "suppressed"].includes(status)) {
    return "warning" as const;
  }
  return "default" as const;
}

export default async function AdminEmailCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string }>;
}) {
  const params = await searchParams;
  const view = isEmailView(params.view) ? params.view : "customers";
  const query = params.q?.trim().toLowerCase() ?? "";

  const [sentEmails, contacts, templates] = await Promise.all([
    getSentEmails(),
    getNewsletterContacts(),
    getEditableEmailTemplates(),
  ]);
  const customers = await getCustomerEmailRecords(contacts.data);
  const visibleCustomers = query
    ? customers.filter(
        (customer) =>
          customer.email.includes(query) ||
          customer.name?.toLowerCase().includes(query) ||
          customer.sources.some((source) => source.toLowerCase().includes(query))
      )
    : customers;
  const visibleEmails = query
    ? sentEmails.data.filter(
        (email) =>
          email.subject.toLowerCase().includes(query) ||
          email.to.some((recipient) => recipient.toLowerCase().includes(query))
      )
    : sentEmails.data;
  const subscribedCount = contacts.data.filter((contact) => !contact.unsubscribed).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-deep">
          Email Center
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find customer addresses, review delivery history, and control automatic
          OVIpeps emails.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Customer addresses
            </p>
            <p className="mt-1 text-2xl font-semibold text-navy-deep">{customers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recent sent emails
            </p>
            <p className="mt-1 text-2xl font-semibold text-navy-deep">
              {sentEmails.configured ? sentEmails.data.length : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Newsletter subscribers
            </p>
            <p className="mt-1 text-2xl font-semibold text-navy-deep">
              {contacts.configured ? subscribedCount : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-border pb-3" aria-label="Email Center">
        {VIEWS.map((item) => (
          <Link
            key={item.key}
            href={`/admin/emails?view=${item.key}`}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              view === item.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {view !== "templates" ? (
        <form method="get" className="flex max-w-xl gap-2">
          <input type="hidden" name="view" value={view} />
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder={view === "customers" ? "Search name, email, or source" : "Search recipient or subject"}
            className="h-10 flex-1 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Search
          </button>
        </form>
      ) : null}

      {view === "customers" ? (
        <Card>
          <CardHeader>
            <CardTitle>Customer email addresses</CardTitle>
            <p className="text-sm text-muted-foreground">
              Combined from customer accounts, orders, affiliate applications, and
              opted-in newsletter contacts. Order customers are not automatically
              subscribed to marketing emails.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Sources</th>
                  <th className="px-5 py-3 font-medium">Orders</th>
                  <th className="px-5 py-3 font-medium">Total ordered</th>
                  <th className="px-5 py-3 font-medium">Newsletter</th>
                  <th className="px-5 py-3 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {visibleCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                      No customer email addresses match this search.
                    </td>
                  </tr>
                ) : (
                  visibleCustomers.map((customer) => (
                    <tr key={customer.email} className="border-b border-border/60 align-top">
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">{customer.name ?? "—"}</p>
                        <a className="text-sky hover:underline" href={`mailto:${customer.email}`}>
                          {customer.email}
                        </a>
                        {customer.roles.length ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {customer.roles.join(", ")}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {customer.sources.map((source) => (
                            <Badge key={source}>{source}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 tabular-nums">{customer.orderCount}</td>
                      <td className="px-5 py-4 tabular-nums">
                        {formatCurrency(customer.totalSpent)}
                      </td>
                      <td className="px-5 py-4">
                        {customer.newsletterStatus === "subscribed" ? (
                          <Badge variant="success">Subscribed</Badge>
                        ) : customer.newsletterStatus === "unsubscribed" ? (
                          <Badge variant="warning">Unsubscribed</Badge>
                        ) : (
                          <span className="text-muted-foreground">Not subscribed</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {formatDate(customer.lastActivity)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {view === "sent" ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Sent email history</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  The most recent 100 messages and their latest delivery status.
                </p>
              </div>
              <a
                href="https://resend.com/emails"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-sky hover:underline"
              >
                Open full Resend history
              </a>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {sentEmails.error ? (
              <div className="m-5 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
                {sentEmails.error}
              </div>
            ) : (
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Recipient</th>
                    <th className="px-5 py-3 font-medium">Subject</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Sent</th>
                    <th className="px-5 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {visibleEmails.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                        No sent emails match this search.
                      </td>
                    </tr>
                  ) : visibleEmails.map((email) => (
                    <tr key={email.id} className="border-b border-border/60">
                      <td className="px-5 py-4">{email.to.join(", ")}</td>
                      <td className="px-5 py-4 font-medium">{email.subject}</td>
                      <td className="px-5 py-4">
                        <Badge variant={statusVariant(email.status)}>{email.status}</Badge>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {formatDate(email.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <a
                          href={`https://resend.com/emails/${email.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-sky hover:underline"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      ) : null}

      {view === "templates" ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-sky/20 bg-sky/5 p-4 text-sm text-muted-foreground">
            These are the live transactional templates used by the website. Saving a
            template changes future emails only; previously sent messages remain unchanged.
          </div>
          {templates.map((template) => (
            <Card key={template.key}>
              <CardContent>
                <EmailTemplateEditor template={template} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
