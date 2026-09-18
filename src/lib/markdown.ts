import Link from "next/link";
import { createElement, type ReactNode } from "react";
import { slugify } from "@/lib/utils";

function safeLink(href: string) {
  const value = href.trim();
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "mailto:" ? value : null;
  } catch {
    return null;
  }
}

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(
        createElement("strong", { key: match.index }, token.slice(2, -2))
      );
    } else {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        const safeHref = safeLink(href);
        if (!safeHref) {
          nodes.push(label);
          lastIndex = match.index + token.length;
          continue;
        }
        const isExternal = safeHref.startsWith("https://");
        nodes.push(
          isExternal
            ? createElement(
                "a",
                {
                  key: match.index,
                  href: safeHref,
                  target: "_blank",
                  rel: "noopener noreferrer",
                },
                label
              )
            : createElement(Link, { key: match.index, href: safeHref }, label)
        );
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length ? nodes : [text];
}

export function extractHeadings(markdown: string): TocItem[] {
  const headings: TocItem[] = [];

  for (const line of markdown.split("\n")) {
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);

    if (h2) {
      const text = h2[1].trim();
      headings.push({ id: slugify(text), text, level: 2 });
    } else if (h3) {
      const text = h3[1].trim();
      headings.push({ id: slugify(text), text, level: 3 });
    }
  }

  return headings;
}

export function renderMarkdown(markdown: string): ReactNode[] {
  const blocks = markdown.trim().split(/\n\n+/);
  const elements: ReactNode[] = [];
  let key = 0;

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const h2 = trimmed.match(/^## (.+)$/);
    const h3 = trimmed.match(/^### (.+)$/);

    if (h2) {
      const text = h2[1].trim();
      const id = slugify(text);
      elements.push(
        createElement("h2", { key: key++, id }, parseInline(text))
      );
      continue;
    }

    if (h3) {
      const text = h3[1].trim();
      const id = slugify(text);
      elements.push(
        createElement("h3", { key: key++, id }, parseInline(text))
      );
      continue;
    }

    const lines = trimmed.split("\n");
    const isUnordered = lines.every((line) => /^- /.test(line));
    const isOrdered = lines.every((line) => /^\d+\. /.test(line));

    if (isUnordered) {
      elements.push(
        createElement(
          "ul",
          { key: key++ },
          lines.map((line, i) =>
            createElement(
              "li",
              { key: i },
              parseInline(line.replace(/^- /, ""))
            )
          )
        )
      );
      continue;
    }

    if (isOrdered) {
      elements.push(
        createElement(
          "ol",
          { key: key++ },
          lines.map((line, i) =>
            createElement(
              "li",
              { key: i },
              parseInline(line.replace(/^\d+\. /, ""))
            )
          )
        )
      );
      continue;
    }

    elements.push(
      createElement("p", { key: key++ }, parseInline(trimmed.replace(/\n/g, " ")))
    );
  }

  return elements;
}
