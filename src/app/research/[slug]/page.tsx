import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock, User } from "lucide-react";
import { ArticleCard } from "@/components/content/article-card";
import { Breadcrumb } from "@/components/content/breadcrumb";
import { MarkdownContent } from "@/components/content/markdown-content";
import { TableOfContents } from "@/components/content/table-of-contents";
import { Badge } from "@/components/ui/badge";
import { SITE_NAME, SITE_URL, ARTICLE_CATEGORY_LABELS } from "@/lib/content";
import {
  getPublishedArticle,
  getPublishedArticles,
  getRelatedArticles,
} from "@/lib/content-data";
import { extractHeadings } from "@/lib/markdown";
import { formatDate, getReadingTime } from "@/lib/utils";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const articles = await getPublishedArticles();
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);

  if (!article) {
    return { title: "Article Not Found" };
  }

  return {
    title: article.metaTitle ?? article.title,
    description: article.metaDescription ?? article.excerpt ?? undefined,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);

  if (!article) notFound();

  const related = await getRelatedArticles(article);

  const toc = extractHeadings(article.content);
  const readingTime = article.readingTime ?? getReadingTime(article.content);
  const publishedDate = article.publishedAt;
  const articleUrl = `${SITE_URL}/research/${article.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    author: {
      "@type": "Organization",
      name: article.author ?? SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    datePublished: publishedDate.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    mainEntityOfPage: articleUrl,
    articleSection: ARTICLE_CATEGORY_LABELS[article.category],
    timeRequired: `PT${readingTime}M`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="relative overflow-hidden border-b border-sky/10 bg-gradient-to-br from-sky/10 via-card to-cyan/10 molecular-bg">
        <div className="absolute -right-20 -top-32 h-96 w-96 rounded-full bg-cyan/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-sky/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:py-14 lg:px-6">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Research Hub", href: "/research" },
              { label: article.title },
            ]}
          />

          <div className="mt-6 max-w-3xl">
            <Badge variant="research" className="mb-4">
              {ARTICLE_CATEGORY_LABELS[article.category]}
            </Badge>
            <h1 className="bg-gradient-to-r from-navy-deep via-sky to-cyan bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl lg:leading-tight">
              {article.title}
            </h1>
            {article.excerpt ? (
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                {article.excerpt}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {article.author ? (
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-4 w-4 text-teal" aria-hidden />
                  {article.author}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-teal" aria-hidden />
                {formatDate(publishedDate)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-teal" aria-hidden />
                {readingTime} min read
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_240px]">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <TableOfContents items={toc} />
            </div>
          </aside>

          <article className="min-w-0 rounded-3xl border border-sky/10 bg-card p-6 shadow-xl shadow-sky/5 sm:p-8 lg:p-10">
            <div className="lg:hidden mb-8">
              <TableOfContents items={toc} />
            </div>
            <MarkdownContent content={article.content} />
          </article>

          <aside className="hidden xl:block">
            <div className="sticky top-24 rounded-xl border border-border bg-muted/30 p-5 text-sm">
              <p className="font-semibold text-navy-deep">Research notice</p>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                OVIpeps content is for educational purposes in qualified laboratory
                settings. Products are not intended for human consumption.
              </p>
              <Link
                href="/research-disclaimer"
                className="mt-3 inline-block font-medium text-accent hover:text-navy"
              >
                Read disclaimer →
              </Link>
            </div>
          </aside>
        </div>

        {related.length > 0 ? (
          <section className="mt-16 border-t border-border pt-12">
            <h2 className="text-2xl font-semibold text-navy-deep">
              Related articles
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              More in {ARTICLE_CATEGORY_LABELS[article.category]}
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <ArticleCard key={item.slug} article={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
