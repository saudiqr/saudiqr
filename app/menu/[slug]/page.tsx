"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  active: boolean;
  stock_quantity: number | null;
  product_reviews?: {
    rating: number;
  }[];
};

type Category = {
  id: string;
  name: string;
  products: Product[];
};

type Branch = {
  id: string;
  name: string;
  city: string | null;
  slug: string;
};

type BranchSettings = {
  logo_url: string | null;
  cover_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  description: string | null;
};

type CartItem = {
  product: Product;
  quantity: number;
};

export default function MenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = params.slug as string;
  const decodedSlug = decodeURIComponent(slug);
  const tableNumber = searchParams.get("table");

  const [branch, setBranch] = useState<Branch | null>(null);
  const [settings, setSettings] = useState<BranchSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const primaryColor = settings?.primary_color || "#10b981";
  const secondaryColor = settings?.secondary_color || "#06140f";

  async function loadMenu() {
    setLoading(true);

    const { data: branchData } = await supabase
      .from("branches")
      .select("id, name, city, slug")
      .eq("slug", decodedSlug)
      .single();

    if (!branchData) {
      setLoading(false);
      return;
    }

    setBranch(branchData);

    const { data: settingsData } = await supabase
      .from("branch_settings")
      .select("logo_url, cover_url, primary_color, secondary_color, description")
      .eq("branch_id", branchData.id)
      .maybeSingle();

    setSettings(settingsData);

    const { data: categoriesData } = await supabase
      .from("categories")
      .select(`
        id,
        name,
        products (
          id,
          name,
          description,
          price,
          image_url,
          active,
          stock_quantity,
          product_reviews (
            rating
          )
        )
      `)
      .eq("branch_id", branchData.id)
      .order("sort_order", { ascending: true });

    setCategories((categoriesData || []) as Category[]);
    setLoading(false);
  }

  function addToCart(product: Product) {
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.product.id === product.id
      );

      if (existingItem) {
        return currentCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...currentCart, { product, quantity: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  const total = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  async function submitOrder() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!branch) return;

    if (!tableNumber) {
      setErrorMessage("رقم الطاولة غير موجود.");
      return;
    }

    if (cart.length === 0) {
      setErrorMessage("السلة فارغة.");
      return;
    }

    setSending(true);

    const { data: tableData, error: tableError } = await supabase
      .from("tables")
      .select("id")
      .eq("branch_id", branch.id)
      .eq("table_number", Number(tableNumber))
      .single();

    if (tableError || !tableData) {
      setSending(false);
      setErrorMessage("لم يتم العثور على الطاولة.");
      return;
    }

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        branch_id: branch.id,
        table_id: tableData.id,
        status: "new",
        total,
        notes,
      })
      .select("id")
      .single();

    if (orderError || !orderData) {
      setSending(false);
      setErrorMessage(orderError?.message || "فشل إنشاء الطلب.");
      return;
    }

    const orderItems = cart.map((item) => ({
      order_id: orderData.id,
      product_id: item.product.id,
      quantity: item.quantity,
      price: item.product.price,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      setSending(false);
      setErrorMessage(itemsError.message);
      return;
    }

    setCart([]);
    setNotes("");
    setSending(false);
    setSuccessMessage("تم إرسال الطلب بنجاح.");
  }
async function submitReview(productId: string, rating: number) {
  setErrorMessage("");
  setSuccessMessage("");

  if (!branch) return;

  let deviceId = localStorage.getItem("saudiqr_device_id");

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("saudiqr_device_id", deviceId);
  }

  const { error } = await supabase.from("product_reviews").insert({
  branch_id: branch.id,
  product_id: productId,
  device_id: deviceId,
  rating,
  approved: true,
});

  if (error) {
    setErrorMessage("سبق وقمت بتقييم هذا المنتج.");
    return;
  }

  setSuccessMessage("تم إرسال التقييم وسيظهر بعد المراجعة.");
}
  useEffect(() => {
    loadMenu();
  }, []);

  if (loading) {
    return (
      <main
        className="min-h-screen p-10 text-white"
        dir="rtl"
        style={{ backgroundColor: secondaryColor }}
      >
        جاري تحميل المنيو...
      </main>
    );
  }

  if (!branch) {
    return (
      <main
        className="min-h-screen p-10 text-white"
        dir="rtl"
        style={{ backgroundColor: secondaryColor }}
      >
        المنيو غير موجود
      </main>
    );
  }

  return (
    <main
      className="min-h-screen p-6 pb-44 text-white"
      dir="rtl"
      style={{ backgroundColor: secondaryColor }}
    >
      <section className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl">
          {settings?.cover_url ? (
            <img
              src={settings.cover_url}
              alt="Cover"
              className="h-64 w-full object-cover"
            />
          ) : (
            <div
              className="h-40 w-full"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              }}
            />
          )}

          <div className="p-6 text-center">
            {settings?.logo_url && (
              <img
                src={settings.logo_url}
                alt="Logo"
                className="mx-auto -mt-20 h-32 w-32 rounded-3xl border-4 bg-white object-contain p-2 shadow-xl"
                style={{ borderColor: secondaryColor }}
              />
            )}

            <h1 className="mt-4 text-4xl font-black">{branch.name}</h1>

            {branch.city && (
              <p className="mt-2 text-gray-400">{branch.city}</p>
            )}

            {settings?.description && (
              <p className="mx-auto mt-4 max-w-xl leading-8 text-gray-300">
                {settings.description}
              </p>
            )}

            {tableNumber && (
              <div
                className="mx-auto mt-5 w-fit rounded-full px-5 py-2 font-black text-black"
                style={{ backgroundColor: primaryColor }}
              >
                طاولة رقم {tableNumber}
              </div>
            )}
          </div>
        </div>

        {categories.length > 0 && (
          <div
            className="sticky top-0 z-20 mt-6 overflow-x-auto border-y border-white/10 py-3 backdrop-blur"
            style={{ backgroundColor: `${secondaryColor}f2` }}
          >
            <div className="flex gap-3">
              {categories.map((category) => (
                <a
                  key={category.id}
                  href={`#category-${category.id}`}
                  className="shrink-0 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-black"
                >
                  {category.name}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 space-y-8">
          {categories.map((category) => {
            const availableProducts =
              category.products?.filter(
                (product) =>
                  product.active && (product.stock_quantity ?? 0) > 0
              ) || [];

            if (availableProducts.length === 0) return null;

            return (
              <section
                key={category.id}
                id={`category-${category.id}`}
                className="scroll-mt-24"
              >
                <h2 className="mb-4 text-2xl font-black">{category.name}</h2>

                <div className="space-y-4">
                  {availableProducts.map((product) => (
                    <div
                      key={product.id}
                      className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl"
                    >
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="mb-4 h-64 w-full rounded-2xl object-cover"
                        />
                      )}

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-black">{product.name}</h3>

                          {product.description && (
                            <p className="mt-2 text-sm leading-7 text-gray-400">
                              {product.description}
                            </p>
                          )}
                        </div>

                        <p
                          className="shrink-0 font-black"
                          style={{ color: primaryColor }}
                        >
                          {product.price} ريال
                        </p>
                      </div>
{product.product_reviews && product.product_reviews.length > 0 && (
  <div className="mt-3 text-sm text-gray-300">
    ⭐{" "}
    {(
      product.product_reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      ) / product.product_reviews.length
    ).toFixed(1)}
    <span className="text-gray-500">
      {" "}
      ({product.product_reviews.length} تقييم)
    </span>
  </div>
)}
                      <button
                        onClick={() => addToCart(product)}
                        className="mt-5 w-full rounded-2xl px-5 py-4 font-black text-black"
                        style={{ backgroundColor: primaryColor }}
                      >
                        أضف للسلة
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#081b14] p-4">
          <div className="mx-auto max-w-3xl rounded-3xl bg-white/5 p-4 shadow-2xl">
            <h3 className="text-xl font-black">السلة</h3>

            <div className="mt-3 space-y-3">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-bold">{item.product.name}</p>
                    <p className="text-sm text-gray-400">
                      {item.quantity} × {item.product.price} ريال
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="rounded-xl border border-white/10 px-3 py-2"
                    >
                      -
                    </button>

                    <span className="w-6 text-center">{item.quantity}</span>

                    <button
                      onClick={() => addToCart(item.product)}
                      className="rounded-xl px-3 py-2 font-black text-black"
                      style={{ backgroundColor: primaryColor }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية: بدون سكر، زيادة ثلج..."
              className="mt-4 w-full rounded-2xl border border-white/10 bg-black/20 p-4 outline-none"
            />

            {errorMessage && (
              <div className="mt-4 rounded-2xl bg-red-500/20 p-4 text-red-300">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mt-4 rounded-2xl bg-emerald-500/20 p-4 text-emerald-300">
                {successMessage}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
              <p className="text-lg font-black">الإجمالي: {total} ريال</p>

              <button
                onClick={submitOrder}
                disabled={sending}
                className="rounded-2xl px-6 py-4 font-black text-black disabled:opacity-60"
                style={{ backgroundColor: primaryColor }}
              >
                {sending ? "جاري الإرسال..." : "إرسال الطلب"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
