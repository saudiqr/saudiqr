"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Review = {
  rating: number;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  active: boolean;
  stock_quantity: number | null;
  reviews?: Review[];
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

type TableData = {
  id: string;
  current_session_id: string | null;
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
  const [serviceReviews, setServiceReviews] = useState<Review[]>([]);
  const [reviewSending, setReviewSending] = useState<string | null>(null);

  const primaryColor = settings?.primary_color || "#10b981";
  const secondaryColor = settings?.secondary_color || "#06140f";

  function getDeviceId() {
    let deviceId = localStorage.getItem("saudiqr_device_id");

    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("saudiqr_device_id", deviceId);
    }

    return deviceId;
  }

  function getAverageRating(reviews?: Review[]) {
    if (!reviews || reviews.length === 0) return null;

    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
  }

  function renderStars(value: number) {
    return "★".repeat(value) + "☆".repeat(5 - value);
  }

  async function hasRecentReview(options: {
    branchId: string;
    productId?: string | null;
    reviewType: "product" | "service";
  }) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let query = supabase
      .from("reviews")
      .select("id")
      .eq("branch_id", options.branchId)
      .eq("device_id", getDeviceId())
      .eq("review_type", options.reviewType)
      .gte("created_at", sevenDaysAgo.toISOString())
      .limit(1);

    if (options.productId) {
      query = query.eq("product_id", options.productId);
    } else {
      query = query.is("product_id", null);
    }

    const { data, error } = await query;

    if (error) return false;

    return (data || []).length > 0;
  }

  async function getTableData(branchId: string): Promise<TableData | null> {
    if (!tableNumber) return null;

    const { data, error } = await supabase
      .from("tables")
      .select("id, current_session_id")
      .eq("branch_id", branchId)
      .eq("table_number", Number(tableNumber))
      .single();

    if (error || !data) return null;

    return data as TableData;
  }

  async function logActivity(
    branchId: string,
    tableId: string,
    activityType: string
  ) {
    await supabase.from("table_activity_logs").insert({
      branch_id: branchId,
      table_id: tableId,
      device_id: getDeviceId(),
      activity_type: activityType,
    });
  }

  async function getOrCreateTableSession(
    branchId: string,
    tableId: string,
    currentSessionId: string | null
  ) {
    const now = new Date().toISOString();

    if (currentSessionId) {
      await supabase
        .from("tables")
        .update({
          last_activity_at: now,
        })
        .eq("id", tableId);

      return currentSessionId;
    }

    const { data: sessionData, error: sessionError } = await supabase
      .from("table_sessions")
      .insert({
        branch_id: branchId,
        table_id: tableId,
        status: "active",
        opened_at: now,
      })
      .select("id")
      .single();

    if (sessionError || !sessionData) {
      throw new Error("فشل إنشاء جلسة الطاولة.");
    }

    await supabase
      .from("tables")
      .update({
        status: "occupied",
        current_session_id: sessionData.id,
        occupied_since: now,
        last_activity_at: now,
      })
      .eq("id", tableId);

    return sessionData.id as string;
  }

  async function trackMenuOpened(branchData: Branch) {
    if (!tableNumber) return;

    const tableData = await getTableData(branchData.id);
    if (!tableData) return;

    const key = `saudiqr_menu_opened_${branchData.id}_${tableData.id}`;

    if (sessionStorage.getItem(key)) return;

    sessionStorage.setItem(key, "true");

    await logActivity(branchData.id, tableData.id, "menu_opened");
  }

  async function trackCartStarted() {
    if (!branch || !tableNumber) return;

    const tableData = await getTableData(branch.id);
    if (!tableData) return;

    const key = `saudiqr_cart_started_${branch.id}_${tableData.id}`;

    if (sessionStorage.getItem(key)) return;

    sessionStorage.setItem(key, "true");

    await logActivity(branch.id, tableData.id, "cart_started");
  }

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
    await trackMenuOpened(branchData);

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
          stock_quantity
        )
      `)
      .eq("branch_id", branchData.id)
      .order("sort_order", { ascending: true });

    const { data: reviewsData } = await supabase
      .from("reviews")
      .select("product_id, review_type, rating")
      .eq("branch_id", branchData.id);

    const reviews = reviewsData || [];

    const categoriesWithReviews = ((categoriesData || []) as Category[]).map(
      (category) => ({
        ...category,
        products: (category.products || []).map((product) => ({
          ...product,
          reviews: reviews
            .filter(
              (review) =>
                review.review_type === "product" &&
                review.product_id === product.id
            )
            .map((review) => ({ rating: review.rating })),
        })),
      })
    );

    setServiceReviews(
      reviews
        .filter((review) => review.review_type === "service")
        .map((review) => ({ rating: review.rating }))
    );

    setCategories(categoriesWithReviews);
    setLoading(false);
  }

  function addToCart(product: Product) {
    if (cart.length === 0) {
      trackCartStarted();
    }

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

    const tableData = await getTableData(branch.id);

    if (!tableData) {
      setSending(false);
      setErrorMessage("لم يتم العثور على الطاولة.");
      return;
    }

    let tableSessionId = "";

    try {
      tableSessionId = await getOrCreateTableSession(
        branch.id,
        tableData.id,
        tableData.current_session_id
      );
    } catch (error) {
      setSending(false);
      setErrorMessage("فشل إنشاء جلسة الطاولة.");
      return;
    }

    const today = new Date();

    const year = String(today.getFullYear()).slice(-2);
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    const dateCode = `${year}${month}${day}`;
    const tableCode = String(tableNumber).padStart(2, "0");

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const { count: todayOrdersCount } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("branch_id", branch.id)
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString());

    const orderSequence = String((todayOrdersCount || 0) + 1).padStart(4, "0");
    const orderNumber = `${dateCode}/${tableCode}/${orderSequence}`;

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        branch_id: branch.id,
        table_id: tableData.id,
        table_session_id: tableSessionId,
        status: "new",
        total,
        notes,
        order_number: orderNumber,
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

    const now = new Date().toISOString();

    await supabase
      .from("table_sessions")
      .update({
        ordered_at: now,
      })
      .eq("id", tableSessionId)
      .is("ordered_at", null);

    await supabase
      .from("tables")
      .update({
        status: "occupied",
        current_session_id: tableSessionId,
        last_activity_at: now,
      })
      .eq("id", tableData.id);

    await logActivity(branch.id, tableData.id, "order_sent");

    setCart([]);
    setNotes("");
    setSending(false);
    setSuccessMessage("تم إرسال الطلب بنجاح.");
  }

  async function submitReview(productId: string, rating: number) {
    setErrorMessage("");
    setSuccessMessage("");

    if (!branch) return;

    setReviewSending(productId);

    const alreadyReviewed = await hasRecentReview({
      branchId: branch.id,
      productId,
      reviewType: "product",
    });

    if (alreadyReviewed) {
      setReviewSending(null);
      setErrorMessage("سبق وقمت بتقييم هذا المنتج خلال آخر 7 أيام.");
      return;
    }

    const { error } = await supabase.from("reviews").insert({
      branch_id: branch.id,
      product_id: productId,
      review_type: "product",
      device_id: getDeviceId(),
      rating,
    });

    if (error) {
      setReviewSending(null);
      setErrorMessage(error.message || "فشل إرسال التقييم.");
      return;
    }

    setCategories((currentCategories) =>
      currentCategories.map((category) => ({
        ...category,
        products: category.products.map((product) =>
          product.id === productId
            ? {
                ...product,
                reviews: [...(product.reviews || []), { rating }],
              }
            : product
        ),
      }))
    );

    setReviewSending(null);
    setSuccessMessage("تم إرسال تقييم المنتج بنجاح.");
  }

  async function submitServiceReview(rating: number) {
    setErrorMessage("");
    setSuccessMessage("");

    if (!branch) return;

    setReviewSending("service");

    const alreadyReviewed = await hasRecentReview({
      branchId: branch.id,
      productId: null,
      reviewType: "service",
    });

    if (alreadyReviewed) {
      setReviewSending(null);
      setErrorMessage("سبق وقمت بتقييم الخدمة خلال آخر 7 أيام.");
      return;
    }

    const { error } = await supabase.from("reviews").insert({
      branch_id: branch.id,
      product_id: null,
      review_type: "service",
      device_id: getDeviceId(),
      rating,
    });

    if (error) {
      setReviewSending(null);
      setErrorMessage(error.message || "فشل إرسال تقييم الخدمة.");
      return;
    }

    setServiceReviews((currentReviews) => [...currentReviews, { rating }]);
    setReviewSending(null);
    setSuccessMessage("تم إرسال تقييم الخدمة بنجاح.");
  }

  async function callWaiter() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!branch || !tableNumber) {
      setErrorMessage("رقم الطاولة غير موجود.");
      return;
    }

    const tableData = await getTableData(branch.id);

    if (!tableData) {
      setErrorMessage("لم يتم العثور على الطاولة.");
      return;
    }

    let tableSessionId = "";

    try {
      tableSessionId = await getOrCreateTableSession(
        branch.id,
        tableData.id,
        tableData.current_session_id
      );
    } catch (error) {
      setErrorMessage("فشل إنشاء جلسة الطاولة.");
      return;
    }

    const { error } = await supabase.from("waiter_calls").insert({
      branch_id: branch.id,
      table_id: tableData.id,
    });

    if (error) {
      setErrorMessage("فشل استدعاء النادل.");
      return;
    }

    await supabase
      .from("tables")
      .update({
        status: "occupied",
        current_session_id: tableSessionId,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", tableData.id);

    await logActivity(branch.id, tableData.id, "waiter_called");

    setSuccessMessage("تم استدعاء النادل بنجاح.");
  }

  async function requestBill() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!branch || !tableNumber) {
      setErrorMessage("رقم الطاولة غير موجود.");
      return;
    }

    const tableData = await getTableData(branch.id);

    if (!tableData) {
      setErrorMessage("لم يتم العثور على الطاولة.");
      return;
    }

    let tableSessionId = "";

    try {
      tableSessionId = await getOrCreateTableSession(
        branch.id,
        tableData.id,
        tableData.current_session_id
      );
    } catch (error) {
      setErrorMessage("فشل إنشاء جلسة الطاولة.");
      return;
    }

    const { error } = await supabase.from("bill_requests").insert({
      branch_id: branch.id,
      table_id: tableData.id,
    });

    if (error) {
      setErrorMessage("فشل طلب الفاتورة.");
      return;
    }

    const now = new Date().toISOString();

    await supabase
      .from("table_sessions")
      .update({
        bill_requested_at: now,
      })
      .eq("id", tableSessionId)
      .is("bill_requested_at", null);

    await supabase
      .from("tables")
      .update({
        status: "billing",
        current_session_id: tableSessionId,
        last_activity_at: now,
      })
      .eq("id", tableData.id);

    await logActivity(branch.id, tableData.id, "bill_requested");

    setSuccessMessage("تم إرسال طلب الفاتورة.");
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

  const serviceAverage = getAverageRating(serviceReviews);

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

            <div className="mx-auto mt-5 max-w-xl rounded-3xl border border-white/10 bg-black/20 p-5">
              <h2 className="font-black">تقييم الخدمة</h2>

              {serviceAverage !== null ? (
                <div className="mt-2 text-sm text-gray-300">
                  ⭐ {serviceAverage.toFixed(1)}
                  <span className="text-gray-500">
                    {" "}
                    ({serviceReviews.length} تقييم)
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-400">
                  لا توجد تقييمات للخدمة حتى الآن.
                </p>
              )}

              <RatingStars
                disabled={reviewSending === "service"}
                onRate={(rating) => submitServiceReview(rating)}
              />
            </div>

            {tableNumber && (
              <div>
                <div
                  className="mx-auto mt-5 w-fit rounded-full px-5 py-2 font-black text-black"
                  style={{ backgroundColor: primaryColor }}
                >
                  طاولة رقم {tableNumber}
                </div>

                <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-5 text-right">
                  <h2 className="font-black">طريقة الطلب</h2>
                  <div className="mt-3 grid gap-3 text-sm text-gray-300 sm:grid-cols-3">
                    <div>1- اختر المنتجات وأضفها للسلة.</div>
                    <div>2- اضغط إرسال الطلب من أسفل الصفحة.</div>
                    <div>3- يمكنك استدعاء نادل أو طلب الفاتورة من هنا.</div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "16px",
                    marginTop: "24px",
                  }}
                >
                  <a
                    href="#products"
                    className="rounded-3xl border border-emerald-400/30 bg-emerald-500/20 p-5 text-center font-black text-emerald-200 shadow-xl"
                  >
                    <div className="text-3xl">🛒</div>
                    <div className="mt-2">طلب من المنيو</div>
                    <div className="mt-1 text-xs">
                      اختر المنتجات ثم أرسل الطلب
                    </div>
                  </a>

                  <a
                    href="#cart"
                    className="rounded-3xl border border-purple-400/30 bg-purple-500/20 p-5 text-center font-black text-purple-200 shadow-xl"
                  >
                    <div className="text-3xl">🧺</div>
                    <div className="mt-2">عرض السلة</div>
                    <div className="mt-1 text-xs">
                      راجع طلبك قبل الإرسال
                    </div>
                  </a>

                  <button
                    onClick={callWaiter}
                    className="rounded-3xl border border-blue-400/30 bg-blue-500/20 p-5 text-center font-black text-blue-200 shadow-xl"
                  >
                    <div className="text-3xl">🛎️</div>
                    <div className="mt-2">استدعاء نادل</div>
                    <div className="mt-1 text-xs">
                      للمساعدة أو الطلب من الموظف
                    </div>
                  </button>

                  <button
                    onClick={requestBill}
                    className="rounded-3xl border border-yellow-400/30 bg-yellow-500/20 p-5 text-center font-black text-yellow-200 shadow-xl"
                  >
                    <div className="text-3xl">💳</div>
                    <div className="mt-2">طلب الفاتورة</div>
                    <div className="mt-1 text-xs">
                      اطلب الحساب من الكاشير
                    </div>
                  </button>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mx-auto mt-5 max-w-xl rounded-2xl bg-red-500/20 p-4 text-red-300">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mx-auto mt-5 max-w-xl rounded-2xl bg-emerald-500/20 p-4 text-emerald-300">
                {successMessage}
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

        <div id="products" className="mt-8 space-y-8">
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
                  {availableProducts.map((product) => {
                    const productAverage = getAverageRating(product.reviews);

                    return (
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
                            <h3 className="text-xl font-black">
                              {product.name}
                            </h3>

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

                        {productAverage !== null ? (
                          <div className="mt-3 text-sm text-gray-300">
                            ⭐ {productAverage.toFixed(1)}
                            <span className="text-gray-500">
                              {" "}
                              ({product.reviews?.length || 0} تقييم)
                            </span>
                          </div>
                        ) : (
                          <div className="mt-3 text-sm text-gray-500">
                            لا توجد تقييمات بعد
                          </div>
                        )}

                        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                          <p className="mb-2 text-sm font-black text-gray-300">
                            قيّم المنتج
                          </p>

                          <RatingStars
                            disabled={reviewSending === product.id}
                            onRate={(rating) => submitReview(product.id, rating)}
                          />
                        </div>

                        <button
                          onClick={() => addToCart(product)}
                          className="mt-5 w-full rounded-2xl px-5 py-4 font-black text-black"
                          style={{ backgroundColor: primaryColor }}
                        >
                          أضف للسلة
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      {cart.length > 0 && (
        <div
          id="cart"
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#081b14] p-4"
        >
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

function RatingStars({
  onRate,
  disabled = false,
}: {
  onRate: (rating: number) => void;
  disabled?: boolean;
}) {
  const [hoveredRating, setHoveredRating] = useState(0);

  return (
    <div className="mt-4 flex justify-center">
      <div
        className="flex items-center justify-center gap-1 rounded-2xl border px-4 py-3"
        style={{
          borderColor: "rgba(250,204,21,.35)",
          background: "rgba(250,204,21,.10)",
        }}
      >
        {[1, 2, 3, 4, 5].map((rating) => {
          const isActive = hoveredRating >= rating;

          return (
            <button
              key={rating}
              type="button"
              onClick={() => onRate(rating)}
              onMouseEnter={() => setHoveredRating(rating)}
              onMouseLeave={() => setHoveredRating(0)}
              disabled={disabled}
              className="text-3xl leading-none transition hover:scale-125 disabled:opacity-50"
              style={{
                color: isActive ? "#facc15" : "rgba(250,204,21,.45)",
                textShadow: isActive
                  ? "0 0 12px rgba(250,204,21,.45)"
                  : "none",
              }}
              title={`${rating} من 5`}
            >
              ★
            </button>
          );
        })}
      </div>
    </div>
  );
}
