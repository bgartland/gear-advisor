import { useEffect, useRef, useState, useCallback } from 'react';

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

export default function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchProducts = useCallback(async () => {
    setStatus('loading');
    setError(null);
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const res = await fetch('/products.json', { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!mountedRef.current) return;
      // products.json is already normalized to the Product shape (see NOTES.md),
      // so read those fields directly rather than raw Shopify names like body_html.
      const list: Partial<Product>[] = Array.isArray(data) ? data : [];
      const mapped: Product[] = list
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
      setProducts(mapped);
      setStatus('success');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchProducts();
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, [fetchProducts]);

  const retry = useCallback(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, status, error, retry } as const;
}
