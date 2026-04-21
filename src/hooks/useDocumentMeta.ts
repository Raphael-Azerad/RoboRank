import { useEffect } from "react";

interface DocumentMetaOptions {
  title?: string;
  description?: string;
}

/**
 * Updates document.title and key meta/OG tags for SEO and social previews.
 * Restores previous values on unmount.
 */
export function useDocumentMeta({ title, description }: DocumentMetaOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    const tags: { selector: string; attr: "content"; prev: string | null }[] = [];

    const setMeta = (selector: string, value: string | undefined) => {
      if (!value) return;
      const el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) return;
      tags.push({ selector, attr: "content", prev: el.getAttribute("content") });
      el.setAttribute("content", value);
    };

    if (title) document.title = title;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);

    // canonical URL stays current
    const canonicalSel = 'link[rel="canonical"]';
    let canonical = document.querySelector(canonicalSel) as HTMLLinkElement | null;
    let createdCanonical = false;
    const prevCanonicalHref = canonical?.getAttribute("href") ?? null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
      createdCanonical = true;
    }
    canonical.setAttribute("href", window.location.href);

    return () => {
      document.title = prevTitle;
      tags.forEach((t) => {
        const el = document.querySelector(t.selector);
        if (!el) return;
        if (t.prev === null) el.removeAttribute(t.attr);
        else el.setAttribute(t.attr, t.prev);
      });
      if (canonical) {
        if (createdCanonical) canonical.remove();
        else if (prevCanonicalHref !== null) canonical.setAttribute("href", prevCanonicalHref);
      }
    };
  }, [title, description]);
}
