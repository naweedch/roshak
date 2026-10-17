"use client";

/**
 * وضعیت سمت کلاینت ویترین: کاربر واردشده، سبد خرید و علاقه‌مندی‌ها.
 * منبع حقیقت سرور است؛ این Provider فقط نتیجهٔ API را نگه می‌دارد و پس از هر تغییر از پاسخ سرور به‌روز می‌شود.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import type { CartView } from "@/lib/types/cart";

interface SessionUser {
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
}

interface StoreContextValue {
  ready: boolean;
  user: SessionUser | null;
  cart: CartView | null;
  cartCount: number;
  cartLoading: boolean;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  wishlist: ReadonlySet<string>;
  refreshSession: () => Promise<void>;
  loadCart: () => Promise<CartView | null>;
  addToCart: (variantId: string, quantity: number, label?: string) => Promise<boolean>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeCartItem: (itemId: string) => Promise<void>;
  applyDiscount: (code: string) => Promise<string | null>;
  removeDiscount: () => Promise<void>;
  toggleWishlist: (productId: string, productName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const StoreContext = React.createContext<StoreContextValue | null>(null);

export function useStore(): StoreContextValue {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useStore باید درون StoreProvider استفاده شود");
  return ctx;
}

interface MeResponse {
  user: SessionUser | null;
  cartCount: number;
  wishlist: string[];
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = React.useState(false);
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [cart, setCart] = React.useState<CartView | null>(null);
  const [cartCount, setCartCount] = React.useState(0);
  const [cartLoading, setCartLoading] = React.useState(false);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [wishlist, setWishlist] = React.useState<ReadonlySet<string>>(new Set());

  const applyMe = React.useCallback((me: MeResponse) => {
    setUser(me.user);
    setCartCount(me.cartCount);
    setWishlist(new Set(me.wishlist));
  }, []);

  const refreshSession = React.useCallback(async () => {
    try {
      applyMe(await api<MeResponse>("/api/v1/me"));
    } catch {
      // نمایش سایت بدون وضعیت کاربر ادامه می‌یابد
    } finally {
      setReady(true);
    }
  }, [applyMe]);

  // بارگذاری اولیهٔ وضعیت کاربر؛ به‌روزرسانی state فقط پس از پاسخ شبکه انجام می‌شود
  React.useEffect(() => {
    let cancelled = false;
    api<MeResponse>("/api/v1/me")
      .then((me) => {
        if (!cancelled) applyMe(me);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [applyMe]);

  const applyCart = React.useCallback((view: CartView) => {
    setCart(view);
    setCartCount(view.itemCount);
  }, []);

  const loadCart = React.useCallback(async () => {
    setCartLoading(true);
    try {
      const view = await api<CartView>("/api/v1/cart");
      applyCart(view);
      return view;
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "بارگذاری سبد خرید ناموفق بود");
      return null;
    } finally {
      setCartLoading(false);
    }
  }, [applyCart]);

  const addToCart = React.useCallback(
    async (variantId: string, quantity: number, label?: string) => {
      try {
        const view = await api<CartView>("/api/v1/cart/items", { body: { variantId, quantity } });
        applyCart(view);
        toast.success(label ? `«${label}» به سبد خرید اضافه شد` : "به سبد خرید اضافه شد", {
          action: { label: "مشاهدهٔ سبد", onClick: () => setCartOpen(true) },
        });
        return true;
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : "افزودن به سبد ناموفق بود");
        return false;
      }
    },
    [applyCart],
  );

  const updateCartItem = React.useCallback(
    async (itemId: string, quantity: number) => {
      try {
        applyCart(await api<CartView>(`/api/v1/cart/items/${itemId}`, { method: "PATCH", body: { quantity } }));
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : "به‌روزرسانی سبد ناموفق بود");
        await loadCart();
      }
    },
    [applyCart, loadCart],
  );

  const removeCartItem = React.useCallback(
    async (itemId: string) => {
      try {
        applyCart(await api<CartView>(`/api/v1/cart/items/${itemId}`, { method: "DELETE" }));
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : "حذف از سبد ناموفق بود");
      }
    },
    [applyCart],
  );

  const applyDiscount = React.useCallback(
    async (code: string) => {
      try {
        applyCart(await api<CartView>("/api/v1/cart/discount", { body: { code } }));
        return null;
      } catch (error) {
        return error instanceof ApiError ? error.message : "اعمال کد تخفیف ناموفق بود";
      }
    },
    [applyCart],
  );

  const removeDiscount = React.useCallback(async () => {
    try {
      applyCart(await api<CartView>("/api/v1/cart/discount", { method: "DELETE" }));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "حذف کد تخفیف ناموفق بود");
    }
  }, [applyCart]);

  const toggleWishlist = React.useCallback(
    async (productId: string, productName?: string) => {
      if (!user) {
        toast("برای ذخیرهٔ علاقه‌مندی‌ها وارد حساب خود شوید", {
          action: { label: "ورود", onClick: () => router.push(`/account/login?next=${encodeURIComponent(window.location.pathname)}`) },
        });
        return;
      }
      const has = wishlist.has(productId);
      // به‌روزرسانی خوش‌بینانه؛ در صورت خطا بازگردانده می‌شود
      setWishlist((prev) => {
        const next = new Set(prev);
        if (has) next.delete(productId);
        else next.add(productId);
        return next;
      });
      try {
        const result = has
          ? await api<{ productIds: string[] }>(`/api/v1/wishlist/${productId}`, { method: "DELETE" })
          : await api<{ productIds: string[] }>("/api/v1/wishlist", { body: { productId } });
        setWishlist(new Set(result.productIds));
        toast.success(has ? "از علاقه‌مندی‌ها حذف شد" : productName ? `«${productName}» به علاقه‌مندی‌ها اضافه شد` : "به علاقه‌مندی‌ها اضافه شد");
      } catch (error) {
        setWishlist((prev) => {
          const next = new Set(prev);
          if (has) next.add(productId);
          else next.delete(productId);
          return next;
        });
        toast.error(error instanceof ApiError ? error.message : "تغییر علاقه‌مندی ناموفق بود");
      }
    },
    [user, wishlist, router],
  );

  const logout = React.useCallback(async () => {
    try {
      await api("/api/v1/auth/logout", { method: "POST", body: {} });
    } finally {
      setUser(null);
      setWishlist(new Set());
      setCart(null);
      await refreshSession();
      router.push("/");
      router.refresh();
    }
  }, [refreshSession, router]);

  const value = React.useMemo<StoreContextValue>(
    () => ({
      ready,
      user,
      cart,
      cartCount,
      cartLoading,
      cartOpen,
      setCartOpen,
      wishlist,
      refreshSession,
      loadCart,
      addToCart,
      updateCartItem,
      removeCartItem,
      applyDiscount,
      removeDiscount,
      toggleWishlist,
      logout,
    }),
    [ready, user, cart, cartCount, cartLoading, cartOpen, wishlist, refreshSession, loadCart, addToCart, updateCartItem, removeCartItem, applyDiscount, removeDiscount, toggleWishlist, logout],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
