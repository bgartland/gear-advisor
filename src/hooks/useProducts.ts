import { useEffect, useState, useCallback } from 'react';

export type Product = {
  id: number | string;
  title: string;
  productType?: string;
  price?: number;
  image?: string;
  description?: string;
  bestseller?: boolean;
};

type Status = 'loading' | 'success' | 'error';

// products.json is already normalized to the Product shape (see NOTES.md),
// so read those fields directly rather than raw Shopify names like body_html.
function toProducts(data: unknown): Product[] {
  const list: Partial<Product>[] = Array.isArray(data) ? data : [];
  return list
    .filter((p): p is Partial<Product> & Pick<Product, 'id'> => p?.id != null)
    .map((p) => ({
      id: p.id,
      title: p.title ?? '',
      productType: p.productType,
      price: typeof p.price === 'number' ? p.price : undefined,
      image: p.image,
      description: p.description,
      bestseller: p.bestseller === true,
    }));
}

export default function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  // bumping this re-runs the fetch effect
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // aborting on cleanup also covers unmount, so no separate "mounted" flag is needed
    const controller = new AbortController();

    fetch('/products.json', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setProducts(toProducts(data));
        setStatus('success');
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      });

    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setStatus('loading');
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  return { products, status, error, retry } as const;
}
