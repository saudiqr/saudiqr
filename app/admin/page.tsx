import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

type Plan = {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  active: boolean;
};

type Business = {
  id: string;
  name: string;
};

type SubscriptionRow = {
  id: string;
  business_id: string;
  plan_id: string | null;
  status: "trial" | "active" | "expired" | "cancelled" | "past_due";
  starts_at: string | null;
  ends_at: string | null;
  amount: number | null;
  currency: string | null;
  payment_provider: string | null;
  payment_reference: string | null;
  businesses:
    | {
        name: string;
      }[]
    | null;
  plans:
    | {
        name: string;
        price: number;
        duration_days: number;
      }[]
    | null;
};

const statusLabel: Record<string, string> = {
  trial: "تجريبي",
  active: "نشط",
  expired: "منتهي",
  cancelled: "ملغي",
  past_due: "متعثر",
};

const durationOptions = [
  { label: "14 يوم", days: 14 },
  { label: "شهر", days: 30 },
  { label: "3 أشهر", days: 90 },
  { label: "6 أشهر", days: 180 },
  { label: "سنة", days: 365 },
];

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(value: string | null) {
  if (!value) return "غير محدد";

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
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

  if (status === "expired" || status === "cancelled" || status === "past_due") {
    return {
      background: "rgba(239,68,68,0.14)",
      color: "#fca5a5",
      border: "1px solid rgba(239,68,68,0.34)",
    };
  }

  return {
    background: "rgba(255,255,255,0.08)",
    color: "#d1d5db",
    border: "1px solid rgba(255,255,255,0.14)",
  };
}

function getBusinessName(subscription: SubscriptionRow) {
  return subscription.businesses?.[0]?.name || "نشاط غير معروف";
}

function getPlanName(subscription: SubscriptionRow) {
  return subscription.plans?.[0]?.name || "باقة غير معروفة";
}

function goBackWithMessage(message: string): never {
  revalidatePath("/admin/subscriptions");
  redirect(`/admin/subscriptions?message=${encodeURIComponent(message)}`);
}

async function createSubscriptionAction(formData: FormData) {
  "use server";

  const businessId = String(formData.get("business_id") || "");
  const planId = String(formData.get("plan_id") || "");
  const status = String(formData.get("status") || "active");
  const durationDays = Number(formData.get("duration_days") || 30);

  if (!businessId || !planId) {
    goBackWithMessage("اختر النشاط والباقة أولاً");
  }

  const now = new Date();
  const endsAt = addDays(now, durationDays);

  const { data: plan } = await supabase
    .from("plans")
    .select("price")
    .eq("id", planId)
    .single();

  const { error } = await supabase.from("subscriptions").insert({
    business_id: businessId,
    plan_id: planId,
    status,
    starts_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
    amount: plan?.price || 0,
    currency: "SAR",
  });

  if (error) {
    goBackWithMessage(`خطأ: ${error.message}`);
  }

  goBackWithMessage("تم إضافة الاشتراك بنجاح");
}

async function updateSubscriptionAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const planId = String(formData.get("plan_id") || "");
  const status = String(formData.get("status") || "active");
  const amount = Number(formData.get("amount") || 0);
  const paymentProvider = String(formData.get("payment_provider") || "").trim();
  const paymentReference = String(formData.get("payment_reference") || "").trim();

  if (!id || !planId) {
    goBackWithMessage("بيانات الاشتراك غير مكتملة");
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({
      plan_id: planId,
      status,
      amount,
      currency: "SAR",
      payment_provider: paymentProvider || null,
      payment_reference: paymentReference || null,
    })
    .eq("id", id);

  if (error) {
    goBackWithMessage(`خطأ: ${error.message}`);
  }

  goBackWithMessage("تم حفظ الاشتراك بنجاح");
}

async function extendSubscriptionAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const currentEndsAt = String(formData.get("current_ends_at") || "");
  const extraDays = Number(formData.get("extra_days") || 30);

  if (!id) {
    goBackWithMessage("لم يتم تحديد الاشتراك");
  }

  const baseDate =
    currentEndsAt && new Date(currentEndsAt) > new Date()
      ? new Date(currentEndsAt)
      : new Date();

  const newEndsAt = addDays(baseDate, extraDays);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      ends_at: newEndsAt.toISOString(),
      status: "active",
    })
    .eq("id", id);

  if (error) {
    goBackWithMessage(`خطأ: ${error.message}`);
  }

  goBackWithMessage("تم تمديد الاشتراك بنجاح");
}

async function stopSubscriptionAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");

  if (!id) {
    goBackWithMessage("لم يتم تحديد الاشتراك");
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
    })
    .eq("id", id);

  if (error) {
    goBackWithMessage(`خطأ: ${error.message}`);
  }

  goBackWithMessage("تم إيقاف الاشتراك");
}

async function activateSubscriptionAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");

  if (!id) {
    goBackWithMessage("لم يتم تحديد الاشتراك");
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
    })
    .eq("id", id);

  if (error) {
    goBackWithMessage(`خطأ: ${error.message}`);
  }

  goBackWithMessage("تم تفعيل الاشتراك");
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  const message = params?.message;

  const { data: subscriptionsData, error } = await supabase
    .from("subscriptions")
    .select(
      `
      id,
      business_id,
      plan_id,
      status,
      starts_at,
      ends_at,
      amount,
      currency,
      payment_provider,
      payment_reference,
      businesses(name),
      plans(name, price, duration_days)
    `
    )
    .order("created_at", { ascending: false });

  const { data: plansData } = await supabase
    .from("plans")
    .select("id,name,price,duration_days,active")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  const { data: businessesData } = await supabase
    .from("businesses")
    .select("id,name")
    .order("created_at", { ascending: false });

  const subscriptions = (subscriptionsData || []) as SubscriptionRow[];
  const plans = (plansData || []) as Plan[];
  const businesses = (businessesData || []) as Business[];

  const activeCount = subscriptions.filter((item) => item.status === "active").length;
  const trialCount = subscriptions.filter((item) => item.status === "trial").length;
  const inactiveCount = subscriptions.filter((item) =>
    ["expired", "cancelled", "past_due"].includes(item.status)
  ).length;
  const totalAmount = subscriptions.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  return (
    <main dir="rtl" style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>SaudiQR Admin</p>
          <h1 style={heroTitleStyle}>إدارة الاشتراكات</h1>
          <p style={heroTextStyle}>
            متابعة اشتراكات النشاطات، التمديد، التفعيل، الإيقاف، وتحديث بيانات الدفع.
          </p>
        </div>

      </section>

      <section style={statsGridStyle}>
        <StatCard title="كل الاشتراكات" value={subscriptions.length} icon="◈" />
        <StatCard title="نشطة" value={activeCount} icon="🟢" />
        <StatCard title="تجريبية" value={trialCount} icon="🟡" />
        <StatCard title="غير نشطة" value={inactiveCount} icon="🔴" />
        <StatCard title="إجمالي المبالغ" value={`${totalAmount.toFixed(2)} ريال`} icon="💰" />
      </section>

      {message ? <div style={successStyle}>{message}</div> : null}

      {error ? (
        <div style={errorStyle}>خطأ في جلب الاشتراكات: {error.message}</div>
      ) : null}

      <section style={cardStyle}>
        <div>
          <h2 style={sectionTitleStyle}>إضافة اشتراك جديد</h2>
          <p style={sectionSubtitleStyle}>
            تاريخ البداية يُحفظ تلقائياً بتاريخ اليوم، وتاريخ الانتهاء يُحسب حسب المدة المختارة.
          </p>
        </div>

        <form action={createSubscriptionAction} style={createFormStyle}>
          <select name="business_id" style={inputStyle} required>
            <option value="">اختر النشاط</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>

          <select name="plan_id" style={inputStyle} required>
            <option value="">اختر الباقة</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} - {plan.price} ريال
              </option>
            ))}
          </select>

          <select name="status" defaultValue="active" style={inputStyle}>
            <option value="trial">تجريبي</option>
            <option value="active">نشط</option>
            <option value="expired">منتهي</option>
            <option value="cancelled">ملغي</option>
          </select>

          <select name="duration_days" defaultValue="30" style={inputStyle}>
            {durationOptions.map((option) => (
              <option key={option.days} value={option.days}>
                {option.label}
              </option>
            ))}
          </select>

          <button style={greenButtonStyle}>+ إضافة اشتراك</button>
        </form>
      </section>

      {subscriptions.length === 0 && !error ? (
        <section style={emptyStyle}>لا توجد اشتراكات حتى الآن.</section>
      ) : (
        <section style={subscriptionsGridStyle}>
          {subscriptions.map((subscription) => (
            <article key={subscription.id} style={subscriptionCardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <h2 style={businessTitleStyle}>{getBusinessName(subscription)}</h2>
                  <p style={mutedTextStyle}>{getPlanName(subscription)}</p>
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

              <div style={detailsGridStyle}>
                <DetailItem title="البداية" value={formatDate(subscription.starts_at)} />
                <DetailItem title="النهاية" value={formatDate(subscription.ends_at)} />
                <DetailItem title="المتبقي" value={daysLeft(subscription.ends_at)} />
                <DetailItem
                  title="المبلغ"
                  value={`${subscription.amount || 0} ${subscription.currency || "SAR"}`}
                />
              </div>

              <div style={paymentBoxStyle}>
                <strong>بيانات الدفع</strong>
                <span>{subscription.payment_provider || "بدون مزود دفع"}</span>
                <span>{subscription.payment_reference || "لا يوجد مرجع"}</span>
              </div>

              <form action={updateSubscriptionAction} style={editFormStyle}>
                <input type="hidden" name="id" value={subscription.id} />

                <select
                  name="plan_id"
                  defaultValue={subscription.plan_id || ""}
                  style={inputStyle}
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>

                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={subscription.amount || 0}
                  placeholder="المبلغ"
                  style={inputStyle}
                />

                <input
                  name="payment_provider"
                  placeholder="مزود الدفع"
                  defaultValue={subscription.payment_provider || ""}
                  style={inputStyle}
                />

                <input
                  name="payment_reference"
                  placeholder="مرجع الدفع"
                  defaultValue={subscription.payment_reference || ""}
                  style={inputStyle}
                />

                <select
                  name="status"
                  defaultValue={subscription.status}
                  style={inputStyle}
                >
                  <option value="trial">تجريبي</option>
                  <option value="active">نشط</option>
                  <option value="expired">منتهي</option>
                  <option value="cancelled">ملغي</option>
                  <option value="past_due">متعثر</option>
                </select>

                <button style={greenButtonStyle}>حفظ الاشتراك</button>
              </form>

              <div style={extendGridStyle}>
                {durationOptions.map((option) => (
                  <form key={option.days} action={extendSubscriptionAction}>
                    <input type="hidden" name="id" value={subscription.id} />
                    <input
                      type="hidden"
                      name="current_ends_at"
                      value={subscription.ends_at || ""}
                    />
                    <input type="hidden" name="extra_days" value={option.days} />
                    <button style={smallButtonStyle}>تمديد {option.label}</button>
                  </form>
                ))}
              </div>

              {subscription.status === "cancelled" ? (
                <form action={activateSubscriptionAction}>
                  <input type="hidden" name="id" value={subscription.id} />
                  <button style={greenOutlineButtonStyle}>تفعيل الاشتراك</button>
                </form>
              ) : (
                <form action={stopSubscriptionAction}>
                  <input type="hidden" name="id" value={subscription.id} />
                  <button style={dangerButtonStyle}>إيقاف الاشتراك</button>
                </form>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div style={statCardStyle}>
      <div>
        <p style={statTitleStyle}>{title}</p>
        <strong style={statValueStyle}>{value}</strong>
      </div>

      <div style={statIconStyle}>{icon}</div>
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

const pageStyle: React.CSSProperties = {
  minHeight: "100%",
  background: "#06140f",
  color: "#e5e7eb",
  padding: "32px",
  display: "grid",
  gap: "24px",
  boxSizing: "border-box",
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
  whiteSpace: "nowrap",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "14px",
};

const statCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(6,78,59,0.98), rgba(9,40,30,0.98))",
  border: "1px solid rgba(16,185,129,0.38)",
  borderRadius: "24px",
  padding: "18px",
  boxShadow: "0 18px 38px rgba(0,0,0,0.25)",
  minHeight: "118px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const statTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#a7f3d0",
  fontWeight: 950,
};

const statValueStyle: React.CSSProperties = {
  display: "block",
  marginTop: "10px",
  color: "#ffffff",
  fontWeight: 950,
  fontSize: "24px",
};

const statIconStyle: React.CSSProperties = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  background: "rgba(16,185,129,0.16)",
  border: "1px solid rgba(16,185,129,0.22)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
  flexShrink: 0,
  color: "#6ee7b7",
  fontWeight: 950,
};

const successStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.38)",
  background: "rgba(16,185,129,0.14)",
  color: "#6ee7b7",
  borderRadius: "18px",
  padding: "14px",
  fontWeight: 950,
};

const errorStyle: React.CSSProperties = {
  border: "1px solid rgba(239,68,68,0.35)",
  background: "rgba(239,68,68,0.14)",
  color: "#fca5a5",
  borderRadius: "18px",
  padding: "14px",
  fontWeight: 950,
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

const createFormStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "14px",
  marginTop: "22px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(16,185,129,0.32)",
  borderRadius: "16px",
  padding: "14px",
  outline: "none",
  background: "rgba(255,255,255,0.96)",
  color: "#111827",
  fontWeight: 850,
  fontSize: "14px",
  boxSizing: "border-box",
};

const greenButtonStyle: React.CSSProperties = {
  border: "0",
  borderRadius: "16px",
  padding: "14px 18px",
  background: "linear-gradient(135deg, #10b981, #059669)",
  color: "#ffffff",
  fontWeight: 950,
  cursor: "pointer",
  width: "100%",
};

const subscriptionsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "18px",
};

const subscriptionCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(8,47,35,0.98), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.38)",
  borderRadius: "28px",
  padding: "22px",
  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "14px",
};

const businessTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontSize: "24px",
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

const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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

const paymentBoxStyle: React.CSSProperties = {
  marginTop: "14px",
  border: "1px solid rgba(16,185,129,0.18)",
  background: "rgba(255,255,255,0.055)",
  borderRadius: "16px",
  padding: "14px",
  display: "grid",
  gap: "7px",
  color: "#d1d5db",
  fontWeight: 850,
  fontSize: "13px",
};

const editFormStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "16px",
};

const extendGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "8px",
  marginTop: "14px",
};

const smallButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(16,185,129,0.24)",
  borderRadius: "13px",
  padding: "10px",
  background: "rgba(255,255,255,0.055)",
  color: "#d1fae5",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: "12px",
};

const greenOutlineButtonStyle: React.CSSProperties = {
  width: "100%",
  marginTop: "14px",
  border: "1px solid rgba(16,185,129,0.35)",
  borderRadius: "15px",
  padding: "13px",
  background: "rgba(16,185,129,0.12)",
  color: "#6ee7b7",
  fontWeight: 950,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  width: "100%",
  marginTop: "14px",
  border: "1px solid rgba(239,68,68,0.32)",
  borderRadius: "15px",
  padding: "13px",
  background: "rgba(239,68,68,0.12)",
  color: "#fca5a5",
  fontWeight: 950,
  cursor: "pointer",
};

const emptyStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(8,47,35,0.98), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.38)",
  borderRadius: "28px",
  padding: "34px",
  textAlign: "center",
  color: "#d1d5db",
  fontWeight: 950,
};
