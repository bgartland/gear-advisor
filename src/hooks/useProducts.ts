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
      // If the JSON is a Shopify-style feed with `products`, try to normalize a bit
      const list: Product[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.products)
        ? data.products
        : [];
      // attempt to map minimal fields to our Product shape if needed
      const mapped = (list as any[]).map((p) => ({
        id: p.id,
        title: p.title || '',
        productType: p.product_type || p.type || undefined,
        price: p.price || undefined,
        image: p.image || p.images?.[0]?.src || undefined,
        description: p.body_html || undefined,
        bestseller: (p.tags || '').toLowerCase().includes('bestseller')
      }))
      setProducts(mapped as Product[]);
      setStatus('success');
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (!mountedRef.current) return;
      setError(err.message || String(err));
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
