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
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
const [sending, setSending] = useState(false);
const [successMessage, setSuccessMessage] = useState("");
const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadMenu() {
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
          stock_quantity
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
  useEffect(() => {
    loadMenu();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#06140f] p-10 text-white" dir="rtl">
        جاري تحميل المنيو...
      </main>
    );
  }

  if (!branch) {
    return (
      <main className="min-h-screen bg-[#06140f] p-10 text-white" dir="rtl">
        المنيو غير موجود
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#06140f] p-6 pb-40 text-white" dir="rtl">
      <section className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <h1 className="text-4xl font-black">{branch.name}</h1>
          <p className="mt-2 text-gray-400">{branch.city}</p>

          {tableNumber && (
            <div className="mx-auto mt-4 w-fit rounded-full bg-emerald-500 px-5 py-2 font-black text-black">
              طاولة رقم {tableNumber}
            </div>
          )}
        </div>

        <div className="mt-8 space-y-8">
          {categories.map((category) => {
            const availableProducts =
              category.products?.filter(
                (product) =>
                  product.active && (product.stock_quantity ?? 0) > 0
              ) || [];

            if (availableProducts.length === 0) return null;

            return (
              <section key={category.id}>
                <h2 className="mb-4 text-2xl font-black">{category.name}</h2>

                <div className="space-y-4">
                  {availableProducts.map((product) => (
                    <div
                      key={product.id}
                      className="rounded-3xl border border-white/10 bg-white/5 p-5"
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
                          <p className="mt-2 text-sm text-gray-400">
                            {product.description}
                          </p>
                        </div>

                        <p className="font-black text-emerald-400">
                          {product.price} ريال
                        </p>
                      </div>

                      <button
                        onClick={() => addToCart(product)}
                        className="mt-5 w-full rounded-2xl bg-emerald-500 px-5 py-4 font-black text-black"
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
        <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#081b14] p-4">
          <div className="mx-auto max-w-3xl rounded-3xl bg-white/5 p-4">
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
                      className="rounded-xl bg-emerald-500 px-3 py-2 font-black text-black"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
              <p className="text-lg font-black">الإجمالي: {total} ريال</p>
<textarea
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  placeholder="ملاحظات إضافية: بدون سكر، زيادة ثلج..."
  className="mb-4 w-full rounded-2xl bg-black/20 p-4"
/>

{errorMessage && (
  <div className="mb-4 rounded-2xl bg-red-500/20 p-4 text-red-300">
    {errorMessage}
  </div>
)}

{successMessage && (
  <div className="mb-4 rounded-2xl bg-emerald-500/20 p-4 text-emerald-300">
    {successMessage}
  </div>
)}
              <button
  onClick={submitOrder}
  disabled={sending}
  className="rounded-2xl bg-emerald-500 px-6 py-4 font-black text-black disabled:opacity-60"
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