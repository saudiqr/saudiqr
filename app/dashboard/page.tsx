"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardSidebar from "@/components/DashboardSidebar";

type Subscription = {
  id: string;
  business_id: string;
  plan_id: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  plans?: {
    name: string;
    price: number | null;
  } | null;
};

type BusinessLicense = {
  id: string;
  business_id: string;
  license_type: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
};

type BusinessAccess = {
  id: string | null;
  business_id: string;
  plan_id: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  plans?: {
    name: string;
    price: number | null;
  } | null;
  isActive: boolean;
  label: string;
};

type BranchRowType = {
  id: string;
  name: string;
  city: string | null;
  subscription_status?: string | null;
};

type BusinessRowType = {
  id: string;
  name: string;
  created_at: string;
  branches?: BranchRowType[];
  ratingAverage?: number | null;
  reviewsCount?: number;
};

type DashboardMetrics = {
  todaySales: number;
  todayOrders: number;
  avgOrderValue: number;
  menuVisitors: number;
  conversionRate: number;
  liveNewOrders: number;
  livePreparingOrders: number;
  liveReadyOrders: number;
  pendingWaiters: number;
  pendingBills: number;
  newReviews: number;
  outOfStockProducts: number;
};

type RankedItem = {
  title: string;
  value: string;
};


const theme = {
  bg: "#16110E",
  bg2: "#1C1612",
  card: "#241B16",
  card2: "#2A211C",
  border: "#4A3425",
  gold: "#C68A3D",
  goldHover: "#DEA54B",
  cream: "#F5F0E8",
  text: "#FFF8F0",
  muted: "#C8B6A4",
  success: "#65C466",
  warning: "#F0A53B",
  error: "#D95C5C",
};

const heroBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  padding: "8px 12px",
  background: "rgba(198,138,61,.10)",
  border: "1px solid rgba(198,138,61,.28)",
  color: theme.goldHover,
  fontWeight: 950,
  fontSize: "13px",
};

export default function DashboardPage() {
  const [businesses, setBusinesses] = useState<BusinessRowType[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [licenses, setLicenses] = useState<BusinessLicense[]>([]);
  const [error, setError] = useState<any>(null);
  const [branchIndex, setBranchIndex] = useState<Record<string, number>>({});
  const [businessPage, setBusinessPage] = useState(0);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editingBusiness, setEditingBusiness] =
    useState<BusinessRowType | null>(null);
  const [editBusinessName, setEditBusinessName] = useState("");
  const [deleteBusiness, setDeleteBusiness] = useState<BusinessRowType | null>(
    null,
  );
  const [deleteStep, setDeleteStep] = useState<1 | 2 | 3>(1);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    todaySales: 0,
    todayOrders: 0,
    avgOrderValue: 0,
    menuVisitors: 0,
    conversionRate: 0,
    liveNewOrders: 0,
    livePreparingOrders: 0,
    liveReadyOrders: 0,
    pendingWaiters: 0,
    pendingBills: 0,
    newReviews: 0,
    outOfStockProducts: 0,
  });
  const [topProducts, setTopProducts] = useState<RankedItem[]>([]);
  const [topTables, setTopTables] = useState<RankedItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<string[]>([]);


  async function loadLiveMetrics(branchIds: string[]) {
    if (branchIds.length === 0) {
      setMetrics({
        todaySales: 0,
        todayOrders: 0,
        avgOrderValue: 0,
        menuVisitors: 0,
        conversionRate: 0,
        liveNewOrders: 0,
        livePreparingOrders: 0,
        liveReadyOrders: 0,
        pendingWaiters: 0,
        pendingBills: 0,
        newReviews: 0,
        outOfStockProducts: 0,
      });
      setTopProducts([]);
      setTopTables([]);
      setRecentActivities([]);
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    const [
      todayOrdersResponse,
      newOrdersResponse,
      preparingOrdersResponse,
      readyOrdersResponse,
      waitersResponse,
      billsResponse,
      reviewsResponse,
      outOfStockResponse,
      recentOrdersResponse,
      orderItemsResponse,
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("id,total,created_at,status,table_id, tables(table_number)")
        .in("branch_id", branchIds)
        .gte("created_at", todayIso)
        .neq("status", "cancelled"),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .in("branch_id", branchIds)
        .eq("status", "new"),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .in("branch_id", branchIds)
        .eq("status", "preparing"),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .in("branch_id", branchIds)
        .eq("status", "ready"),
      supabase
        .from("waiter_calls")
        .select("*", { count: "exact", head: true })
        .in("branch_id", branchIds)
        .eq("status", "pending"),
      supabase
        .from("bill_requests")
        .select("*", { count: "exact", head: true })
        .in("branch_id", branchIds)
        .eq("status", "pending"),
      supabase
        .from("product_reviews")
        .select("*", { count: "exact", head: true })
        .in("branch_id", branchIds)
        .eq("seen_by_owner", false),
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .in("branch_id", branchIds)
        .eq("active", true)
        .eq("stock_quantity", 0),
      supabase
        .from("orders")
        .select("id,order_number,status,created_at,total,tables(table_number)")
        .in("branch_id", branchIds)
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("order_items")
        .select("quantity, products(name), orders!inner(branch_id, created_at)")
        .in("orders.branch_id", branchIds)
        .gte("orders.created_at", todayIso),
    ]);

    const todayOrders = todayOrdersResponse.data || [];
    const todaySales = todayOrders.reduce(
      (sum: number, order: any) => sum + Number(order.total || 0),
      0,
    );

    const todayOrdersCount = todayOrders.length;
    const avgOrderValue =
      todayOrdersCount > 0 ? todaySales / todayOrdersCount : 0;

    const menuVisitors = todayOrdersCount;
    const conversionRate =
      menuVisitors > 0 ? Math.round((todayOrdersCount / menuVisitors) * 100) : 0;

    setMetrics({
      todaySales,
      todayOrders: todayOrdersCount,
      avgOrderValue,
      menuVisitors,
      conversionRate,
      liveNewOrders: newOrdersResponse.count || 0,
      livePreparingOrders: preparingOrdersResponse.count || 0,
      liveReadyOrders: readyOrdersResponse.count || 0,
      pendingWaiters: waitersResponse.count || 0,
      pendingBills: billsResponse.count || 0,
      newReviews: reviewsResponse.count || 0,
      outOfStockProducts: outOfStockResponse.count || 0,
    });

    const productMap = new Map<string, number>();
    (orderItemsResponse.data || []).forEach((item: any) => {
      const productName = item.products?.name || "منتج غير معروف";
      productMap.set(
        productName,
        (productMap.get(productName) || 0) + Number(item.quantity || 0),
      );
    });

    const productRanking = Array.from(productMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([title, count]) => ({ title, value: `${count} طلب` }));

    setTopProducts(productRanking);

    const tableMap = new Map<string, number>();
    todayOrders.forEach((order: any) => {
      const tableNumber = order.tables?.table_number || "غير محددة";
      const title = `طاولة ${tableNumber}`;
      tableMap.set(title, (tableMap.get(title) || 0) + 1);
    });

    const tableRanking = Array.from(tableMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([title, count]) => ({ title, value: `${count} طلب` }));

    setTopTables(tableRanking);

    const activities = (recentOrdersResponse.data || []).map((order: any) => {
      const tableNumber = order.tables?.table_number
        ? `طاولة ${order.tables.table_number}`
        : "طاولة غير محددة";

      if (order.status === "new") return `تم إنشاء طلب جديد - ${tableNumber}`;
      if (order.status === "preparing") return `تم اعتماد طلب للمطبخ - ${tableNumber}`;
      if (order.status === "ready") return `طلب جاهز للتسليم - ${tableNumber}`;
      if (order.status === "delivered") return `تم تسليم طلب - ${tableNumber}`;

      return `تحديث طلب - ${tableNumber}`;
    });

    setRecentActivities(activities);
  }


  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase
        .from("businesses")
        .select(
          `
          id,
          name,
          created_at,
          branches (
            id,
            name,
            city,
            subscription_status
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        setBusinesses([]);
        setError(error);
        return;
      }

      const businessList = (data || []) as BusinessRowType[];
      const businessIds = businessList.map((business) => business.id);

      let subscriptionsData: Subscription[] = [];
      let licensesData: BusinessLicense[] = [];

      if (businessIds.length > 0) {
        const { data: subsData } = await supabase
          .from("subscriptions")
          .select(
            `
            id,
            business_id,
            plan_id,
            status,
            starts_at,
            ends_at,
            plans (
              name,
              price
            )
          `,
          )
          .in("business_id", businessIds)
          .order("ends_at", { ascending: false });

        subscriptionsData = (subsData || []) as unknown as Subscription[];

        const { data: licenseData } = await supabase
          .from("business_license")
          .select("id,business_id,license_type,status,starts_at,ends_at")
          .in("business_id", businessIds);

        licensesData = (licenseData || []) as BusinessLicense[];
      }

      setSubscriptions(subscriptionsData);
      setLicenses(licensesData);

      const branchIds = businessList.flatMap((business) =>
        (business.branches || []).map((branch) => branch.id),
      );

      await loadLiveMetrics(branchIds);

      let reviews: any[] = [];

      if (branchIds.length > 0) {
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("branch_id, rating")
          .in("branch_id", branchIds);

        reviews = reviewsData || [];
      }

      const enrichedBusinesses = businessList.map((business) => {
        const branches = business.branches || [];
        const businessBranchIds = branches.map((branch) => branch.id);

        const businessReviews = reviews.filter((review) =>
          businessBranchIds.includes(review.branch_id),
        );

        const reviewsCount = businessReviews.length;

        const ratingAverage =
          reviewsCount > 0
            ? businessReviews.reduce(
                (sum: number, review: any) => sum + review.rating,
                0,
              ) / reviewsCount
            : null;

        return {
          ...business,
          ratingAverage,
          reviewsCount,
        };
      });

      setBusinesses(enrichedBusinesses);
      setError(null);
    }

    loadData();

    const channel = supabase
      .channel("dashboard-live-metrics")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => loadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bill_requests" },
        () => loadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waiter_calls" },
        () => loadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_reviews" },
        () => loadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => loadData(),
      )
      .subscribe();

    const refreshInterval = window.setInterval(() => {
      loadData();
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(refreshInterval);
    };
  }, []);

  const allBranches = businesses.flatMap((business) => business.branches || []);
  const firstBranchId = allBranches[0]?.id;
  const businessesPerPage = 3;

  const visibleBusinesses = businesses.slice(
    businessPage * businessesPerPage,
    businessPage * businessesPerPage + businessesPerPage,
  );

  const totalBusinessPages = Math.ceil(businesses.length / businessesPerPage);

  const totalBranches = businesses.reduce(
    (sum, business) => sum + (business.branches?.length || 0),
    0,
  );

  const activeBusinessCount = businesses.filter((business) => {
    const access = getBusinessSubscription(business.id);
    return Boolean(access?.isActive);
  }).length;

  const expiredBusinessCount = businesses.filter((business) => {
    const access = getBusinessSubscription(business.id);
    return access && !access.isActive;
  }).length;

  const trialBusinessCount = businesses.filter((business) => {
    const access = getBusinessSubscription(business.id);
    return access?.status === "trial";
  }).length;

  const avgRating =
    businesses.length > 0
      ? businesses
          .filter(
            (business) =>
              business.ratingAverage !== null &&
              business.ratingAverage !== undefined,
          )
          .reduce(
            (sum, business) => sum + Number(business.ratingAverage || 0),
            0,
          ) /
        Math.max(
          businesses.filter(
            (business) =>
              business.ratingAverage !== null &&
              business.ratingAverage !== undefined,
          ).length,
          1,
        )
      : 0;

  function dateIsFuture(dateValue: string | null) {
    if (!dateValue) return true;
    return new Date(dateValue).getTime() > Date.now();
  }

  function formatDate(dateValue: string | null) {
    if (!dateValue) return "غير محدد";
    return new Date(dateValue).toLocaleDateString("en-GB");
  }

  function getRemainingDays(dateValue: string | null) {
    if (!dateValue) return null;
    const diff = new Date(dateValue).getTime() - Date.now();
    return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
  }

  function getBusinessSubscription(businessId: string): BusinessAccess | null {
    const businessSubscriptions = subscriptions.filter(
      (subscription) => subscription.business_id === businessId,
    );

    const activeSubscription = businessSubscriptions.find((subscription) => {
      return (
        (subscription.status === "active" || subscription.status === "trial") &&
        dateIsFuture(subscription.ends_at)
      );
    });

    if (activeSubscription) {
      return {
        ...activeSubscription,
        id: activeSubscription.id,
        isActive: true,
        label: activeSubscription.status === "trial" ? "تجربة مجانية" : "نشط",
      };
    }

    const businessLicense = licenses.find(
      (license) => license.business_id === businessId,
    );

    if (
      businessLicense &&
      (businessLicense.status === "active" ||
        businessLicense.status === "trial") &&
      dateIsFuture(businessLicense.ends_at)
    ) {
      return {
        id: businessLicense.id,
        business_id: businessLicense.business_id,
        plan_id: null,
        status: businessLicense.license_type || businessLicense.status,
        starts_at: businessLicense.starts_at,
        ends_at: businessLicense.ends_at,
        plans: null,
        isActive: true,
        label:
          businessLicense.license_type === "trial" ? "تجربة مجانية" : "نشط",
      };
    }

    const latestSubscription = businessSubscriptions[0];

    if (latestSubscription) {
      return {
        ...latestSubscription,
        id: latestSubscription.id,
        isActive: false,
        label: "منتهي",
      };
    }

    if (businessLicense) {
      return {
        id: businessLicense.id,
        business_id: businessLicense.business_id,
        plan_id: null,
        status: businessLicense.license_type || businessLicense.status,
        starts_at: businessLicense.starts_at,
        ends_at: businessLicense.ends_at,
        plans: null,
        isActive: false,
        label: "منتهي",
      };
    }

    return null;
  }

  function nextBranch(businessId: string, total: number) {
    setBranchIndex((prev) => ({
      ...prev,
      [businessId]: ((prev[businessId] || 0) + 1) % total,
    }));
  }

  async function updateBusinessName() {
    if (!editingBusiness) return;

    const name = editBusinessName.trim();

    if (!name) {
      alert("اسم النشاط مطلوب");
      return;
    }

    const { error } = await supabase
      .from("businesses")
      .update({ name })
      .eq("id", editingBusiness.id);

    if (error) {
      alert(error.message);
      return;
    }

    setBusinesses((prev) =>
      prev.map((business) =>
        business.id === editingBusiness.id ? { ...business, name } : business,
      ),
    );

    setEditingBusiness(null);
  }

  async function confirmDeleteBusiness() {
    if (!deleteBusiness) return;

    setDeleteStep(3);
    setDeleteProgress(0);

    const timer = setInterval(() => {
      setDeleteProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }

        return prev + 10;
      });
    }, 120);

    setTimeout(async () => {
      const { error } = await supabase
        .from("businesses")
        .delete()
        .eq("id", deleteBusiness.id);

      if (error) {
        alert(error.message);
        setDeleteBusiness(null);
        setDeleteStep(1);
        setDeleteProgress(0);
        return;
      }

      setBusinesses((prev) =>
        prev.filter((business) => business.id !== deleteBusiness.id),
      );

      setDeleteProgress(100);

      setTimeout(() => {
        setDeleteBusiness(null);
        setDeleteStep(1);
        setDeleteProgress(0);
      }, 700);
    }, 1400);
  }

  return (
    <main
      dir="rtl"
      onClick={() => setOpenMenu(null)}
      style={{
        minHeight: "100vh",
        width: "100%",
        maxWidth: "100%",
        background:
          "radial-gradient(circle at top left, rgba(198,138,61,.16), transparent 35%), #16110E",
        color: theme.text,
        overflowX: "hidden",
      }}
    >
      <style>
        {`
          * { box-sizing: border-box; }
          html, body { overflow-x: hidden; }

          .sq-card {
            background: linear-gradient(180deg, rgba(42,33,28,.95), rgba(28,22,18,.96));
            border: 1px solid rgba(198,138,61,.24);
            border-radius: 28px;
            box-shadow: 0 18px 55px rgba(0,0,0,.28);
          }

          .sq-hero {
            background:
              radial-gradient(circle at top right, rgba(222,165,75,.20), transparent 34%),
              linear-gradient(135deg, rgba(36,27,22,.98), rgba(28,22,18,.98));
            border: 1px solid rgba(198,138,61,.26);
            border-radius: 30px;
            padding: 22px;
            box-shadow: 0 22px 70px rgba(0,0,0,.32);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            margin-bottom: 16px;
          }

          .sq-eyebrow {
            margin: 0 0 8px;
            color: ${theme.goldHover};
            font-weight: 950;
            font-size: 14px;
          }

          .sq-title {
            margin: 0;
            font-size: 38px;
            font-weight: 950;
            line-height: 1.1;
            color: ${theme.text};
          }

          .sq-title span {
            color: ${theme.goldHover};
          }

          .sq-hero-text {
            margin: 10px 0 0;
            color: ${theme.muted};
            font-size: 15px;
            font-weight: 800;
            line-height: 1.8;
          }

          .sq-quick-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .sq-soft-card {
            background: rgba(36,27,22,.75);
            border: 1px solid rgba(198,138,61,.18);
            border-radius: 22px;
          }

          .sq-btn {
            background: linear-gradient(135deg, ${theme.gold}, ${theme.goldHover});
            color: #1C1612;
            border: 0;
            border-radius: 16px;
            padding: 12px 18px;
            font-weight: 900;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            cursor: pointer;
            box-shadow: 0 10px 24px rgba(198,138,61,.22);
          }

          .sq-btn:hover {
            filter: brightness(1.05);
            transform: translateY(-1px);
          }

          .sq-outline {
            background: rgba(198,138,61,.08);
            border: 1px solid rgba(198,138,61,.42);
            color: ${theme.goldHover};
            border-radius: 14px;
            padding: 10px 14px;
            font-weight: 900;
            text-decoration: none;
            cursor: pointer;
          }

          .sq-outline:hover {
            background: rgba(198,138,61,.18);
            color: ${theme.cream};
          }

          .menu-item{
            width:100%;
            display:flex;
            justify-content:center;
            align-items:center;
            padding:10px;
            color:${theme.text};
            text-decoration:none;
            transition:.2s;
            border-bottom:1px solid rgba(255,255,255,.08);
            background:transparent;
            cursor:pointer;
            font-weight:900;
            box-sizing:border-box;
          }

          .menu-item:hover{
            background:rgba(198,138,61,.12);
            color:${theme.goldHover};
          }

          .sidebar-link {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:14px;
            padding:14px 18px;
            border-radius:16px;
            color:${theme.muted};
            text-decoration:none;
            font-weight:900;
            transition:.2s;
          }

          .sidebar-link:hover,
          .sidebar-link.active {
            background: linear-gradient(135deg, ${theme.gold}, ${theme.goldHover});
            color:#1C1612;
          }

          .sidebar-link .icon {
            font-size:19px;
            opacity:.95;
          }

          .stat-icon {
            width:42px;
            height:42px;
            border-radius:999px;
            background:linear-gradient(135deg, ${theme.gold}, ${theme.goldHover});
            color:#1C1612;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:20px;
            box-shadow:0 12px 28px rgba(198,138,61,.22);
          }

          @media (max-width: 1100px) {
            .layout-grid {
              grid-template-columns: 1fr !important;
            }

            .sidebar {
              display:none !important;
            }

            .cards-grid {
              grid-template-columns: 1fr !important;
            }

            .business-grid {
              grid-template-columns: 1fr !important;
            }

            .stats-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }

            .dashboard-live-grid,
            .dashboard-analytics-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>

      <div
        className="layout-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "280px minmax(0, 1fr)",
          minHeight: "100vh",
          width: "100%",
          maxWidth: "100%",
        }}
      >
        <DashboardSidebar firstBranchId={firstBranchId} />

        <section
          style={{
            width: "100%",
            minWidth: 0,
            minHeight: "100vh",
            padding: "18px",
          }}
        >
          {businesses[0] ? (
  (() => {
    const currentBusiness = businesses[0];
    const currentBranch = currentBusiness.branches?.[0];
    const subscription = getBusinessSubscription(currentBusiness.id);
    const remainingDays = getRemainingDays(subscription?.ends_at || null);
    const showRenewWarning =
      subscription?.isActive && remainingDays !== null && remainingDays <= 7;

    return (
      <>
        {showRenewWarning ? (
          <section
            className="sq-card"
            style={{
              marginBottom: "14px",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              borderColor: "rgba(240,165,59,.45)",
              background:
                "linear-gradient(135deg, rgba(240,165,59,.14), rgba(36,27,22,.95))",
            }}
          >
            <strong style={{ color: theme.warning, fontSize: "15px" }}>
              ⚠️ يتبقى على انتهاء الاشتراك {remainingDays} أيام
            </strong>

            <Link href="/subscription/custom" className="sq-btn">
              تجديد الآن
            </Link>
          </section>
        ) : null}

        <header
          className="sq-card"
          style={{
            marginBottom: "18px",
            padding: "22px",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "18px",
            alignItems: "center",
            background:
              "radial-gradient(circle at top right, rgba(198,138,61,.20), transparent 32%), linear-gradient(135deg, #241B16, #1C1612)",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 8px",
                color: theme.goldHover,
                fontWeight: 950,
                fontSize: "14px",
              }}
            >
              لوحة التحكم الرئيسية
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: "38px",
                fontWeight: 950,
                color: theme.text,
                lineHeight: 1.15,
              }}
            >
              صباح الخير 👋
            </h1>

            <p
              style={{
                margin: "10px 0 0",
                color: theme.muted,
                fontWeight: 850,
                fontSize: "15px",
                lineHeight: 1.8,
              }}
            >
              {currentBusiness.name}
              {currentBranch ? ` · ${currentBranch.name}` : ""}
            </p>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginTop: "14px",
              }}
            >
              <span style={heroBadgeStyle}>
                {new Date().toLocaleDateString("ar-SA")}
              </span>

              <span style={heroBadgeStyle}>
                {new Date().toLocaleTimeString("ar-SA", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>

              <span style={heroBadgeStyle}>
                {subscription?.plans?.name ||
                  subscription?.label ||
                  "بدون اشتراك"}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(120px, 1fr))",
              gap: "10px",
              minWidth: "280px",
            }}
          >
            {currentBranch ? (
              <>
                <Link
                  href={`/branch/${currentBranch.id}/products`}
                  className="sq-btn"
                >
                  + منتج
                </Link>

                <Link
                  href={`/branch/${currentBranch.id}/categories`}
                  className="sq-outline"
                  style={{ textAlign: "center" }}
                >
                  + قسم
                </Link>

                <Link
                  href={`/branch/${currentBranch.id}/tables`}
                  className="sq-outline"
                  style={{ textAlign: "center" }}
                >
                  + طاولة
                </Link>

                <Link
                  href={`/branch/${currentBranch.id}/staff`}
                  className="sq-outline"
                  style={{ textAlign: "center" }}
                >
                  + موظف
                </Link>
              </>
            ) : (
              <Link href="/business/new" className="sq-btn">
                + إنشاء نشاط
              </Link>
            )}
          </div>
        </header>
      </>
    );
  })()
) : (
  <header
    className="sq-card"
    style={{
      marginBottom: "18px",
      padding: "22px",
    }}
  >
    <h1 style={{ margin: 0, fontSize: "34px", fontWeight: 950 }}>
      مرحباً بك في <span style={{ color: theme.goldHover }}>SaudiQR</span>
    </h1>

    <p style={{ marginTop: "10px", color: theme.muted, fontWeight: 850 }}>
      أنشئ أول نشاط تجاري للبدء.
    </p>

    <Link href="/business/new" className="sq-btn" style={{ marginTop: "16px" }}>
      + إنشاء نشاط جديد
    </Link>
  </header>
)}

          <section
  className="stats-grid"
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: "12px",
    marginBottom: "16px",
  }}
>
  <TodayStatCard
    title="مبيعات اليوم"
    value={metrics.todaySales.toFixed(2)}
    suffix="ريال"
    icon="💰"
    note="من الطلبات المكتملة"
  />

  <TodayStatCard
    title="عدد الطلبات"
    value={metrics.todayOrders.toString()}
    suffix="طلب"
    icon="🧾"
    note="طلبات اليوم"
  />

  <TodayStatCard
    title="متوسط الطلب"
    value={metrics.avgOrderValue.toFixed(2)}
    suffix="ريال"
    icon="🍽️"
    note="متوسط قيمة الطلب"
  />

  <TodayStatCard
    title="متوسط التقييم"
    value={avgRating ? avgRating.toFixed(1) : "0.0"}
    suffix="/ 5"
    icon="⭐"
    note="التقييم العام"
  />

  <TodayStatCard
    title="عدد الزوار"
    value={metrics.menuVisitors.toString()}
    suffix="زائر"
    icon="👥"
    note="زيارات المنيو"
  />

  <TodayStatCard
    title="معدل التحويل"
    value={metrics.conversionRate.toString()}
    suffix="%"
    icon="📈"
    note="من زيارة إلى طلب"
  />
</section>

          <section
            className="dashboard-live-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <DashboardPanel
              title="الطلبات المباشرة"
              subtitle="طلبات تحتاج مراجعة قبل الإرسال للمطبخ"
              icon="🟢"
            >
              <MiniActivityItem
                title="طلبات جديدة"
                value={metrics.liveNewOrders.toString()}
                note="تظهر هنا الطلبات قبل الاعتماد"
                tone="gold"
              />

              <MiniActivityItem
                title="قيد التحضير"
                value={metrics.livePreparingOrders.toString()}
                note="بعد اعتماد الطلب من صفحة الطلبات"
                tone="cream"
              />

              <MiniActivityItem
                title="جاهزة للتسليم"
                value={metrics.liveReadyOrders.toString()}
                note="تظهر بعد تجهيزها من المطبخ"
                tone="green"
              />
            </DashboardPanel>

            <DashboardPanel
              title="إشعارات مباشرة"
              subtitle="النادل، الفواتير، التقييمات والتنبيهات المهمة"
              icon="🔔"
            >
              <MiniActivityItem
                title="طلب نادل"
                value={metrics.pendingWaiters.toString()}
                note="طلبات المساعدة من الطاولات"
                tone="gold"
              />

              <MiniActivityItem
                title="طلب فاتورة"
                value={metrics.pendingBills.toString()}
                note="طاولات تنتظر الكاشير"
                tone="cream"
              />

              <MiniActivityItem
                title="تقييم جديد"
                value={metrics.newReviews.toString()}
                note="تقييمات المنتجات والخدمة"
                tone="green"
              />

              <MiniActivityItem
                title="منتج نفد"
                value={metrics.outOfStockProducts.toString()}
                note="منتجات تحتاج تحديث المخزون"
                tone="red"
              />
            </DashboardPanel>
          </section>

          <section
            className="dashboard-analytics-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr .8fr",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <DashboardPanel
              title="المبيعات آخر 30 يوم"
              subtitle="رسم مبدئي، سيتم ربطه بالطلبات بعد اعتماد الإحصائيات"
              icon="📈"
            >
              <SalesChartPreview />
            </DashboardPanel>

            <DashboardPanel
              title="أكثر المنتجات مبيعاً"
              subtitle="الأكثر طلباً حسب عدد مرات الشراء"
              icon="☕"
            >
              {(topProducts.length > 0
                ? topProducts
                : [
                    { title: "لا توجد بيانات بعد", value: "0 طلب" },
                    { title: "ابدأ باستقبال الطلبات", value: "0 طلب" },
                    { title: "سيظهر المنتج الأعلى هنا", value: "0 طلب" },
                  ]
              ).map((item, index) => (
                <RankItem
                  key={`${item.title}-${index}`}
                  rank={(index + 1).toString()}
                  title={item.title}
                  value={item.value}
                />
              ))}
            </DashboardPanel>
          </section>

          <section
            className="dashboard-analytics-grid"
            style={{
              display: "grid",
              gridTemplateColumns: ".9fr 1.1fr",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <DashboardPanel
              title="أكثر الطاولات استخداماً"
              subtitle="الطاولات الأعلى طلباً خلال الفترة"
              icon="🍽️"
            >
              {(topTables.length > 0
                ? topTables
                : [
                    { title: "لا توجد بيانات بعد", value: "0 طلب" },
                    { title: "ابدأ باستقبال الطلبات", value: "0 طلب" },
                    { title: "ستظهر الطاولة الأعلى هنا", value: "0 طلب" },
                  ]
              ).map((item, index) => (
                <RankItem
                  key={`${item.title}-${index}`}
                  rank={(index + 1).toString()}
                  title={item.title}
                  value={item.value}
                />
              ))}
            </DashboardPanel>

            <DashboardPanel
              title="أوقات الذروة"
              subtitle="قراءة سريعة لأكثر ساعات العمل نشاطاً"
              icon="⏱️"
            >
              <PeakHoursPreview />
            </DashboardPanel>
          </section>

          <section
            className="dashboard-analytics-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <DashboardPanel
              title="تقييم المنتجات"
              subtitle="أفضل المنتجات حسب تقييم العملاء"
              icon="⭐"
            >
              <RatingItem title="لاتيه" rating="★★★★★" />
              <RatingItem title="كابتشينو" rating="★★★★☆" />
              <RatingItem title="موهيتو" rating="★★★☆☆" />
            </DashboardPanel>

            <DashboardPanel
              title="النشاط الأخير"
              subtitle="آخر العمليات المهمة داخل النظام"
              icon="🧾"
            >
              {(recentActivities.length > 0
                ? recentActivities
                : [
                    "لا يوجد نشاط حديث حتى الآن",
                    "ستظهر الطلبات والتحديثات هنا",
                    "الداش بورد يتحدث تلقائياً",
                    "جاهز لمتابعة التشغيل",
                  ]
              ).map((activity, index) => (
                <TimelineItem key={`${activity}-${index}`} text={activity} />
              ))}
            </DashboardPanel>
          </section>

          <div
            className="cards-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 340px",
              gap: "16px",
              alignItems: "start",
              direction: "rtl",
            }}
          >
            <section
              className="sq-card"
              style={{
                padding: "20px",
                height: "fit-content",
                alignSelf: "start",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                }}
              >
                <h2 style={{ fontSize: "22px", fontWeight: 950, margin: 0 }}>
                  نشاطاتي التجارية <span style={{ color: theme.gold }}>☕</span>
                </h2>

                {businesses.length > 1 && (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() =>
                        setBusinessPage((prev) =>
                          prev === 0 ? totalBusinessPages - 1 : prev - 1,
                        )
                      }
                      className="sq-outline"
                    >
                      السابق
                    </button>

                    <button
                      onClick={() =>
                        setBusinessPage((prev) =>
                          prev + 1 >= totalBusinessPages ? 0 : prev + 1,
                        )
                      }
                      className="sq-outline"
                    >
                      التالي
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div
                  style={{
                    marginBottom: "18px",
                    color: theme.error,
                    border: `1px solid ${theme.error}`,
                    borderRadius: "16px",
                    padding: "12px",
                    background: "rgba(217,92,92,.08)",
                  }}
                >
                  حدث خطأ أثناء جلب البيانات: {error.message}
                </div>
              )}

              {businesses.length === 0 ? (
                <div
                  className="sq-soft-card"
                  style={{ padding: "38px", textAlign: "center" }}
                >
                  <h3 style={{ fontSize: "22px", fontWeight: 950, margin: 0 }}>
                    لا يوجد نشاط تجاري حتى الآن
                  </h3>
                  <p style={{ marginTop: "12px", color: theme.muted }}>
                    أنشئ أول نشاط تجاري ثم أضف الفروع والمنيو.
                  </p>
                </div>
              ) : (
                <div
                  className="business-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: "14px",
                    alignItems: "start",
                  }}
                >
                  {visibleBusinesses.map((business) => {
                    const branches = business.branches || [];
                    const currentIndex = branchIndex[business.id] || 0;
                    const currentBranch = branches[currentIndex];
                    const subscription = getBusinessSubscription(business.id);

                    return (
                      <BusinessCard
                        key={business.id}
                        business={business}
                        branches={branches}
                        currentBranch={currentBranch}
                        subscription={subscription}
                        openMenu={openMenu}
                        setOpenMenu={setOpenMenu}
                        setEditingBusiness={setEditingBusiness}
                        setEditBusinessName={setEditBusinessName}
                        setDeleteBusiness={setDeleteBusiness}
                        setDeleteStep={setDeleteStep}
                        setDeleteProgress={setDeleteProgress}
                        nextBranch={nextBranch}
                        setBranchIndex={setBranchIndex}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            <aside style={{ display: "grid", gap: "14px", minWidth: 0 }}>
              <TrialSummary
                businesses={businesses}
                getBusinessSubscription={getBusinessSubscription}
                formatDate={formatDate}
                getRemainingDays={getRemainingDays}
              />

              <LaunchChecklist
                businessesCount={businesses.length}
                branchesCount={totalBranches}
                activeBusinessCount={activeBusinessCount}
              />
            </aside>
          </div>
        </section>
      </div>

      {editingBusiness && (
        <Modal onClose={() => setEditingBusiness(null)}>
          <h3 style={{ fontSize: "22px", fontWeight: 950, margin: "0 0 16px" }}>
            تعديل النشاط
          </h3>

          <input
            value={editBusinessName}
            onChange={(event) => setEditBusinessName(event.target.value)}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "16px",
              border: `1px solid ${theme.border}`,
              background: theme.bg,
              color: theme.text,
              fontWeight: 800,
              outline: "none",
            }}
          />

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button onClick={updateBusinessName} className="sq-btn">
              حفظ
            </button>

            <button
              onClick={() => setEditingBusiness(null)}
              className="sq-outline"
            >
              إلغاء
            </button>
          </div>
        </Modal>
      )}

      {deleteBusiness && (
        <Modal onClose={() => deleteStep !== 3 && setDeleteBusiness(null)}>
          {deleteStep === 1 && (
            <>
              <h3 style={{ fontSize: "22px", fontWeight: 950, margin: 0 }}>
                حذف النشاط
              </h3>

              <p style={{ marginTop: "12px", color: theme.muted }}>
                هل أنت متأكد من حذف نشاط: {deleteBusiness.name}؟
              </p>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  onClick={() => setDeleteStep(2)}
                  className="sq-outline"
                  style={{
                    color: theme.error,
                    borderColor: "rgba(217,92,92,.55)",
                  }}
                >
                  نعم احذف
                </button>

                <button
                  onClick={() => setDeleteBusiness(null)}
                  className="sq-outline"
                >
                  إلغاء
                </button>
              </div>
            </>
          )}

          {deleteStep === 2 && (
            <>
              <h3
                style={{
                  fontSize: "22px",
                  fontWeight: 950,
                  color: theme.error,
                  margin: 0,
                }}
              >
                تأكيد أخير
              </h3>

              <p style={{ marginTop: "12px", color: theme.muted }}>
                هل أنت متأكد؟ هذا الإجراء لا يمكن التراجع عنه.
              </p>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  onClick={confirmDeleteBusiness}
                  className="sq-outline"
                  style={{
                    color: theme.error,
                    borderColor: "rgba(217,92,92,.55)",
                  }}
                >
                  نعم متأكد
                </button>

                <button
                  onClick={() => setDeleteBusiness(null)}
                  className="sq-outline"
                >
                  إلغاء
                </button>
              </div>
            </>
          )}

          {deleteStep === 3 && (
            <>
              <h3 style={{ fontSize: "22px", fontWeight: 950, margin: 0 }}>
                جاري الحذف...
              </h3>

              <div
                style={{
                  marginTop: "20px",
                  width: "100%",
                  height: "14px",
                  background: theme.bg,
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${deleteProgress}%`,
                    height: "100%",
                    background: theme.error,
                    transition: ".2s",
                  }}
                />
              </div>

              <p style={{ marginTop: "12px", fontWeight: 900 }}>
                {deleteProgress >= 100 ? "تم الحذف" : `${deleteProgress}%`}
              </p>
            </>
          )}
        </Modal>
      )}
    </main>
  );
}

function TodayStatCard({
  title,
  value,
  suffix,
  icon,
  note,
}: {
  title: string;
  value: string;
  suffix: string;
  icon: string;
  note: string;
}) {
  return (
    <div
      className="sq-card"
      style={{
        padding: "14px",
        minHeight: "118px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "10px",
          alignItems: "flex-start",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: theme.muted,
              fontWeight: 950,
              fontSize: "13px",
            }}
          >
            {title}
          </p>

          <h3
            style={{
              margin: "8px 0 0",
              color: theme.text,
              fontSize: "26px",
              fontWeight: 950,
              lineHeight: 1,
            }}
          >
            {value}
            <span
              style={{
                marginRight: "5px",
                color: theme.goldHover,
                fontSize: "13px",
                fontWeight: 950,
              }}
            >
              {suffix}
            </span>
          </h3>
        </div>

        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "16px",
            background: "rgba(198,138,61,.12)",
            border: "1px solid rgba(198,138,61,.24)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
          }}
        >
          {icon}
        </div>
      </div>

      <p
        style={{
          margin: "12px 0 0",
          color: theme.muted,
          fontSize: "12px",
          fontWeight: 800,
        }}
      >
        {note}
      </p>
    </div>
  );
}

function DashboardPanel({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="sq-card"
      style={{
        padding: "16px",
        minHeight: "220px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "14px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: theme.text,
              fontSize: "21px",
              fontWeight: 950,
            }}
          >
            {title}
          </h2>

          <p
            style={{
              margin: "7px 0 0",
              color: theme.muted,
              fontSize: "13px",
              fontWeight: 800,
              lineHeight: 1.7,
            }}
          >
            {subtitle}
          </p>
        </div>

        <div className="stat-icon">{icon}</div>
      </div>

      <div style={{ display: "grid", gap: "10px" }}>{children}</div>
    </section>
  );
}

function MiniActivityItem({
  title,
  value,
  note,
  tone,
}: {
  title: string;
  value: string;
  note: string;
  tone: "gold" | "cream" | "green" | "red";
}) {
  const toneColor =
    tone === "green"
      ? theme.success
      : tone === "red"
        ? theme.error
        : tone === "cream"
          ? theme.cream
          : theme.goldHover;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "12px",
        borderRadius: "18px",
        border: `1px solid ${theme.border}`,
        background: theme.card2,
      }}
    >
      <div>
        <strong style={{ color: theme.text, fontSize: "15px" }}>{title}</strong>
        <p
          style={{
            margin: "5px 0 0",
            color: theme.muted,
            fontSize: "12px",
            fontWeight: 800,
          }}
        >
          {note}
        </p>
      </div>

      <strong
        style={{
          minWidth: "42px",
          height: "36px",
          borderRadius: "14px",
          background: "rgba(198,138,61,.10)",
          border: "1px solid rgba(198,138,61,.22)",
          color: toneColor,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          fontWeight: 950,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function RankItem({
  rank,
  title,
  value,
}: {
  rank: string;
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        padding: "12px",
        borderRadius: "18px",
        border: `1px solid ${theme.border}`,
        background: theme.card2,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "12px",
            background: "rgba(198,138,61,.12)",
            border: "1px solid rgba(198,138,61,.25)",
            color: theme.goldHover,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 950,
          }}
        >
          {rank}
        </span>

        <strong style={{ color: theme.text }}>{title}</strong>
      </div>

      <span style={{ color: theme.muted, fontWeight: 900 }}>{value}</span>
    </div>
  );
}

function RatingItem({ title, rating }: { title: string; rating: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        padding: "12px",
        borderRadius: "18px",
        border: `1px solid ${theme.border}`,
        background: theme.card2,
      }}
    >
      <strong style={{ color: theme.text }}>{title}</strong>
      <span style={{ color: theme.goldHover, fontWeight: 950 }}>{rating}</span>
    </div>
  );
}

function TimelineItem({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px",
        borderRadius: "18px",
        border: `1px solid ${theme.border}`,
        background: theme.card2,
        color: theme.muted,
        fontWeight: 900,
      }}
    >
      <span
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "999px",
          background: theme.goldHover,
          boxShadow: "0 0 14px rgba(222,165,75,.45)",
        }}
      />
      {text}
    </div>
  );
}

function SalesChartPreview() {
  const values = [24, 42, 35, 58, 44, 66, 52, 78, 64, 88, 72, 96];

  return (
    <div
      style={{
        height: "180px",
        borderRadius: "22px",
        border: `1px solid ${theme.border}`,
        background:
          "linear-gradient(180deg, rgba(198,138,61,.10), rgba(22,17,14,.45))",
        padding: "16px",
        display: "flex",
        alignItems: "end",
        gap: "9px",
      }}
    >
      {values.map((value, index) => (
        <div
          key={`${value}-${index}`}
          style={{
            flex: 1,
            height: `${value}%`,
            minHeight: "24px",
            borderRadius: "999px 999px 8px 8px",
            background:
              "linear-gradient(180deg, rgba(222,165,75,.95), rgba(198,138,61,.35))",
            boxShadow: "0 10px 22px rgba(198,138,61,.18)",
          }}
        />
      ))}
    </div>
  );
}

function PeakHoursPreview() {
  const hours = [
    "9ص",
    "10ص",
    "11ص",
    "12م",
    "1م",
    "2م",
    "3م",
    "4م",
    "5م",
    "6م",
    "7م",
    "8م",
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px" }}>
      {hours.map((hour, index) => {
        const intensity = [0.12, 0.18, 0.22, 0.42, 0.68, 0.55, 0.25, 0.20, 0.36, 0.72, 0.86, 0.60][index];

        return (
          <div
            key={hour}
            style={{
              borderRadius: "16px",
              padding: "12px 8px",
              textAlign: "center",
              color: theme.text,
              fontWeight: 950,
              background: `rgba(198,138,61,${intensity})`,
              border: "1px solid rgba(198,138,61,.22)",
            }}
          >
            {hour}
          </div>
        );
      })}
    </div>
  );
}

function LaunchChecklist({
  businessesCount,
  branchesCount,
  activeBusinessCount,
}: {
  businessesCount: number;
  branchesCount: number;
  activeBusinessCount: number;
}) {
  const items = [
    {
      label: "نشاط تجاري",
      ready: businessesCount > 0,
      text: businessesCount > 0 ? "موجود" : "غير موجود",
    },
    {
      label: "فروع",
      ready: branchesCount > 0,
      text: branchesCount > 0 ? `${branchesCount} فرع` : "لا توجد فروع",
    },
    {
      label: "اشتراك فعال",
      ready: activeBusinessCount > 0,
      text: activeBusinessCount > 0 ? "جاهز" : "يحتاج تفعيل",
    },
  ];

  return (
    <section
      className="sq-card"
      style={{
        padding: "16px",
        height: "fit-content",
        alignSelf: "start",
        minWidth: 0,
      }}
    >
      <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 950 }}>
        جاهزية الإطلاق
      </h2>

      <p
        style={{
          margin: "8px 0 0",
          color: theme.muted,
          fontSize: "13px",
          fontWeight: 800,
          lineHeight: 1.7,
        }}
      >
        مؤشرات سريعة قبل تجربة النظام مع أول عميل.
      </p>

      <div style={{ display: "grid", gap: "9px", marginTop: "14px" }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              padding: "11px",
              borderRadius: "18px",
              border: `1px solid ${theme.border}`,
              background: theme.card2,
            }}
          >
            <span style={{ color: theme.text, fontWeight: 950 }}>
              {item.label}
            </span>

            <strong
              style={{
                color: item.ready ? theme.success : theme.warning,
                fontSize: "13px",
              }}
            >
              {item.ready ? "✓" : "!"} {item.text}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrialSummary({
  businesses,
  getBusinessSubscription,
  formatDate,
  getRemainingDays,
}: {
  businesses: BusinessRowType[];
  getBusinessSubscription: (businessId: string) => BusinessAccess | null;
  formatDate: (dateValue: string | null) => string;
  getRemainingDays: (dateValue: string | null) => number | null;
}) {
  const firstBusiness = businesses[0];
  const subscription = firstBusiness
    ? getBusinessSubscription(firstBusiness.id)
    : null;
  const remainingDays = getRemainingDays(subscription?.ends_at || null);

  return (
    <aside
      className="sq-card"
      style={{
        padding: "16px",
        height: "fit-content",
        alignSelf: "start",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 950 }}>
          حالتك الحالية
        </h2>
        <span style={{ color: theme.gold, fontSize: "28px" }}>♛</span>
      </div>

      <div
        style={{
          marginTop: "12px",
          padding: "12px 12px",
          borderRadius: "24px",
          background: "rgba(198,138,61,.07)",
          border: `1px solid rgba(198,138,61,.25)`,
          textAlign: "center",
        }}
      >
        <h3
          style={{
            margin: 0,
            color: theme.goldHover,
            fontSize: "22px",
            fontWeight: 950,
          }}
        >
          {subscription?.label || "غير مفعل"}
        </h3>
        <p
          style={{
            color: theme.muted,
            marginTop: "4px",
            fontWeight: 800,
            fontSize: "12px",
          }}
        >
          جميع المميزات متاحة
        </p>

        <div
          style={{
            height: "4px",
            background: "rgba(198,138,61,.18)",
            borderRadius: "999px",
            margin: "10px 0",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "70%",
              borderRadius: "999px",
              background: theme.gold,
            }}
          />
        </div>

        <p style={{ margin: 0, color: theme.muted }}>ينتهي في</p>
        <h4 style={{ margin: "4px 0", fontSize: "22px", fontWeight: 950 }}>
          {remainingDays === null ? "-" : remainingDays} أيام
        </h4>
        <p style={{ margin: 0, color: theme.muted }}>
          {formatDate(subscription?.ends_at || null)}
        </p>
      </div>

      <Link
        href="/subscription/custom"
        className="sq-btn"
        style={{ width: "100%", marginTop: "10px", padding: "9px 12px" }}
      >
        إدارة الاشتراك
      </Link>
    </aside>
  );
}

function BusinessCard({
  business,
  branches,
  currentBranch,
  subscription,
  openMenu,
  setOpenMenu,
  setEditingBusiness,
  setEditBusinessName,
  setDeleteBusiness,
  setDeleteStep,
  setDeleteProgress,
  nextBranch,
  setBranchIndex,
}: {
  business: BusinessRowType;
  branches: BranchRowType[];
  currentBranch?: BranchRowType;
  subscription: BusinessAccess | null;
  openMenu: string | null;
  setOpenMenu: (value: string | null) => void;
  setEditingBusiness: (value: BusinessRowType | null) => void;
  setEditBusinessName: (value: string) => void;
  setDeleteBusiness: (value: BusinessRowType | null) => void;
  setDeleteStep: (value: 1 | 2 | 3) => void;
  setDeleteProgress: (value: number) => void;
  nextBranch: (businessId: string, total: number) => void;
  setBranchIndex: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}) {
  return (
    <div
      className="sq-soft-card"
      style={{ padding: "14px", height: "fit-content", alignSelf: "start" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "18px",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 950 }}>
            {business.name}
          </h3>
          <p
            style={{
              margin: "6px 0 0",
              color: theme.muted,
              fontWeight: 800,
              fontSize: "13px",
            }}
          >
            عدد الفروع: {branches.length}
          </p>

          <SubscriptionBadge subscription={subscription} />

          <p
            style={{
              marginTop: "4px",
              color: theme.muted,
              fontSize: "13px",
            
            }}
          >
            التقييم العام:{" "}
            {business.ratingAverage !== null &&
            business.ratingAverage !== undefined
              ? `⭐ ${Number(business.ratingAverage).toFixed(1)} (${business.reviewsCount} تقييم)`
              : "لا توجد تقييمات"}
          </p>
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={(event) => {
              event.stopPropagation();
              setOpenMenu(openMenu === business.id ? null : business.id);
            }}
            className="sq-outline"
            style={{
              width: "38px",
              height: "38px",
              padding: 0,
              fontSize: "22px",
            }}
          >
            ⋮
          </button>

          {openMenu === business.id && (
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                position: "absolute",
                top: "48px",
                left: 0,
                width: "165px",
                background: theme.bg2,
                border: `1px solid ${theme.border}`,
                borderRadius: "16px",
                overflow: "hidden",
                zIndex: 999,
              }}
            >
              <Link
                href={`/branch/new?business_id=${business.id}`}
                className="menu-item"
              >
                إضافة فرع
              </Link>

              <Link
                href={`/dashboard/branches?business_id=${business.id}`}
                className="menu-item"
              >
                إدارة النشاط
              </Link>

              <Link
                href={`/subscription/custom?business_id=${business.id}`}
                className="menu-item"
              >
                الاشتراك
              </Link>

              <button
                className="menu-item"
                onClick={() => {
                  setEditingBusiness(business);
                  setEditBusinessName(business.name);
                  setOpenMenu(null);
                }}
              >
                تعديل الاسم
              </button>

              <button
                className="menu-item"
                style={{ color: theme.error }}
                onClick={() => {
                  setDeleteBusiness(business);
                  setDeleteStep(1);
                  setDeleteProgress(0);
                  setOpenMenu(null);
                }}
              >
                حذف النشاط
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: "18px" }}>
        {branches.length > 0 && currentBranch ? (
          <>
            <BranchRow branch={currentBranch} subscription={subscription} />

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "12px",
                flexWrap: "wrap",
              }}
            >
              {branches.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setBranchIndex((prev) => ({
                        ...prev,
                        [business.id]:
                          ((prev[business.id] || 0) - 1 + branches.length) %
                          branches.length,
                      }))
                    }
                    className="sq-outline"
                  >
                    الفرع السابق
                  </button>

                  <button
                    onClick={() => nextBranch(business.id, branches.length)}
                    className="sq-outline"
                  >
                    الفرع التالي
                  </button>

                  <Link
                    href={`/dashboard/branches?business_id=${business.id}`}
                    className="sq-outline"
                  >
                    عرض كل الفروع
                  </Link>
                </>
              )}
            </div>
          </>
        ) : (
          <p style={{ color: theme.muted, fontWeight: 800 }}>
            لا توجد فروع لهذا النشاط بعد.
          </p>
        )}
      </div>
    </div>
  );
}

function SubscriptionBadge({
  subscription,
}: {
  subscription: BusinessAccess | null;
}) {
  if (!subscription) {
    return (
      <p style={{ marginTop: "8px", color: theme.error, fontWeight: 900 }}>
        الاشتراك: غير مفعل
      </p>
    );
  }

  const endsAt = subscription.ends_at
    ? new Date(subscription.ends_at).toLocaleDateString("en-GB")
    : "غير محدد";

  const planName =
    subscription.status === "trial"
      ? "تجربة 7 أيام"
      : subscription.plans?.name || "غير محددة";

  return (
    <p
      style={{
        marginTop: "8px",
        color: subscription.isActive ? theme.success : theme.error,
        fontWeight: 900,
      }}
    >
      الاشتراك: {subscription.label} • الباقة: {planName} • ينتهي: {endsAt}
    </p>
  );
}

function BranchRow({
  branch,
  subscription,
}: {
  branch: BranchRowType;
  subscription: BusinessAccess | null;
}) {
  const isActive = Boolean(subscription?.isActive);

  const statusLabel = isActive
    ? subscription?.status === "trial"
      ? "تجربة مجانية"
      : "الاشتراك نشط"
    : "الاشتراك غير نشط";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        border: `1px solid rgba(198,138,61,.18)`,
        background: "rgba(22,17,14,.62)",
        borderRadius: "18px",
        padding: "12px",
      }}
    >
      <div>
        <p style={{ fontWeight: 950, color: theme.text, margin: 0 }}>
          {branch.name}
        </p>
        <p style={{ marginTop: "4px", color: theme.muted, fontSize: "13px" }}>
          {branch.city || "بدون مدينة"} • {statusLabel}
        </p>
      </div>

      <Link
        href={`/branch/${branch.id}`}
        className={isActive ? "sq-btn" : "sq-outline"}
        style={{
          color: isActive ? "#1C1612" : theme.error,
          boxShadow: isActive ? undefined : "none",
        }}
      >
        {isActive ? "إدارة" : "الاشتراك منتهي"}
      </Link>
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.68)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="sq-card"
        style={{
          width: "430px",
          maxWidth: "100%",
          padding: "24px",
          color: theme.text,
        }}
      >
        {children}
      </div>
    </div>
  );
}
