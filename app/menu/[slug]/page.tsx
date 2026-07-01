"use client";

import { useEffect, useMemo, useState } from "react";
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
  featured?: boolean | null;
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
  business_id: string | null;
  business_name?: string | null;
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
  note: string;
};

type ServiceMode = "once" | "staged";

type TableData = {
  id: string;
  table_number: number;
  current_session_id: string | null;
  status: "available" | "occupied" | "billing" | "cleaning" | "closed" | null;
};

type BillReviewProduct = {
  id: string;
  name: string;
  averageRating: number | null;
  reviewsCount: number;
};

type CustomerOrder = {
  id: string;
  status: string;
  order_number: string | null;
  created_at: string;
  order_items?: { status: string | null }[];
};

const ORDER_STEPS = [
  { key: "new", label: "تحت المراجعة", icon: "🟡" },
  { key: "preparing", label: "جاري التحضير", icon: "🔥" },
  { key: "ready", label: "جاهز", icon: "🟢" },
  { key: "delivered", label: "تم التسليم", icon: "✅" },
];

export default function MenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = params.slug as string;
  const decodedSlug = decodeURIComponent(slug);
  const tableNumber = searchParams.get("table");
  const tableIdParam = searchParams.get("tableId");

  const [branch, setBranch] = useState<Branch | null>(null);
  const [settings, setSettings] = useState<BranchSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [serviceMode, setServiceMode] = useState<ServiceMode>("once");
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [tableClosed, setTableClosed] = useState(false);
  const [tableUnavailableTitle, setTableUnavailableTitle] = useState("هذه الطاولة غير متاحة حالياً");
  const [tableUnavailableDescription, setTableUnavailableDescription] = useState("يرجى التواصل مع الموظف للحصول على طاولة أخرى.");
  const [serviceReviews, setServiceReviews] = useState<Review[]>([]);
  const [reviewSending, setReviewSending] = useState<string | null>(null);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [productNotes, setProductNotes] = useState<Record<string, string>>({});
  const [openProductNoteIds, setOpenProductNoteIds] = useState<Record<string, boolean>>({});
  const [showCartSheet, setShowCartSheet] = useState(false);
  const [showBillReview, setShowBillReview] = useState(false);
  const [billReviewProducts, setBillReviewProducts] = useState<BillReviewProduct[]>([]);
  const [currentTableNumber, setCurrentTableNumber] = useState<number | null>(null);
  const [currentTableSessionId, setCurrentTableSessionId] = useState<string | null>(null);
  const [hasTableOrders, setHasTableOrders] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  function showSuccessToast(message: string, duration = 2000) {
    setErrorMessage("");
    setSuccessMessage(message);

    window.setTimeout(() => {
      setSuccessMessage("");
    }, duration);
  }

  function showErrorToast(message: string, duration = 2500) {
    setSuccessMessage("");
    setErrorMessage(message);

    window.setTimeout(() => {
      setErrorMessage("");
    }, duration);
  }

  const primaryColor = settings?.primary_color || "#C68A3D";
  const secondaryColor = settings?.secondary_color || "#16110E";

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.product.price || 0) * item.quantity, 0),
    [cart]
  );

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const featuredProducts = useMemo(() => {
    return categories
      .flatMap((category) => category.products || [])
      .filter((product) => product.active && (product.stock_quantity ?? 0) > 0 && product.featured)
      .slice(0, 8);
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categories;

    return categories
      .map((category) => ({
        ...category,
        products: (category.products || []).filter((product) =>
          `${product.name} ${product.description || ""}`.toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.products.length > 0);
  }, [categories, searchQuery]);

  const latestOrder = useMemo(() => customerOrders[0] || null, [customerOrders]);
  const serviceAverage = getAverageRating(serviceReviews);

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
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return totalRating / reviews.length;
  }

  function getProductById(productId: string) {
    for (const category of categories) {
      const product = category.products.find((item) => item.id === productId);
      if (product) return product;
    }

    return null;
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
    if (tableIdParam) {
      const { data, error } = await supabase
        .from("tables")
        .select("id, table_number, current_session_id, status")
        .eq("branch_id", branchId)
        .eq("id", tableIdParam)
        .single();

      if (!error && data) return data as TableData;
    }

    if (!tableNumber) return null;

    const { data, error } = await supabase
      .from("tables")
      .select("id, table_number, current_session_id, status")
      .eq("branch_id", branchId)
      .eq("table_number", Number(tableNumber))
      .single();

    if (error || !data) return null;
    return data as TableData;
  }

  async function logActivity(branchId: string, tableId: string, activityType: string) {
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
      await supabase.from("tables").update({ last_activity_at: now }).eq("id", tableId);
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

    if (sessionError || !sessionData) throw new Error("فشل إنشاء جلسة الطاولة.");

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

  async function checkTableHasOrders(tableSessionId: string | null) {
    if (!tableSessionId) {
      setHasTableOrders(false);
      return false;
    }

    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("id")
      .eq("table_session_id", tableSessionId)
      .limit(20);

    if (ordersError || !ordersData || ordersData.length === 0) {
      setHasTableOrders(false);
      return false;
    }

    const orderIds = ordersData.map((order) => order.id);

    const { count: itemsCount } = await supabase
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .in("order_id", orderIds);

    const hasOrders = Number(itemsCount || 0) > 0;
    setHasTableOrders(hasOrders);
    return hasOrders;
  }

  async function loadCustomerOrders(tableSessionId: string | null) {
    if (!branch || !tableSessionId) {
      setCustomerOrders([]);
      return;
    }

    const { data } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        order_number,
        created_at,
        order_items(status)
      `)
      .eq("branch_id", branch.id)
      .eq("table_session_id", tableSessionId)
      .order("created_at", { ascending: false })
      .limit(5);

    setCustomerOrders((data || []) as unknown as CustomerOrder[]);
  }

  async function trackMenuOpened(branchData: Branch) {
    if (!tableNumber && !tableIdParam) return;

    const tableData = await getTableData(branchData.id);
    if (!tableData) return;

    if (tableData.table_number) setCurrentTableNumber(tableData.table_number);

    setCurrentTableSessionId(tableData.current_session_id);
    await checkTableHasOrders(tableData.current_session_id);
    await loadCustomerOrders(tableData.current_session_id);

    if (!["billing", "cleaning", "closed"].includes(tableData.status || "")) {
      const now = new Date().toISOString();
      const tableSessionId = await getOrCreateTableSession(
        branchData.id,
        tableData.id,
        tableData.current_session_id
      );

      await supabase
        .from("tables")
        .update({
          status: "occupied",
          current_session_id: tableSessionId,
          occupied_since: now,
          last_activity_at: now,
        })
        .eq("id", tableData.id);

      setCurrentTableSessionId(tableSessionId);
      await checkTableHasOrders(tableSessionId);
      await loadCustomerOrders(tableSessionId);
    }

    const key = `saudiqr_menu_opened_${branchData.id}_${tableData.id}`;
    if (sessionStorage.getItem(key)) return;

    sessionStorage.setItem(key, "true");
    await logActivity(branchData.id, tableData.id, "menu_opened");
  }

  async function trackCartStarted() {
    if (!branch || (!tableNumber && !tableIdParam)) return;

    const tableData = await getTableData(branch.id);
    if (!tableData) return;

    const key = `saudiqr_cart_started_${branch.id}_${tableData.id}`;
    if (sessionStorage.getItem(key)) return;

    sessionStorage.setItem(key, "true");
    await logActivity(branch.id, tableData.id, "cart_started");
  }

  function getUnavailableTableMessage(status: TableData["status"]) {
    if (status === "cleaning") {
      return {
        title: "الطاولة ما زالت تحت التنظيف",
        description: "فضلاً اختر أقرب طاولة أخرى أو تواصل مع الموظف.",
      };
    }

    if (status === "billing") {
      return {
        title: "الطاولة بانتظار إنهاء الفاتورة",
        description: "هذه الطاولة عليها فاتورة قيد الإنهاء. فضلاً اختر طاولة أخرى.",
      };
    }

    if (status === "closed") {
      return {
        title: "الطاولة خارج الخدمة",
        description: "هذه الطاولة غير متاحة حالياً. فضلاً اختر طاولة أخرى.",
      };
    }

    return {
      title: "هذه الطاولة غير متاحة حالياً",
      description: "يرجى التواصل مع الموظف للحصول على طاولة أخرى.",
    };
  }

  async function loadMenu() {
    setLoading(true);
    setTableClosed(false);

    const { data: branchData } = await supabase
      .from("branches")
      .select("id, name, city, slug, business_id")
      .eq("slug", decodedSlug)
      .single();

    if (!branchData) {
      setLoading(false);
      return;
    }

    let businessName: string | null = null;

    if (branchData.business_id) {
      const { data: businessData } = await supabase
        .from("businesses")
        .select("name")
        .eq("id", branchData.business_id)
        .maybeSingle();

      businessName = businessData?.name || null;
    }

    const nextBranch = { ...(branchData as Branch), business_name: businessName };
    setBranch(nextBranch);

    const { data: settingsData } = await supabase
      .from("branch_settings")
      .select("logo_url, cover_url, primary_color, secondary_color, description")
      .eq("branch_id", branchData.id)
      .maybeSingle();

    setSettings(settingsData);

    if (tableNumber || tableIdParam) {
      const tableData = await getTableData(branchData.id);

      if (tableData?.table_number) setCurrentTableNumber(tableData.table_number);

      if (tableData) {
        setCurrentTableSessionId(tableData.current_session_id);
        await checkTableHasOrders(tableData.current_session_id);
      }

      if (["cleaning", "billing", "closed"].includes(tableData?.status || "")) {
        const unavailableMessage = getUnavailableTableMessage(tableData?.status || null);
        setTableUnavailableTitle(unavailableMessage.title);
        setTableUnavailableDescription(unavailableMessage.description);
        setTableClosed(true);
        setCategories([]);
        setServiceReviews([]);
        setLoading(false);
        return;
      }
    }

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
          featured
        )
      `)
      .eq("branch_id", branchData.id)
      .order("sort_order", { ascending: true });

    const { data: reviewsData } = await supabase
      .from("reviews")
      .select("product_id, review_type, rating")
      .eq("branch_id", branchData.id);

    const reviews = reviewsData || [];

    const categoriesWithReviews = ((categoriesData || []) as Category[]).map((category) => ({
      ...category,
      products: (category.products || []).map((product) => ({
        ...product,
        reviews: reviews
          .filter((review) => review.review_type === "product" && review.product_id === product.id)
          .map((review) => ({ rating: review.rating })),
      })),
    }));

    setServiceReviews(
      reviews
        .filter((review) => review.review_type === "service")
        .map((review) => ({ rating: review.rating }))
    );

    setCategories(categoriesWithReviews);
    setLoading(false);

    await trackMenuOpened(nextBranch);
  }

  function getSelectedQuantity(productId: string) {
    return productQuantities[productId] || 0;
  }

  function increaseProductQuantity(productId: string) {
    setProductQuantities((current) => ({
      ...current,
      [productId]: Math.min((current[productId] || 0) + 1, 99),
    }));

    setOpenProductNoteIds((current) => ({ ...current, [productId]: true }));
  }

  function decreaseProductQuantity(productId: string) {
    setProductQuantities((current) => {
      const nextQuantity = Math.max((current[productId] || 0) - 1, 0);
      if (nextQuantity === 0) {
        setOpenProductNoteIds((notesState) => ({ ...notesState, [productId]: false }));
      }
      return { ...current, [productId]: nextQuantity };
    });
  }

  function updateProductNote(productId: string, note: string) {
    setProductNotes((current) => ({ ...current, [productId]: note }));
  }

  function addToCart(product: Product, quantity = 1) {
    if ((product.stock_quantity ?? 0) <= 0 || !product.active) {
      setErrorMessage("هذا المنتج غير متوفر حالياً.");
      return;
    }

    if (quantity <= 0) {
      setErrorMessage("اختر الكمية أولاً.");
      return;
    }

    if (cart.length === 0) trackCartStarted();

    const note = (productNotes[product.id] || "").trim();

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.product.id === product.id && item.note === note
      );

      if (existingItem) {
        return currentCart.map((item) =>
          item.product.id === product.id && item.note === note
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...currentCart, { product, quantity, note }];
    });

    setProductNotes((current) => ({ ...current, [product.id]: "" }));
    setProductQuantities((current) => ({ ...current, [product.id]: 0 }));
    setOpenProductNoteIds((current) => ({ ...current, [product.id]: false }));
    // CX: لا نفتح السلة تلقائياً بعد كل إضافة. العميل يكمل التصفح، والسلة تبقى في الشريط السفلي.
    showSuccessToast("تمت إضافة المنتج إلى السلة.", 1400);
  }

  function increaseCartItem(productId: string, note: string) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.product.id === productId && item.note === note
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }

  function removeFromCart(productId: string, note = "") {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.product.id === productId && item.note === note
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  async function submitOrder() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!branch) return;

    if (!tableNumber && !tableIdParam) {
      setErrorMessage("رابط الطاولة غير صحيح.");
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
    } catch {
      setSending(false);
      setErrorMessage("فشل إنشاء جلسة الطاولة.");
      return;
    }

    const today = new Date();
    const year = String(today.getFullYear()).slice(-2);
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const dateCode = `${year}${month}${day}`;
    const tableCode = String(tableData.table_number || tableNumber || "00").padStart(2, "0");

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
        service_mode: serviceMode,
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
      notes: item.note?.trim() || null,
      status: "pending",
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

    if (itemsError) {
      setSending(false);
      setErrorMessage(itemsError.message);
      return;
    }

    const now = new Date().toISOString();

    await supabase
      .from("table_sessions")
      .update({ ordered_at: now })
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

    setHasTableOrders(true);
    setCurrentTableSessionId(tableSessionId);
    setCart([]);
    setNotes("");
    setServiceMode("once");
    setShowCartSheet(false);
    setSending(false);
    setSuccessMessage("تم إرسال الطلب بنجاح.");
    await loadCustomerOrders(tableSessionId);
  }

  async function loadBillReviewProducts(tableSessionId: string) {
    const { data } = await supabase
      .from("order_items")
      .select(`
        product_id,
        products (name),
        orders!inner (table_session_id)
      `)
      .eq("orders.table_session_id", tableSessionId);

    const uniqueProducts = new Map<string, BillReviewProduct>();

    ((data || []) as unknown as { product_id: string; products: { name: string } | null }[]).forEach((item) => {
      if (!item.product_id || uniqueProducts.has(item.product_id)) return;

      const product = getProductById(item.product_id);
      const averageRating = getAverageRating(product?.reviews);

      uniqueProducts.set(item.product_id, {
        id: item.product_id,
        name: item.products?.name || product?.name || "منتج غير معروف",
        averageRating,
        reviewsCount: product?.reviews?.length || 0,
      });
    });

    setBillReviewProducts(Array.from(uniqueProducts.values()));
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
            ? { ...product, reviews: [...(product.reviews || []), { rating }] }
            : product
        ),
      }))
    );

    setBillReviewProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === productId
          ? {
              ...product,
              averageRating:
                product.averageRating === null
                  ? rating
                  : (product.averageRating * product.reviewsCount + rating) /
                    (product.reviewsCount + 1),
              reviewsCount: product.reviewsCount + 1,
            }
          : product
      )
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

    if (!branch || (!tableNumber && !tableIdParam)) {
      setErrorMessage("رابط الطاولة غير صحيح.");
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
    } catch {
      setErrorMessage("فشل إنشاء جلسة الطاولة.");
      return;
    }

    const { data: existingCall } = await supabase
      .from("waiter_calls")
      .select("id")
      .eq("table_id", tableData.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingCall) {
      showSuccessToast("تم استدعاء النادل مسبقاً.");
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
    showSuccessToast("تم استدعاء النادل بنجاح.");
  }

  async function requestBill() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!branch || (!tableNumber && !tableIdParam)) {
      setErrorMessage("رابط الطاولة غير صحيح.");
      return;
    }

    const tableData = await getTableData(branch.id);

    if (!tableData) {
      setErrorMessage("لم يتم العثور على الطاولة.");
      return;
    }

    if (["cleaning", "billing", "closed"].includes(tableData.status || "")) {
      setErrorMessage("هذه الطاولة غير متاحة حالياً.");
      return;
    }

    if (!tableData.current_session_id) {
      setHasTableOrders(false);
      setErrorMessage("لا يوجد طلبات على هذه الطاولة حتى الآن.");
      return;
    }

    const sessionHasOrdersBeforeBill = await checkTableHasOrders(tableData.current_session_id);

    if (!sessionHasOrdersBeforeBill) {
      setErrorMessage("لا يوجد طلبات على هذه الطاولة حتى الآن.");
      return;
    }

    let tableSessionId = "";

    try {
      tableSessionId = await getOrCreateTableSession(
        branch.id,
        tableData.id,
        tableData.current_session_id
      );
    } catch {
      setErrorMessage("فشل إنشاء جلسة الطاولة.");
      return;
    }

    const currentHasOrders = await checkTableHasOrders(tableSessionId);

    if (!currentHasOrders) {
      setErrorMessage("لا يوجد طلبات على هذه الطاولة حتى الآن.");
      return;
    }

    const { data: existingBill } = await supabase
      .from("bill_requests")
      .select("id")
      .eq("table_id", tableData.id)
      .eq("status", "pending")
      .maybeSingle();

    if (!existingBill) {
      const { error } = await supabase.from("bill_requests").insert({
        branch_id: branch.id,
        table_id: tableData.id,
      });

      if (error) {
        setErrorMessage("فشل طلب الفاتورة.");
        return;
      }
    }

    const now = new Date().toISOString();

    await supabase
      .from("table_sessions")
      .update({ bill_requested_at: now })
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
    await loadBillReviewProducts(tableSessionId);

    setShowBillReview(true);
    showSuccessToast(
      existingBill
        ? "تم إرسال طلب الفاتورة مسبقاً."
        : "تم إرسال طلب الفاتورة."
    );
  }

  useEffect(() => {
    loadMenu();
  }, []);

  useEffect(() => {
    if (!branch || !currentTableSessionId) return;

    loadCustomerOrders(currentTableSessionId);

    const channel = supabase
      .channel(`customer-order-status-${currentTableSessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `table_session_id=eq.${currentTableSessionId}` },
        () => loadCustomerOrders(currentTableSessionId)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => loadCustomerOrders(currentTableSessionId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branch?.id, currentTableSessionId]);

  if (loading) {
    return <LoadingState secondaryColor={secondaryColor} text="جاري تحميل المنيو..." />;
  }

  if (!branch) {
    return <LoadingState secondaryColor={secondaryColor} text="المنيو غير موجود" />;
  }

  if (tableClosed) {
    return (
      <main dir="rtl" className="min-h-screen p-5 text-[#FFF8F0]" style={{ backgroundColor: secondaryColor }}>
        <section className="mx-auto flex min-h-[calc(100vh-40px)] max-w-xl items-center justify-center">
          <div className="w-full rounded-[2rem] border border-[#4A3425] bg-[#241B16] p-6 text-center shadow-2xl">
            {settings?.cover_url ? (
              <img src={settings.cover_url} alt="Cover" className="mb-5 h-36 w-full rounded-3xl object-cover" />
            ) : null}

            <LogoBlock settings={settings} primaryColor={primaryColor} />
            <h1 className="mt-6 text-3xl font-black">{branch?.name}</h1>
            {branch?.city ? <p className="mt-2 text-[#C8B6A4]">{branch.city}</p> : null}

            <div className="mx-auto mt-5 w-fit rounded-full border border-[#4A3425] bg-[#2A211C] px-5 py-2 font-black text-[#FFF8F0]">
              {currentTableNumber ? `طاولة رقم ${currentTableNumber}` : "الطاولة الحالية"}
            </div>

            <p className="mt-7 text-2xl font-black text-red-200">{tableUnavailableTitle}</p>
            <p className="mt-3 leading-7 text-[#C8B6A4]">{tableUnavailableDescription}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen pb-32 text-[#FFF8F0]" style={{ backgroundColor: secondaryColor }}>
      <section className="mx-auto max-w-3xl px-4 pt-4">
        <HeroCard
          branch={branch}
          settings={settings}
          currentTableNumber={currentTableNumber}
          tableNumber={tableNumber}
          tableIdParam={tableIdParam}
          primaryColor={primaryColor}
          serviceAverage={serviceAverage}
          serviceReviewsCount={serviceReviews.length}
        />

        {latestOrder ? <OrderStatusCard order={latestOrder} primaryColor={primaryColor} /> : null}

        <div className="sticky top-0 z-20 -mx-4 mt-4 border-y border-[#4A3425] bg-[#16110E]/95 px-4 py-3 backdrop-blur">
          <div className="relative">
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#C8B6A4]">🔍</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ابحث عن منتج..."
              className="w-full rounded-2xl border border-[#4A3425] bg-[#241B16] py-4 pr-12 pl-4 text-sm font-bold text-[#FFF8F0] outline-none"
            />
          </div>

          {categories.length > 0 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <a
                  key={category.id}
                  href={`#category-${category.id}`}
                  className="shrink-0 rounded-full border border-[#4A3425] bg-[#241B16] px-4 py-2 text-sm font-black text-[#FFF8F0]"
                >
                  {category.name}
                </a>
              ))}
            </div>
          ) : null}
        </div>

        {featuredProducts.length > 0 ? (
          <section className="mt-5">
            <SectionTitle title="مختارات المطعم" subtitle="منتجات مميزة ننصحك بتجربتها" />
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {featuredProducts.map((product) => (
                <FeaturedProductCard
                  key={product.id}
                  product={product}
                  primaryColor={primaryColor}
                  averageRating={getAverageRating(product.reviews)}
                  selectedQuantity={getSelectedQuantity(product.id)}
                  onIncrease={() => increaseProductQuantity(product.id)}
                  onDecrease={() => decreaseProductQuantity(product.id)}
                  onAdd={() => addToCart(product, getSelectedQuantity(product.id))}
                />
              ))}
            </div>
          </section>
        ) : null}

        <div id="products" className="mt-6 space-y-7">
          {filteredCategories.map((category) => {
            const products = category.products || [];
            if (products.length === 0) return null;

            return (
              <section key={category.id} id={`category-${category.id}`} className="scroll-mt-36">
                <SectionTitle title={category.name} subtitle={`${products.length} منتج`} />

                <div className="mt-3 space-y-3">
                  {products.map((product) => {
                    const productAverage = getAverageRating(product.reviews);
                    const selectedQuantity = getSelectedQuantity(product.id);
                    const isNoteOpen = Boolean(openProductNoteIds[product.id]);

                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        primaryColor={primaryColor}
                        averageRating={productAverage}
                        selectedQuantity={selectedQuantity}
                        isNoteOpen={isNoteOpen}
                        note={productNotes[product.id] || ""}
                        onIncrease={() => increaseProductQuantity(product.id)}
                        onDecrease={() => decreaseProductQuantity(product.id)}
                        onNoteChange={(value) => updateProductNote(product.id, value)}
                        onAdd={() => addToCart(product, selectedQuantity)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}

          {filteredCategories.length === 0 ? (
            <div className="rounded-3xl border border-[#4A3425] bg-[#241B16] p-6 text-center font-black text-[#C8B6A4]">
              لا توجد نتائج مطابقة للبحث.
            </div>
          ) : null}
        </div>
      </section>

      <BottomActionBar
        totalItems={totalItems}
        total={total}
        hasTableOrders={hasTableOrders}
        onCart={() => setShowCartSheet(true)}
        onBill={requestBill}
        onWaiter={callWaiter}
        primaryColor={primaryColor}
      />

      {showCartSheet ? (
        <CartBottomSheet
          cart={cart}
          total={total}
          totalItems={totalItems}
          notes={notes}
          setNotes={setNotes}
          serviceMode={serviceMode}
          setServiceMode={setServiceMode}
          sending={sending}
          primaryColor={primaryColor}
          onClose={() => setShowCartSheet(false)}
          onSubmit={submitOrder}
          onIncrease={increaseCartItem}
          onRemove={removeFromCart}
        />
      ) : null}

      {showBillReview ? (
        <ReviewSheet
          serviceAverage={serviceAverage}
          serviceReviewsCount={serviceReviews.length}
          billReviewProducts={billReviewProducts}
          reviewSending={reviewSending}
          onClose={() => setShowBillReview(false)}
          onServiceRate={submitServiceReview}
          onProductRate={submitReview}
        />
      ) : null}

      <Toast error={errorMessage} success={successMessage} />
    </main>
  );
}

function LoadingState({ secondaryColor, text }: { secondaryColor: string; text: string }) {
  return (
    <main className="min-h-screen p-10 text-[#FFF8F0]" dir="rtl" style={{ backgroundColor: secondaryColor }}>
      {text}
    </main>
  );
}

function LogoBlock({ settings, primaryColor }: { settings: BranchSettings | null; primaryColor: string }) {
  if (settings?.logo_url) {
    return (
      <img
        src={settings.logo_url}
        alt="Logo"
        className="mx-auto h-24 w-24 rounded-3xl bg-[#2A211C] object-contain p-2 shadow-xl"
        style={{ border: `3px solid ${primaryColor}` }}
      />
    );
  }

  return (
    <div
      className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl text-2xl font-black text-[#16110E] shadow-xl"
      style={{ backgroundColor: primaryColor }}
    >
      KARZ
    </div>
  );
}

function HeroCard({
  branch,
  settings,
  currentTableNumber,
  tableNumber,
  tableIdParam,
  primaryColor,
  serviceAverage,
  serviceReviewsCount,
}: {
  branch: Branch;
  settings: BranchSettings | null;
  currentTableNumber: number | null;
  tableNumber: string | null;
  tableIdParam: string | null;
  primaryColor: string;
  serviceAverage: number | null;
  serviceReviewsCount: number;
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#4A3425] bg-[#241B16] shadow-2xl">
      {settings?.cover_url ? <img src={settings.cover_url} alt="Cover" className="h-28 w-full object-cover" /> : null}

      <div className="p-5 text-center">
        <LogoBlock settings={settings} primaryColor={primaryColor} />
        <h1 className="mt-4 text-3xl font-black">{branch.business_name || branch.name}</h1>
        <p className="mt-2 text-sm font-black text-[#C8B6A4]">
          {branch.business_name ? branch.name : branch.city || ""}
        </p>

        {settings?.description ? (
          <p className="mx-auto mt-3 line-clamp-2 max-w-xl text-sm leading-7 text-[#C8B6A4]">
            {settings.description}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {(tableNumber || tableIdParam) ? (
            <span className="rounded-full border border-[#4A3425] bg-[#2A211C] px-4 py-2 text-sm font-black">
              {currentTableNumber ? `طاولة ${currentTableNumber}` : "الطاولة الحالية"}
            </span>
          ) : null}

          <span className="rounded-full border border-[#4A3425] bg-[#2A211C] px-4 py-2 text-sm font-black text-[#C8B6A4]">
            ⭐ {serviceAverage !== null ? serviceAverage.toFixed(1) : "جديد"} {serviceReviewsCount > 0 ? `(${serviceReviewsCount})` : ""}
          </span>
        </div>
      </div>
    </section>
  );
}

function OrderStatusCard({ order, primaryColor }: { order: CustomerOrder; primaryColor: string }) {
  const stepIndex = getOrderStepIndex(order);

  return (
    <section className="mt-4 rounded-3xl border border-[#4A3425] bg-[#241B16] p-4 shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#C8B6A4]">متابعة الطلب</p>
          <h2 className="mt-1 text-xl font-black">#{order.order_number || "طلبك الحالي"}</h2>
        </div>
        <span className="rounded-full px-4 py-2 text-sm font-black text-[#16110E]" style={{ backgroundColor: primaryColor }}>
          مباشر
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {ORDER_STEPS.map((step, index) => {
          const active = index <= stepIndex;
          return (
            <div
              key={step.key}
              className={`rounded-2xl border p-3 text-center text-[11px] font-black ${active ? "border-[#C68A3D] bg-[#C68A3D]/15 text-[#DEA54B]" : "border-[#4A3425] bg-[#2A211C] text-[#8f7d6c]"}`}
            >
              <div className="text-lg">{step.icon}</div>
              <div className="mt-1">{step.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getOrderStepIndex(order: CustomerOrder) {
  const statuses = (order.order_items || []).map((item) => item.status || "pending");

  if (order.status === "delivered" || statuses.length > 0 && statuses.every((status) => status === "delivered")) return 3;
  if (order.status === "ready" || statuses.some((status) => ["ready", "picked_up"].includes(status))) return 2;
  if (order.status === "preparing" || statuses.some((status) => status === "preparing")) return 1;
  return 0;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-black">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm font-bold text-[#C8B6A4]">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function ProductImage({ product, primaryColor, compact = false }: { product: Product; primaryColor: string; compact?: boolean }) {
  const size = compact ? "h-20 w-20" : "h-24 w-24";

  if (product.image_url) {
    return <img src={product.image_url} alt={product.name} className={`${size} shrink-0 rounded-2xl object-cover`} />;
  }

  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-[#16110E]`}
      style={{ backgroundColor: primaryColor }}
    >
      {product.name.slice(0, 1)}
    </div>
  );
}

function FeaturedProductCard({
  product,
  primaryColor,
  averageRating,
  selectedQuantity,
  onIncrease,
  onDecrease,
  onAdd,
}: {
  product: Product;
  primaryColor: string;
  averageRating: number | null;
  selectedQuantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  onAdd: () => void;
}) {
  return (
    <article className="w-56 shrink-0 rounded-3xl border border-[#4A3425] bg-[#241B16] p-3 shadow-xl">
      <ProductImage product={product} primaryColor={primaryColor} compact />
      <h3 className="mt-3 line-clamp-1 text-lg font-black">{product.name}</h3>
      <p className="mt-1 text-sm font-black" style={{ color: primaryColor }}>{product.price} ريال</p>
      <p className="mt-1 text-xs text-[#C8B6A4]">⭐ {averageRating !== null ? averageRating.toFixed(1) : "جديد"}</p>
      <QuantityActions selectedQuantity={selectedQuantity} primaryColor={primaryColor} onIncrease={onIncrease} onDecrease={onDecrease} onAdd={onAdd} />
    </article>
  );
}

function ProductCard({
  product,
  primaryColor,
  averageRating,
  selectedQuantity,
  isNoteOpen,
  note,
  onIncrease,
  onDecrease,
  onNoteChange,
  onAdd,
}: {
  product: Product;
  primaryColor: string;
  averageRating: number | null;
  selectedQuantity: number;
  isNoteOpen: boolean;
  note: string;
  onIncrease: () => void;
  onDecrease: () => void;
  onNoteChange: (value: string) => void;
  onAdd: () => void;
}) {
  const available = product.active && (product.stock_quantity ?? 0) > 0;

  return (
    <article className={`overflow-hidden rounded-3xl border border-[#4A3425] bg-[#241B16] p-4 shadow-xl ${available ? "" : "opacity-60"}`}>
      <div className="flex gap-4">
        <ProductImage product={product} primaryColor={available ? primaryColor : "#6b6258"} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="karz-product-title text-xl font-black">{product.name}</h3>
              {product.description ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#C8B6A4]">{product.description}</p> : null}
            </div>

            <p className="shrink-0 font-black" style={{ color: available ? primaryColor : "#8f7d6c" }}>{product.price} ريال</p>
          </div>

          <div className="karz-product-actions mt-3 flex flex-wrap items-center justify-between gap-3">
            {available ? (
              <div className="text-sm text-[#C8B6A4]">
                ⭐ {averageRating !== null ? averageRating.toFixed(1) : "جديد"}
                {product.reviews?.length ? <span className="text-[#8f7d6c]"> ({product.reviews.length})</span> : null}
              </div>
            ) : (
              <div className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-sm font-black text-red-200">غير متوفر حالياً</div>
            )}

            {available ? (
              <QuantityActions selectedQuantity={selectedQuantity} primaryColor={primaryColor} onIncrease={onIncrease} onDecrease={onDecrease} onAdd={onAdd} />
            ) : null}
          </div>

          {isNoteOpen && selectedQuantity > 0 && available ? (
            <textarea
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="ملاحظة لهذا المنتج: بدون سكر، زيادة ثلج..."
              className="mt-3 w-full rounded-2xl border border-[#4A3425] bg-[#2A211C] p-3 text-sm text-[#FFF8F0] outline-none"
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function QuantityActions({
  selectedQuantity,
  primaryColor,
  onIncrease,
  onDecrease,
  onAdd,
}: {
  selectedQuantity: number;
  primaryColor: string;
  onIncrease: () => void;
  onDecrease: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-2xl border border-[#4A3425] bg-[#2A211C] p-1">
        <button onClick={onDecrease} className="h-9 w-9 rounded-xl border border-[#4A3425] text-lg font-black">-</button>
        <span className="w-7 text-center font-black">{selectedQuantity}</span>
        <button onClick={onIncrease} className="h-9 w-9 rounded-xl text-lg font-black text-[#16110E]" style={{ backgroundColor: primaryColor }}>+</button>
      </div>

      <button onClick={onAdd} disabled={selectedQuantity <= 0} className="rounded-2xl px-4 py-3 text-sm font-black text-[#16110E] disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
        إضافة
      </button>
    </div>
  );
}

function FloatingWaiterButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[#4A3425] bg-[#241B16] text-2xl shadow-2xl"
      title="استدعاء نادل"
    >
      🛎️
    </button>
  );
}

function BottomActionBar({
  totalItems,
  total,
  hasTableOrders,
  onCart,
  onBill,
  onWaiter,
  primaryColor,
}: {
  totalItems: number;
  total: number;
  hasTableOrders: boolean;
  onCart: () => void;
  onBill: () => void;
  onWaiter: () => void;
  primaryColor: string;
}) {
  return (
    <div className="karz-bottom-bar fixed bottom-0 left-0 right-0 z-30 border-t border-[#4A3425] bg-[#16110E]/95 p-3 backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-3 gap-2">
        <button onClick={onWaiter} className="rounded-2xl border border-[#4A3425] bg-[#241B16] px-3 py-3 text-center font-black text-[#FFF8F0] shadow-xl">
          🛎️
          <div className="mt-1 text-[11px] font-bold text-[#C8B6A4]">استدعاء النادل</div>
        </button>

        <button onClick={onCart} className="rounded-2xl px-3 py-3 text-center font-black text-[#16110E] shadow-xl" style={{ backgroundColor: primaryColor }}>
          🧺 عرض السلة
          <div className="mt-1 text-[11px] font-bold">{totalItems} · {total.toFixed(2)} ريال</div>
        </button>

        <button
          onClick={onBill}
          disabled={!hasTableOrders}
          className="rounded-2xl border border-[#4A3425] bg-[#241B16] px-3 py-3 text-center font-black text-[#FFF8F0] shadow-xl disabled:cursor-not-allowed disabled:opacity-45"
        >
          💳 طلب الفاتورة
          <div className="mt-1 text-[11px] font-bold text-[#C8B6A4]">{hasTableOrders ? "مع التقييم" : "بعد الطلب"}</div>
        </button>
      </div>
    </div>
  );
}

function CartBottomSheet({
  cart,
  total,
  totalItems,
  notes,
  setNotes,
  serviceMode,
  setServiceMode,
  sending,
  primaryColor,
  onClose,
  onSubmit,
  onIncrease,
  onRemove,
}: {
  cart: CartItem[];
  total: number;
  totalItems: number;
  notes: string;
  setNotes: (value: string) => void;
  serviceMode: ServiceMode;
  setServiceMode: (value: ServiceMode) => void;
  sending: boolean;
  primaryColor: string;
  onClose: () => void;
  onSubmit: () => void;
  onIncrease: (productId: string, note: string) => void;
  onRemove: (productId: string, note: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={onClose}>
      <section className="max-h-[88vh] w-full overflow-y-auto rounded-t-[2rem] border border-[#4A3425] bg-[#16110E] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">السلة</h2>
              <p className="mt-1 text-sm text-[#C8B6A4]">{totalItems} منتج · {total.toFixed(2)} ريال</p>
            </div>
            <button onClick={onClose} className="rounded-2xl border border-[#4A3425] px-4 py-2 font-black">إغلاق</button>
          </div>

          {cart.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-[#4A3425] bg-[#241B16] p-6 text-center font-black text-[#C8B6A4]">السلة فارغة.</div>
          ) : (
            <>
              <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
                {cart.map((item) => (
                  <div key={`${item.product.id}-${item.note}`} className="rounded-2xl border border-[#4A3425] bg-[#241B16] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold">{item.product.name}</p>
                        <p className="text-sm text-[#C8B6A4]">{item.quantity} × {item.product.price} ريال</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => onRemove(item.product.id, item.note)} className="rounded-xl border border-[#4A3425] px-3 py-2">-</button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <button onClick={() => onIncrease(item.product.id, item.note)} className="rounded-xl px-3 py-2 font-black text-[#16110E]" style={{ backgroundColor: primaryColor }}>+</button>
                      </div>
                    </div>
                    {item.note ? <p className="mt-3 rounded-xl bg-[#2A211C] p-3 text-sm text-[#C8B6A4]">ملاحظة: {item.note}</p> : null}
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-3xl border border-[#4A3425] bg-[#241B16] p-4">
                <h3 className="text-lg font-black">طريقة تقديم الطلب</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <ServiceModeButton active={serviceMode === "once"} title="مرة واحدة" subtitle="يصل الطلب كامل عند الجاهزية" onClick={() => setServiceMode("once")} />
                  <ServiceModeButton active={serviceMode === "staged"} title="على دفعات" subtitle="كل منتج جاهز يصل مباشرة" onClick={() => setServiceMode("staged")} />
                </div>
              </div>

              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="ملاحظة عامة للطلب..."
                className="mt-4 w-full rounded-3xl border border-[#4A3425] bg-[#241B16] p-4 text-sm text-[#FFF8F0] outline-none"
              />

              <button onClick={onSubmit} disabled={sending} className="mt-4 w-full rounded-2xl px-6 py-4 font-black text-[#16110E] disabled:opacity-60" style={{ backgroundColor: primaryColor }}>
                {sending ? "جاري الإرسال..." : `إرسال الطلب · ${total.toFixed(2)} ريال`}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function ServiceModeButton({ active, title, subtitle, onClick }: { active: boolean; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-right font-black ${active ? "border-[#C68A3D] bg-[#C68A3D]/20 text-[#DEA54B]" : "border-[#4A3425] bg-[#2A211C] text-[#FFF8F0]"}`}
    >
      <div>{title}</div>
      <div className="mt-1 text-xs font-bold text-[#C8B6A4]">{subtitle}</div>
    </button>
  );
}

function ReviewSheet({
  serviceAverage,
  serviceReviewsCount,
  billReviewProducts,
  reviewSending,
  onClose,
  onServiceRate,
  onProductRate,
}: {
  serviceAverage: number | null;
  serviceReviewsCount: number;
  billReviewProducts: BillReviewProduct[];
  reviewSending: string | null;
  onClose: () => void;
  onServiceRate: (rating: number) => void;
  onProductRate: (productId: string, rating: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] border border-[#4A3425] bg-[#241B16] p-5 shadow-2xl sm:mx-auto sm:max-w-2xl sm:rounded-[2rem]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black">شكراً لزيارتكم ❤️</h2>
            <p className="mt-2 text-[#C8B6A4]">قيّم تجربتك وساعدنا نطوّر الخدمة.</p>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-[#4A3425] px-4 py-2 font-black">إغلاق</button>
        </div>

        <div className="mt-5 rounded-3xl border border-[#4A3425] bg-[#2A211C] p-4">
          <h3 className="karz-product-title text-xl font-black">تقييم الخدمة</h3>
          <p className="mt-2 text-sm text-[#C8B6A4]">
            {serviceAverage !== null ? `التقييم الحالي: ⭐ ${serviceAverage.toFixed(1)} (${serviceReviewsCount} تقييم)` : "لا توجد تقييمات للخدمة حتى الآن."}
          </p>
          <RatingStars disabled={reviewSending === "service"} onRate={onServiceRate} />
        </div>

        <div className="mt-4 space-y-3">
          <h3 className="karz-product-title text-xl font-black">المنتجات التي طلبتها</h3>
          {billReviewProducts.length === 0 ? (
            <div className="rounded-3xl border border-[#4A3425] bg-[#2A211C] p-4 text-[#C8B6A4]">لا توجد منتجات مرتبطة بهذه الجلسة حتى الآن.</div>
          ) : (
            billReviewProducts.map((product) => (
              <div key={product.id} className="rounded-3xl border border-[#4A3425] bg-[#2A211C] p-4">
                <p className="text-lg font-black">{product.name}</p>
                <p className="mt-1 text-sm text-[#C8B6A4]">
                  {product.averageRating !== null ? `التقييم الحالي: ⭐ ${product.averageRating.toFixed(1)} (${product.reviewsCount} تقييم)` : "لا توجد تقييمات لهذا المنتج."}
                </p>
                <RatingStars disabled={reviewSending === product.id} onRate={(rating) => onProductRate(product.id, rating)} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Toast({ error, success }: { error: string; success: string }) {
  if (!error && !success) return null;

  return (
    <div className="fixed left-4 right-4 top-4 z-[60] mx-auto max-w-xl">
      {error ? <div className="rounded-2xl bg-red-500/90 p-4 text-center font-black text-white shadow-2xl">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-[#4A3425] bg-[#241B16] p-4 text-center font-black text-[#DEA54B] shadow-2xl">{success}</div> : null}
    </div>
  );
}

function RatingStars({ onRate, disabled = false }: { onRate: (rating: number) => void; disabled?: boolean }) {
  const [hoveredRating, setHoveredRating] = useState(0);

  return (
    <div className="mt-4 flex justify-center">
      <div className="flex items-center justify-center gap-1 rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(198,138,61,.45)", background: "rgba(198,138,61,.12)" }}>
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
              style={{ color: isActive ? "#DEA54B" : "rgba(198,138,61,.45)", textShadow: isActive ? "0 0 12px rgba(198,138,61,.45)" : "none" }}
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
