import { db } from "@/lib/db";
import {
  FALLBACK_ARTICLES,
  FALLBACK_FAQS,
  type ContentArticle,
  type FallbackFaq,
} from "@/lib/fallback-content";

function mergeArticles(databaseArticles: ContentArticle[]) {
  const databaseSlugs = new Set(databaseArticles.map((article) => article.slug));
  return [
    ...databaseArticles,
    ...FALLBACK_ARTICLES.filter(
      (article) => !databaseSlugs.has(article.slug)
    ),
  ];
}

export async function getPublishedArticles(): Promise<ContentArticle[]> {
  try {
    const articles = await db.article.findMany({
      where: { published: true },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        category: true,
        author: true,
        readingTime: true,
        publishedAt: true,
        updatedAt: true,
        metaTitle: true,
        metaDescription: true,
      },
    });

    const normalized = articles.map((article) => ({
      ...article,
      excerpt: article.excerpt ?? "",
      author: article.author ?? "OVIpeps Research Team",
      readingTime: article.readingTime ?? 1,
      publishedAt: article.publishedAt ?? article.updatedAt,
    }));

    return mergeArticles(normalized);
  } catch {
    return FALLBACK_ARTICLES;
  }
}

export async function getPublishedArticle(slug: string) {
  try {
    const article = await db.article.findUnique({
      where: { slug, published: true },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        category: true,
        author: true,
        readingTime: true,
        publishedAt: true,
        updatedAt: true,
        metaTitle: true,
        metaDescription: true,
      },
    });

    if (article) {
      return {
        ...article,
        excerpt: article.excerpt ?? "",
        author: article.author ?? "OVIpeps Research Team",
        readingTime: article.readingTime ?? 1,
        publishedAt: article.publishedAt ?? article.updatedAt,
      } satisfies ContentArticle;
    }
  } catch {
    // Static content remains available when the database is offline.
  }

  return FALLBACK_ARTICLES.find((article) => article.slug === slug) ?? null;
}

export async function getRelatedArticles(
  article: ContentArticle,
  limit = 3
) {
  const articles = await getPublishedArticles();
  return articles
    .filter(
      (candidate) =>
        candidate.slug !== article.slug &&
        candidate.category === article.category
    )
    .slice(0, limit);
}

export async function getPublishedFaqs(): Promise<FallbackFaq[]> {
  try {
    const faqs = await db.faqItem.findMany({
      where: { published: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      select: {
        question: true,
        answer: true,
        category: true,
      },
    });

    if (faqs.length > 0) {
      const databaseQuestions = new Set(faqs.map((faq) => faq.question));
      return [
        ...faqs,
        ...FALLBACK_FAQS.filter(
          (faq) => !databaseQuestions.has(faq.question)
        ),
      ];
    }
  } catch {
    // Static FAQs remain available when the database is offline.
  }

  return FALLBACK_FAQS;
}
