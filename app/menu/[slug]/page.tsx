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
  const [showCartDetails, setShowCartDetails] = useState(false);
  const [showBillReview, setShowBillReview] = useState(false);
  const [billReviewProducts, setBillReviewProducts] = useState<BillReviewProduct[]>([]);
  const [currentTableNumber, setCurrentTableNumber] = useState<number | null>(null);
  const [currentTableSessionId, setCurrentTableSessionId] = useState<string | null>(null);
  const [hasTableOrders, setHasTableOrders] = useState(false);

  const primaryColor = settings?.primary_color || "#C68A3D";
  const secondaryColor = settings?.secondary_color || "#16110E";

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

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

  async function trackMenuOpened(branchData: Branch) {
    if (!tableNumber && !tableIdParam) return;

    const tableData = await getTableData(branchData.id);
    if (!tableData) return;

    if (tableData.table_number) {
      setCurrentTableNumber(tableData.table_number);
    }

    setCurrentTableSessionId(tableData.current_session_id);
    await checkTableHasOrders(tableData.current_session_id);

    if (
      tableData.status !== "billing" &&
      tableData.status !== "cleaning" &&
      tableData.status !== "closed"
    ) {
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

    setBranch({
      ...(branchData as Branch),
      business_name: businessName,
    });

    const { data: settingsData } = await supabase
      .from("branch_settings")
      .select("logo_url, cover_url, primary_color, secondary_color, description")
      .eq("branch_id", branchData.id)
      .maybeSingle();

    setSettings(settingsData);

    if (tableNumber || tableIdParam) {
      const tableData = await getTableData(branchData.id);

      if (tableData?.table_number) {
        setCurrentTableNumber(tableData.table_number);
      }

      if (tableData) {
        setCurrentTableSessionId(tableData.current_session_id);
        await checkTableHasOrders(tableData.current_session_id);
      }

      if (
        tableData?.status === "cleaning" ||
        tableData?.status === "billing" ||
        tableData?.status === "closed"
      ) {
        const unavailableMessage = getUnavailableTableMessage(tableData.status);

        setTableUnavailableTitle(unavailableMessage.title);
        setTableUnavailableDescription(unavailableMessage.description);
        setTableClosed(true);
        setCategories([]);
        setServiceReviews([]);
        setLoading(false);
        return;
      }
    }

    await trackMenuOpened(branchData);

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

  function getSelectedQuantity(productId: string) {
    return productQuantities[productId] || 0;
  }

  function increaseProductQuantity(productId: string) {
    setProductQuantities((current) => ({
      ...current,
      [productId]: Math.min((current[productId] || 0) + 1, 99),
    }));

    setOpenProductNoteIds((current) => ({
      ...current,
      [productId]: true,
    }));
  }

  function decreaseProductQuantity(productId: string) {
    setProductQuantities((current) => {
      const nextQuantity = Math.max((current[productId] || 0) - 1, 0);

      if (nextQuantity === 0) {
        setOpenProductNoteIds((notesState) => ({
          ...notesState,
          [productId]: false,
        }));
      }

      return {
        ...current,
        [productId]: nextQuantity,
      };
    });
  }

  function updateProductNote(productId: string, note: string) {
    setProductNotes((current) => ({
      ...current,
      [productId]: note,
    }));
  }

  function addToCart(product: Product, quantity = 1) {
    if (quantity <= 0) {
      setErrorMessage("اختر الكمية أولاً.");
      return;
    }

    if (cart.length === 0) {
      trackCartStarted();
    }

    setShowCartDetails(false);

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

    setProductNotes((current) => ({
      ...current,
      [product.id]: "",
    }));

    setProductQuantities((current) => ({
      ...current,
      [product.id]: 0,
    }));

    setOpenProductNoteIds((current) => ({
      ...current,
      [product.id]: false,
    }));

    setSuccessMessage("تمت إضافة المنتج إلى السلة.");
    setTimeout(() => setSuccessMessage(""), 1800);
  }

  function increaseCartItem(productId: string, note: string) {
    setShowCartDetails(false);

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

    setHasTableOrders(true);
    setCurrentTableSessionId(tableSessionId);

    setCart([]);
    setNotes("");
    setShowCartDetails(false);
    setSending(false);
    setSuccessMessage("تم إرسال الطلب بنجاح.");
  }

  async function loadBillReviewProducts(tableSessionId: string) {
    const { data } = await supabase
      .from("order_items")
      .select(`
        product_id,
        products (
          name
        ),
        orders!inner (
          table_session_id
        )
      `)
      .eq("orders.table_session_id", tableSessionId);

    const uniqueProducts = new Map<string, BillReviewProduct>();

    ((data || []) as unknown as {
      product_id: string;
      products: { name: string } | null;
    }[]).forEach((item) => {
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
            ? {
                ...product,
                reviews: [...(product.reviews || []), { rating }],
              }
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
      setSuccessMessage("تم استدعاء النادل مسبقاً.");
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

    if (!branch || (!tableNumber && !tableIdParam)) {
      setErrorMessage("رابط الطاولة غير صحيح.");
      return;
    }

    const tableData = await getTableData(branch.id);

    if (!tableData) {
      setErrorMessage("لم يتم العثور على الطاولة.");
      return;
    }
    if (
  tableData.status === "cleaning" ||
  tableData.status === "billing" ||
  tableData.status === "closed"
) {
  setErrorMessage("هذه الطاولة غير متاحة حالياً.");
  return;
}


    if (!tableData.current_session_id) {
      setHasTableOrders(false);
      setErrorMessage("لا يوجد طلبات على هذه الطاولة حتى الآن.");
      return;
    }

    const sessionHasOrdersBeforeBill = await checkTableHasOrders(
      tableData.current_session_id
    );

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
    await loadBillReviewProducts(tableSessionId);

    setShowBillReview(true);
    setSuccessMessage(existingBill ? "تم طلب الفاتورة مسبقاً." : "تم إرسال طلب الفاتورة.");
  }

  useEffect(() => {
    loadMenu();
  }, []);

  const serviceAverage = getAverageRating(serviceReviews);

  if (loading) {
    return (
      <main
        className="min-h-screen p-10 text-[#FFF8F0]"
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
        className="min-h-screen p-10 text-[#FFF8F0]"
        dir="rtl"
        style={{ backgroundColor: secondaryColor }}
      >
        المنيو غير موجود
      </main>
    );
  }

  if (tableClosed) {
    return (
      <main
        className="min-h-screen p-6 text-[#FFF8F0]"
        dir="rtl"
        style={{ backgroundColor: secondaryColor }}
      >
        <section className="mx-auto flex min-h-[calc(100vh-48px)] max-w-xl items-center justify-center">
          <div className="w-full rounded-[2rem] border border-[#4A3425] bg-[#241B16] p-8 text-center shadow-2xl">
            {settings?.cover_url ? (
              <img
                src={settings.cover_url}
                alt="Cover"
                className="mb-6 h-40 w-full rounded-3xl object-cover"
              />
            ) : null}

            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt="Logo"
                className="mx-auto h-40 w-40 rounded-3xl bg-[#2A211C] object-contain p-4 shadow-xl"
              />
            ) : (
              <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-3xl bg-[#2A211C] p-4 text-xl font-black text-[#C8B6A4] shadow-xl">
                Logo
              </div>
            )}

            <h1 className="mt-8 text-4xl font-black">{branch?.name}</h1>

            {branch?.city ? (
              <p className="mt-2 text-[#C8B6A4]">{branch.city}</p>
            ) : null}

            <div
              className="mx-auto mt-6 w-fit rounded-full border border-[#4A3425] bg-[#2A211C] px-5 py-2 font-black text-[#FFF8F0]"
            >
              {tableNumber
  ? `طاولة رقم ${tableNumber}`
  : "الطاولة الحالية"}
            </div>

            <p className="mt-8 text-2xl font-black text-red-200">
              {tableUnavailableTitle}
            </p>

            <p className="mt-3 leading-7 text-[#C8B6A4]">
              {tableUnavailableDescription}
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen p-5 pb-28 text-[#FFF8F0]"
      dir="rtl"
      style={{ backgroundColor: secondaryColor }}
    >
      <section className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-[2rem] border border-[#4A3425] bg-[#241B16] shadow-2xl">
          {settings?.cover_url ? (
            <img
              src={settings.cover_url}
              alt="Cover"
              className="h-44 w-full object-cover"
            />
          ) : null}

          <div className="p-6 text-center">
            {settings?.logo_url && (
              <img
                src={settings.logo_url}
                alt="Logo"
                className="mx-auto h-28 w-28 rounded-3xl border-4 bg-[#2A211C] object-contain p-2 shadow-xl"
                style={{ borderColor: secondaryColor }}
              />
            )}

            <h1 className="mt-4 text-4xl font-black">
              {branch.business_name || branch.name}
            </h1>

            <p className="mt-2 text-lg font-black text-[#C8B6A4]">
              {branch.business_name ? branch.name : branch.city || ""}
            </p>

            {branch.business_name && branch.city ? (
              <p className="mt-1 text-sm font-bold text-[#8f7d6c]">{branch.city}</p>
            ) : null}

            {settings?.description && (
              <p className="mx-auto mt-4 max-w-xl leading-8 text-[#C8B6A4]">
                {settings.description}
              </p>
            )}

            {(tableNumber || tableIdParam) && (
              <div className="mx-auto mt-5 w-fit rounded-full border border-[#4A3425] bg-[#2A211C] px-5 py-2 font-black text-[#FFF8F0]">
                {currentTableNumber
                  ? `طاولة رقم ${currentTableNumber}`
                  : "الطاولة الحالية"}
              </div>
            )}

            {(tableNumber || tableIdParam) && (
              <div className="mx-auto mt-5 grid max-w-2xl grid-cols-2 gap-3">
                <a
                  href="#products"
                  className="rounded-3xl border border-[#4A3425] bg-[#2A211C] p-4 text-center font-black text-[#FFF8F0] shadow-xl"
                >
                  <div className="text-2xl">🛒</div>
                  <div className="mt-1">طلب من المنيو</div>
                  <div className="mt-1 text-[11px] text-[#C8B6A4]">اختر المنتجات ثم أرسل الطلب</div>
                </a>

                <button
                  onClick={callWaiter}
                  className="rounded-3xl border border-[#4A3425] bg-[#2A211C] p-4 text-center font-black text-[#FFF8F0] shadow-xl"
                >
                  <div className="text-2xl">🛎️</div>
                  <div className="mt-1">استدعاء نادل</div>
                  <div className="mt-1 text-[11px] text-[#C8B6A4]">للمساعدة من الموظف</div>
                </button>

                <button
                  onClick={() => setShowCartDetails(true)}
                  className="rounded-3xl border border-[#4A3425] bg-[#2A211C] p-4 text-center font-black text-[#FFF8F0] shadow-xl"
                >
                  <div className="text-2xl">🧺</div>
                  <div className="mt-1">عرض السلة</div>
                  <div className="mt-1 text-[11px] text-[#C8B6A4]">راجع طلبك قبل الإرسال</div>
                </button>

                <button
                  onClick={() => {
                    if (!hasTableOrders) {
                      setErrorMessage("لا يوجد طلبات على هذه الطاولة حتى الآن.");
                      return;
                    }

                    requestBill();
                  }}
                  disabled={!hasTableOrders}
                  className="rounded-3xl border border-[#4A3425] bg-[#2A211C] p-4 text-center font-black text-[#FFF8F0] shadow-xl disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <div className="text-2xl">💳</div>
                  <div className="mt-1">طلب الفاتورة</div>
                  <div className="mt-1 text-[11px] text-[#C8B6A4]">
                    {hasTableOrders ? "بعد الطلب تظهر صفحة التقييم" : "متاح بعد إرسال طلب"}
                  </div>
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="mx-auto mt-5 max-w-xl rounded-2xl bg-red-500/20 p-4 text-red-300">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-[#4A3425] bg-[#2A211C] p-4 text-[#DEA54B]">
                {successMessage}
              </div>
            )}
          </div>
        </div>

        {categories.length > 0 && (
          <div
            className="sticky top-0 z-20 mt-6 overflow-x-auto border-y border-[#4A3425] py-3 backdrop-blur"
            style={{ backgroundColor: `${secondaryColor}f2` }}
          >
            <div className="flex gap-3">
              {categories.map((category) => {
                const firstImage = category.products?.find(
                  (product) => product.image_url
                )?.image_url;

                return (
                  <a
                    key={category.id}
                    href={`#category-${category.id}`}
                    className="flex shrink-0 items-center gap-3 rounded-full border border-[#4A3425] bg-[#241B16] px-4 py-3 text-sm font-black"
                  >
                    {firstImage ? (
                      <img
                        src={firstImage}
                        alt={category.name}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full text-[#16110E]"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {category.name.slice(0, 1)}
                      </span>
                    )}

                    <span>{category.name}</span>
                  </a>
                );
              })}
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
                className="scroll-mt-28"
              >
                <div className="mb-4 rounded-[2rem] border border-[#4A3425] bg-[#241B16] shadow-xl">
                  <div className="p-5">
                    <h2 className="text-3xl font-black">{category.name}</h2>
                    <p className="mt-2 text-sm font-bold text-[#C8B6A4]">
                      {availableProducts.length} منتج متاح
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {availableProducts.map((product) => {
                    const productAverage = getAverageRating(product.reviews);
                    const selectedQuantity = getSelectedQuantity(product.id);
                    const isNoteOpen = Boolean(openProductNoteIds[product.id]);

                    return (
                      <article
                        key={product.id}
                        className="overflow-hidden rounded-3xl border border-[#4A3425] bg-[#241B16] p-4 shadow-xl"
                      >
                        <div className="flex gap-4">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-24 w-24 shrink-0 rounded-2xl object-cover"
                            />
                          ) : (
                            <div
                              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl text-3xl font-black text-[#16110E]"
                              style={{ backgroundColor: primaryColor }}
                            >
                              {product.name.slice(0, 1)}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="text-xl font-black">
                                  {product.name}
                                </h3>

                                {product.description && (
                                  <p className="mt-1 text-sm leading-7 text-[#C8B6A4]">
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

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                              {productAverage !== null ? (
                                <div className="text-sm text-[#C8B6A4]">
                                  ⭐ {productAverage.toFixed(1)}
                                  <span className="text-[#8f7d6c]">
                                    {" "}
                                    ({product.reviews?.length || 0})
                                  </span>
                                </div>
                              ) : (
                                <div className="text-sm text-[#8f7d6c]">
                                  لا توجد تقييمات
                                </div>
                              )}

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 rounded-2xl border border-[#4A3425] bg-[#2A211C] p-1">
                                  <button
                                    onClick={() => decreaseProductQuantity(product.id)}
                                    className="h-10 w-10 rounded-xl border border-[#4A3425] text-lg font-black"
                                  >
                                    -
                                  </button>

                                  <span className="w-8 text-center font-black">
                                    {selectedQuantity}
                                  </span>

                                  <button
                                    onClick={() => increaseProductQuantity(product.id)}
                                    className="h-10 w-10 rounded-xl text-lg font-black text-[#16110E]"
                                    style={{ backgroundColor: primaryColor }}
                                  >
                                    +
                                  </button>
                                </div>

                                <button
                                  onClick={() => addToCart(product, selectedQuantity)}
                                  disabled={selectedQuantity <= 0}
                                  className="rounded-2xl px-5 py-3 font-black text-[#16110E] disabled:opacity-50"
                                  style={{ backgroundColor: primaryColor }}
                                >
                                  إضافة للسلة
                                </button>
                              </div>
                            </div>

                            {isNoteOpen && selectedQuantity > 0 ? (
                              <textarea
                                value={productNotes[product.id] || ""}
                                onChange={(event) =>
                                  updateProductNote(product.id, event.target.value)
                                }
                                placeholder="ملاحظة لهذا المنتج: بدون سكر، زيادة ثلج..."
                                className="mt-3 w-full rounded-2xl border border-[#4A3425] bg-[#2A211C] p-3 text-sm text-[#FFF8F0] outline-none"
                              />
                            ) : null}
                          </div>
                        </div>
                      </article>
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
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#4A3425] bg-[#16110E] p-3"
        >
          <div className="mx-auto max-w-4xl rounded-3xl border border-[#4A3425] bg-[#241B16] p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black">السلة</h3>
                <p className="mt-1 text-sm text-[#C8B6A4]">
                  {totalItems} منتج · الإجمالي {total.toFixed(2)} ريال
                </p>
              </div>

              <button
                onClick={() => setShowCartDetails((current) => !current)}
                className="rounded-2xl border border-[#4A3425] px-4 py-3 text-sm font-black"
              >
                {showCartDetails ? "إخفاء التفاصيل" : "تفاصيل السلة"}
              </button>
            </div>

            {showCartDetails ? (
              <>
                <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="rounded-2xl border border-[#4A3425] bg-[#2A211C] p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold">{item.product.name}</p>
                          <p className="text-sm text-[#C8B6A4]">
                            {item.quantity} × {item.product.price} ريال
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(item.product.id, item.note)}
                            className="rounded-xl border border-[#4A3425] px-3 py-2"
                          >
                            -
                          </button>

                          <span className="w-6 text-center">{item.quantity}</span>

                          <button
                            onClick={() => increaseCartItem(item.product.id, item.note)}
                            className="rounded-xl px-3 py-2 font-black text-[#16110E]"
                            style={{ backgroundColor: primaryColor }}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {item.note ? (
                        <p className="mt-3 rounded-xl bg-[#241B16] p-3 text-sm text-[#C8B6A4]">
                          ملاحظة: {item.note}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#4A3425] pt-4">
                  <p className="text-lg font-black">الإجمالي: {total.toFixed(2)} ريال</p>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setShowCartDetails(false)}
                      className="rounded-2xl border border-[#4A3425] bg-[#2A211C] px-5 py-4 font-black text-[#FFF8F0]"
                    >
                      إضافة منتجات أخرى
                    </button>

                    <button
                      onClick={submitOrder}
                      disabled={sending}
                      className="rounded-2xl px-6 py-4 font-black text-[#16110E] disabled:opacity-60"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {sending ? "جاري الإرسال..." : "إرسال الطلب"}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {showBillReview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-[#4A3425] bg-[#241B16] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black">قيّم تجربتك</h2>
                <p className="mt-2 text-[#C8B6A4]">
                  التقييم يظهر بعد طلب الفاتورة لأن العميل جرّب المنتجات والخدمة.
                </p>
              </div>

              <button
                onClick={() => setShowBillReview(false)}
                className="rounded-2xl border border-[#4A3425] px-4 py-2 font-black"
              >
                إغلاق
              </button>
            </div>

            <div className="mt-5 rounded-3xl border border-[#4A3425] bg-[#2A211C] p-4">
              <h3 className="text-xl font-black">تقييم الخدمة</h3>

              {serviceAverage !== null ? (
                <p className="mt-2 text-sm text-[#C8B6A4]">
                  التقييم الحالي: ⭐ {serviceAverage.toFixed(1)} ({serviceReviews.length} تقييم)
                </p>
              ) : (
                <p className="mt-2 text-sm text-[#C8B6A4]">
                  لا توجد تقييمات للخدمة حتى الآن.
                </p>
              )}

              <RatingStars
                disabled={reviewSending === "service"}
                onRate={(rating) => submitServiceReview(rating)}
              />
            </div>

            <div className="mt-4 space-y-3">
              <h3 className="text-xl font-black">المنتجات التي طلبتها</h3>

              {billReviewProducts.length === 0 ? (
                <div className="rounded-3xl border border-[#4A3425] bg-[#2A211C] p-4 text-[#C8B6A4]">
                  لا توجد منتجات مرتبطة بهذه الجلسة حتى الآن.
                </div>
              ) : (
                billReviewProducts.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-3xl border border-[#4A3425] bg-[#2A211C] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-black">{product.name}</p>
                        {product.averageRating !== null ? (
                          <p className="mt-1 text-sm text-[#C8B6A4]">
                            التقييم الحالي: ⭐ {product.averageRating.toFixed(1)} ({product.reviewsCount} تقييم)
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-[#C8B6A4]">
                            لا توجد تقييمات لهذا المنتج.
                          </p>
                        )}
                      </div>
                    </div>

                    <RatingStars
                      disabled={reviewSending === product.id}
                      onRate={(rating) => submitReview(product.id, rating)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
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
          borderColor: "rgba(198,138,61,.45)",
          background: "rgba(198,138,61,.12)",
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
                color: isActive ? "#DEA54B" : "rgba(198,138,61,.45)",
                textShadow: isActive ? "0 0 12px rgba(198,138,61,.45)" : "none",
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
