"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardSidebar from "@/components/DashboardSidebar";
import { supabase } from "@/lib/supabase";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  monthly_price: number | null;
  yearly_price: number | null;
  duration_days: number | null;
  max_branches: number | null;
  max_products: number | null;
  branches_limit: number | null;
  allow_orders: boolean | null;
  allow_kitchen: boolean | null;
  allow_cashier: boolean | null;
  allow_stats: boolean | null;
  active: boolean | null;
  is_active: boolean | null;
  sort_order: number | null;
};

type Business = {
  id: string;
  name: string;
};

type Subscription = {
  id: string;
  business_id: string;
  plan_id: string | null;
  status: "trial" | "active" | "expired" | "cancelled" | "past_due";
  starts_at: string | null;
  ends_at: string | null;
  amount: number | null;
  currency: string | null;
  plans:
    | {
        name: string;
        price: number | null;
        duration_days: number | null;
      }[]
    | null;
  businesses:
    | {
        name: string;
      }[]
    | null;
};

type CouponCheck = {
  code: string;
  discount_type: "percent" | "fixed" | "free_days";
  discount_value: number;
  free_days: number | null;
};

const statusLabel: Record<string, string> = {
  trial: "تجريبي",
  active: "نشط",
  expired: "منتهي",
  cancelled: "ملغي",
  past_due: "متعثر",
};

function formatDate(value: string | null) {
  if (!value) return "غير محدد";

  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}/${month}/${day}`;
}

function daysLeft(value: string | null) {
  if (!value) return "غير محدد";

  const now = new Date();
  const end = new Date(value);
  const diff = end.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return "منتهي";
  if (days === 0) return "ينتهي اليوم";

  return `${days} يوم`;
}

function getStatusStyle(status: string): React.CSSProperties {
  if (status === "active") {
    return {
      background: "rgba(16,185,129,0.16)",
      color: "#6ee7b7",
      border: "1px solid rgba(16,185,129,0.34)",
    };
  }

  if (status === "trial") {
    return {
      background: "rgba(245,158,11,0.16)",
      color: "#fde68a",
      border: "1px solid rgba(245,158,11,0.34)",
    };
  }

  return {
    background: "rgba(239,68,68,0.14)",
    color: "#fca5a5",
    border: "1px solid rgba(239,68,68,0.34)",
  };
}

function getPlanPrice(plan: Plan | null) {
  if (!plan) return 0;

  return Number(plan.price ?? plan.monthly_price ?? 0);
}

function getPlanBranchesLimit(plan: Plan) {
  return plan.max_branches ?? plan.branches_limit ?? 0;
}

export default function DashboardSubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [firstBranchId, setFirstBranchId] = useState("");
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<CouponCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [message, setMessage] = useState("");

  const selectedPlan = useMemo(() => {
    return plans.find((plan) => plan.id === selectedPlanId) || null;
  }, [plans, selectedPlanId]);

  const selectedBusinessSubscription = useMemo(() => {
    if (!selectedBusinessId) return null;

    return (
      subscriptions.find(
        (subscription) =>
          subscription.business_id === selectedBusinessId &&
          subscription.status === "active" &&
          subscription.ends_at &&
          new Date(subscription.ends_at) > new Date()
      ) || null
    );
  }, [subscriptions, selectedBusinessId]);

  const originalPrice = getPlanPrice(selectedPlan);

  const finalPrice = useMemo(() => {
    if (!selectedPlan) return 0;
    if (!coupon) return originalPrice;

    if (coupon.discount_type === "percent") {
      return Math.max(0, originalPrice - originalPrice * (coupon.discount_value / 100));
    }

    if (coupon.discount_type === "fixed") {
      return Math.max(0, originalPrice - coupon.discount_value);
    }

    return originalPrice;
  }, [coupon, originalPrice, selectedPlan]);

  const extraDays =
    coupon?.discount_type === "free_days"
      ? Number(coupon.free_days || coupon.discount_value || 0)
      : 0;

  async function loadData() {
    setLoading(true);
    setMessage("");

    const [plansResult, businessesResult, subscriptionsResult, branchesResult] = await Promise.all([
      supabase
        .from("plans")
        .select(`
          id,
          name,
          description,
          price,
          monthly_price,
          yearly_price,
          duration_days,
          max_branches,
          max_products,
          branches_limit,
          allow_orders,
          allow_kitchen,
          allow_cashier,
          allow_stats,
          active,
          is_active,
          sort_order
        `)
        .or("active.eq.true,is_active.eq.true")
        .order("sort_order", { ascending: true }),

      supabase
        .from("businesses")
        .select("id,name")
        .order("created_at", { ascending: false }),

      supabase
        .from("subscriptions")
        .select(`
          id,
          business_id,
          plan_id,
          status,
          starts_at,
          ends_at,
          amount,
          currency,
          plans (
            name,
            price,
            duration_days
          ),
          businesses (
            name
          )
        `)
        .order("created_at", { ascending: false }),

      supabase
        .from("branches")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1),
    ]);

    if (
      plansResult.error ||
      businessesResult.error ||
      subscriptionsResult.error ||
      branchesResult.error
    ) {
      setMessage(
        plansResult.error?.message ||
          businessesResult.error?.message ||
          subscriptionsResult.error?.message ||
          branchesResult.error?.message ||
          "حدث خطأ أثناء تحميل بيانات الاشتراك."
      );
      setLoading(false);
      return;
    }

    const plansRows = (plansResult.data || []) as Plan[];
    const businessesRows = (businessesResult.data || []) as Business[];

    setPlans(plansRows);
    setBusinesses(businessesRows);
    setSubscriptions((subscriptionsResult.data || []) as unknown as Subscription[]);
    setFirstBranchId((branchesResult.data || [])[0]?.id || "");

    if (businessesRows.length > 0 && !selectedBusinessId) {
      setSelectedBusinessId(businessesRows[0].id);
    }

    if (plansRows.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plansRows[0].id);
    }

    setLoading(false);
  }

  async function checkCoupon() {
    setMessage("");
    setCoupon(null);

    const code = couponCode.trim().toUpperCase();

    if (!code) {
      setMessage("اكتب كود الخصم أولاً.");
      return;
    }

    setCheckingCoupon(true);

    const { data, error } = await supabase
      .from("coupons")
      .select("code,discount_type,discount_value,free_days,active,starts_at,ends_at,usage_limit,used_count")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();

    setCheckingCoupon(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (!data) {
      setMessage("كود الخصم غير صحيح أو غير مفعل.");
      return;
    }

    const now = new Date();

    if (data.starts_at && new Date(data.starts_at) > now) {
      setMessage("كود الخصم لم يبدأ بعد.");
      return;
    }

    if (data.ends_at && new Date(data.ends_at) < now) {
      setMessage("كود الخصم منتهي.");
      return;
    }

    if (data.usage_limit && Number(data.used_count || 0) >= Number(data.usage_limit)) {
      setMessage("تم استخدام كود الخصم للحد الأقصى.");
      return;
    }

    setCoupon({
      code: data.code,
      discount_type: data.discount_type,
      discount_value: Number(data.discount_value || 0),
      free_days: data.free_days,
    });

    setMessage("تم تطبيق كود الخصم.");
  }

  async function createManualSubscription() {
    setMessage("");

    if (!selectedBusinessId || !selectedPlan) {
      setMessage("اختر النشاط والباقة أولاً.");
      return;
    }

    const now = new Date();
    const baseDate =
      selectedBusinessSubscription?.ends_at &&
      new Date(selectedBusinessSubscription.ends_at) > now
        ? new Date(selectedBusinessSubscription.ends_at)
        : now;

    const endsAt = new Date(baseDate);
    endsAt.setDate(
      endsAt.getDate() + Number(selectedPlan.duration_days || 30) + extraDays
    );

    if (selectedBusinessSubscription) {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan_id: selectedPlan.id,
          status: "active",
          ends_at: endsAt.toISOString(),
          amount: finalPrice,
          currency: "SAR",
          payment_provider: "manual",
          payment_reference: coupon ? `coupon:${coupon.code}` : "manual-renewal",
        })
        .eq("id", selectedBusinessSubscription.id);

      if (error) {
        setMessage(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("subscriptions").insert({
        business_id: selectedBusinessId,
        plan_id: selectedPlan.id,
        status: "active",
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        amount: finalPrice,
        currency: "SAR",
        payment_provider: "manual",
        payment_reference: coupon ? `coupon:${coupon.code}` : "manual-subscription",
      });

      if (error) {
        setMessage(error.message);
        return;
      }
    }

    if (coupon) {
      const { data: couponRow } = await supabase
        .from("coupons")
        .select("used_count")
        .eq("code", coupon.code)
        .maybeSingle();

      await supabase
        .from("coupons")
        .update({
          used_count: Number(couponRow?.used_count || 0) + 1,
        })
        .eq("code", coupon.code);
    }

    setMessage("تم تجهيز الاشتراك بنجاح. لاحقاً سيتم ربط نفس الزر ببوابة الدفع.");
    setCoupon(null);
    setCouponCode("");
    await loadData();
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <main dir="rtl" style={shellStyle}>
        <aside style={sidebarShellStyle}>
          <DashboardSidebar />
        </aside>

        <section style={contentShellStyle}>
          <div style={pageStyle}>
            <section style={heroStyle}>
              <p style={eyebrowStyle}>SaudiQR Subscription</p>
              <h1 style={heroTitleStyle}>الاشتراك</h1>
              <p style={heroTextStyle}>جاري تحميل بيانات الاشتراك...</p>
            </section>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main dir="rtl" style={shellStyle}>
      <aside style={sidebarShellStyle}>
        <DashboardSidebar firstBranchId={firstBranchId || undefined} />
      </aside>

      <section style={contentShellStyle}>
        <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>SaudiQR Subscription</p>
          <h1 style={heroTitleStyle}>الاشتراك والباقات</h1>
          <p style={heroTextStyle}>
            اختر النشاط، حدد الباقة، طبق كوبون الخصم، وجهّز الاشتراك للتفعيل.
          </p>
        </div>

        <Link href="/dashboard" style={secondaryLinkStyle}>
          رجوع للوحة التحكم
        </Link>
      </section>

      <section style={statsGridStyle}>
        <StatCard title="عدد النشاطات" value={businesses.length} />
        <StatCard title="الباقات المتاحة" value={plans.length} />
        <StatCard
          title="اشتراكات نشطة"
          value={subscriptions.filter((item) => item.status === "active").length}
        />
        <StatCard
          title="السعر بعد الخصم"
          value={`${finalPrice.toFixed(2)} ريال`}
        />
      </section>

      {message ? (
        <div
          style={{
            ...messageStyle,
            border: message.includes("تم")
              ? "1px solid rgba(16,185,129,0.38)"
              : "1px solid rgba(239,68,68,0.35)",
            background: message.includes("تم")
              ? "rgba(16,185,129,0.14)"
              : "rgba(239,68,68,0.14)",
            color: message.includes("تم") ? "#6ee7b7" : "#fca5a5",
          }}
        >
          {message}
        </div>
      ) : null}

      <section style={cardStyle}>
        <div>
          <h2 style={sectionTitleStyle}>اختيار النشاط والباقة</h2>
          <p style={sectionSubtitleStyle}>
            الدفع مؤجل حالياً، لكن هذا التجهيز جاهز للربط مع بوابة الدفع لاحقاً.
          </p>
        </div>

        <div style={formGridStyle}>
          <select
            value={selectedBusinessId}
            onChange={(event) => setSelectedBusinessId(event.target.value)}
            style={inputStyle}
          >
            <option value="">اختر النشاط</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>

          <select
            value={selectedPlanId}
            onChange={(event) => setSelectedPlanId(event.target.value)}
            style={inputStyle}
          >
            <option value="">اختر الباقة</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} - {getPlanPrice(plan)} ريال
              </option>
            ))}
          </select>

          <input
            value={couponCode}
            onChange={(event) => setCouponCode(event.target.value)}
            placeholder="كود الخصم"
            style={inputStyle}
          />

          <button
            onClick={checkCoupon}
            disabled={checkingCoupon}
            style={secondaryButtonStyle}
          >
            {checkingCoupon ? "جاري الفحص..." : "تطبيق الكوبون"}
          </button>

          <button onClick={createManualSubscription} style={greenButtonStyle}>
            تجهيز الاشتراك
          </button>
        </div>

        {selectedPlan ? (
          <div style={summaryBoxStyle}>
            <DetailItem title="الباقة" value={selectedPlan.name} />
            <DetailItem title="المدة" value={`${selectedPlan.duration_days || 30} يوم`} />
            <DetailItem title="السعر الأساسي" value={`${originalPrice.toFixed(2)} ريال`} />
            <DetailItem title="خصم الكوبون" value={coupon ? coupon.code : "لا يوجد"} />
            <DetailItem title="أيام مجانية" value={extraDays > 0 ? `${extraDays} يوم` : "0"} />
            <DetailItem title="الإجمالي" value={`${finalPrice.toFixed(2)} ريال`} />
          </div>
        ) : null}
      </section>

      <section style={plansGridStyle}>
        {plans.map((plan) => {
          const isSelected = selectedPlanId === plan.id;
          const branchesLimit = getPlanBranchesLimit(plan);
          const productLimit = Number(plan.max_products || 0);

          return (
            <article
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              style={{
                ...planCardStyle,
                border: isSelected
                  ? "1px solid rgba(16,185,129,0.8)"
                  : "1px solid rgba(16,185,129,0.32)",
                boxShadow: isSelected
                  ? "0 0 0 2px rgba(16,185,129,0.18), 0 22px 45px rgba(0,0,0,0.28)"
                  : "0 22px 45px rgba(0,0,0,0.28)",
              }}
            >
              <div style={planHeaderStyle}>
                <h3 style={planTitleStyle}>{plan.name}</h3>

                <span style={planDurationStyle}>{plan.duration_days || 30} يوم</span>
              </div>

              <strong style={planPriceStyle}>{getPlanPrice(plan).toFixed(2)} ريال</strong>

              <p style={planDescriptionStyle}>
                {plan.description || "باقة مناسبة لإدارة المنيو والطلبات."}
              </p>

              <div style={featuresListStyle}>
                <span style={featureItemStyle}>✓ عدد الفروع: {branchesLimit || "غير محدود"}</span>
                <span style={featureItemStyle}>✓ عدد المنتجات: {productLimit || "غير محدود"}</span>
                <span style={featureItemStyle}>
                  {plan.allow_orders ? "✓ الطلبات متاحة" : "× الطلبات غير متاحة"}
                </span>
                <span style={featureItemStyle}>
                  {plan.allow_kitchen ? "✓ شاشة المطبخ" : "× شاشة المطبخ غير متاحة"}
                </span>
                <span style={featureItemStyle}>
                  {plan.allow_cashier ? "✓ شاشة الكاشير" : "× شاشة الكاشير غير متاحة"}
                </span>
                <span style={featureItemStyle}>
                  {plan.allow_stats ? "✓ الإحصائيات" : "× الإحصائيات غير متاحة"}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section style={cardStyle}>
        <div>
          <h2 style={sectionTitleStyle}>اشتراكات النشاطات</h2>
          <p style={sectionSubtitleStyle}>
            عرض حالة كل اشتراك حالي وتاريخ الانتهاء.
          </p>
        </div>

        {subscriptions.length === 0 ? (
          <div style={emptyStyle}>لا توجد اشتراكات حتى الآن.</div>
        ) : (
          <div style={subscriptionsGridStyle}>
            {subscriptions.map((subscription) => (
              <article key={subscription.id} style={subscriptionCardStyle}>
                <div style={subscriptionHeaderStyle}>
                  <div>
                    <h3 style={subscriptionTitleStyle}>
                      {subscription.businesses?.[0]?.name || "نشاط غير معروف"}
                    </h3>

                    <p style={mutedTextStyle}>
                      {subscription.plans?.[0]?.name || "باقة غير معروفة"}
                    </p>
                  </div>

                  <span
                    style={{
                      ...statusBadgeStyle,
                      ...getStatusStyle(subscription.status),
                    }}
                  >
                    {statusLabel[subscription.status] || subscription.status}
                  </span>
                </div>

                <div style={subscriptionDetailsStyle}>
                  <DetailItem title="البداية" value={formatDate(subscription.starts_at)} />
                  <DetailItem title="النهاية" value={formatDate(subscription.ends_at)} />
                  <DetailItem title="المتبقي" value={daysLeft(subscription.ends_at)} />
                  <DetailItem
                    title="المبلغ"
                    value={`${subscription.amount || 0} ${subscription.currency || "SAR"}`}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <div style={statCardStyle}>
      <p style={{ margin: 0, color: "#a7f3d0", fontWeight: 950 }}>
        {title}
      </p>

      <strong style={statValueStyle}>{value}</strong>
    </div>
  );
}

function DetailItem({ title, value }: { title: string; value: string }) {
  return (
    <div style={detailItemStyle}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

const shellStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "calc(20% + 16px) calc(80% - 16px)",
  width: "100vw",
  height: "100vh",
  minHeight: "100vh",
  overflow: "hidden",
  background: "#06140f",
};

const sidebarShellStyle: React.CSSProperties = {
  height: "100vh",
  overflowY: "auto",
  overflowX: "hidden",
  background: "#06140f",
};

const contentShellStyle: React.CSSProperties = {
  height: "100vh",
  overflowY: "auto",
  overflowX: "hidden",
  padding: "32px",
  background: "#06140f",
};

const pageStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "100vh",
  color: "#e5e7eb",
  display: "grid",
  gap: "24px",
};

const heroStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(6,78,59,0.98), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.42)",
  borderRadius: "28px",
  padding: "28px",
  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: "#6ee7b7",
  fontWeight: 900,
  fontSize: "15px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "38px",
  fontWeight: 950,
  color: "#ffffff",
};

const heroTextStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#d1fae5",
  fontWeight: 800,
  fontSize: "16px",
  lineHeight: 1.8,
};

const secondaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  border: "1px solid rgba(16,185,129,0.32)",
  borderRadius: "18px",
  padding: "14px 20px",
  background: "rgba(255,255,255,0.06)",
  color: "#d1fae5",
  fontWeight: 950,
  cursor: "pointer",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "18px",
};

const statCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(6,78,59,0.98), rgba(9,40,30,0.98))",
  border: "1px solid rgba(16,185,129,0.38)",
  borderRadius: "24px",
  padding: "22px",
  boxShadow: "0 18px 38px rgba(0,0,0,0.25)",
};

const statValueStyle: React.CSSProperties = {
  display: "block",
  marginTop: "12px",
  color: "#ffffff",
  fontWeight: 950,
  fontSize: "34px",
};

const messageStyle: React.CSSProperties = {
  borderRadius: "18px",
  padding: "14px",
  fontWeight: 900,
};

const cardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(8,47,35,0.98), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.38)",
  borderRadius: "28px",
  padding: "24px",
  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 950,
  color: "#ffffff",
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#a7f3d0",
  fontWeight: 800,
  fontSize: "14px",
  lineHeight: 1.8,
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1.2fr 1fr auto auto",
  gap: "14px",
  marginTop: "22px",
  alignItems: "center",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(16,185,129,0.32)",
  borderRadius: "18px",
  padding: "16px",
  outline: "none",
  background: "rgba(255,255,255,0.96)",
  color: "#111827",
  fontWeight: 850,
  fontSize: "15px",
  boxSizing: "border-box",
};

const greenButtonStyle: React.CSSProperties = {
  border: "0",
  borderRadius: "16px",
  padding: "15px 18px",
  background: "linear-gradient(135deg, #10b981, #059669)",
  color: "#ffffff",
  fontWeight: 950,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.28)",
  borderRadius: "16px",
  padding: "15px 18px",
  background: "rgba(255,255,255,0.055)",
  color: "#d1fae5",
  fontWeight: 950,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const summaryBoxStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "18px",
};

const detailItemStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.18)",
  background: "rgba(255,255,255,0.055)",
  borderRadius: "16px",
  padding: "12px",
  display: "grid",
  gap: "8px",
  color: "#d1d5db",
  fontWeight: 850,
  fontSize: "12px",
};

const plansGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "18px",
};

const planCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(8,47,35,0.98), rgba(6,20,15,0.98))",
  borderRadius: "28px",
  padding: "22px",
  cursor: "pointer",
};

const planHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const planTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontWeight: 950,
  fontSize: "24px",
};

const planDurationStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "8px 12px",
  background: "rgba(16,185,129,0.16)",
  color: "#6ee7b7",
  border: "1px solid rgba(16,185,129,0.28)",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const planPriceStyle: React.CSSProperties = {
  display: "block",
  marginTop: "18px",
  color: "#ffffff",
  fontWeight: 950,
  fontSize: "32px",
};

const planDescriptionStyle: React.CSSProperties = {
  margin: "14px 0 0",
  color: "#a7f3d0",
  fontWeight: 800,
  fontSize: "14px",
  lineHeight: 1.8,
};

const featuresListStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  marginTop: "16px",
};

const featureItemStyle: React.CSSProperties = {
  color: "#d1fae5",
  fontWeight: 850,
  fontSize: "13px",
};

const subscriptionsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "16px",
  marginTop: "20px",
};

const subscriptionCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.055)",
  border: "1px solid rgba(16,185,129,0.28)",
  borderRadius: "24px",
  padding: "18px",
};

const subscriptionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "14px",
};

const subscriptionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: 950,
};

const mutedTextStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#a7f3d0",
  fontWeight: 850,
  fontSize: "13px",
};

const statusBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "10px 14px",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const subscriptionDetailsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "16px",
};

const emptyStyle: React.CSSProperties = {
  marginTop: "18px",
  border: "1px solid rgba(16,185,129,0.22)",
  background: "rgba(255,255,255,0.055)",
  color: "#d1d5db",
  borderRadius: "22px",
  padding: "22px",
  textAlign: "center",
  fontWeight: 950,
};
