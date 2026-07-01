import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

type ThemeName = "coffee" | "light";

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
  created_at: string | null;
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

type SupportTicketRow = {
  id: string;
  title?: string | null;
  subject?: string | null;
  category?: string | null;
  status?: string | null;
  created_at?: string | null;
  businesses?: { name: string }[] | null;
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

const themes = {
  coffee: {
    name: "نظام القهوة",
    href: "?theme=coffee",
    bg: "#070B10",
    bg2: "#0D151C",
    card: "rgba(13,21,28,.92)",
    card2: "rgba(20,28,36,.88)",
    hero: "linear-gradient(135deg, rgba(25,18,13,.95), rgba(7,11,16,.98))",
    border: "rgba(198,138,61,.35)",
    softBorder: "rgba(255,255,255,.09)",
    text: "#FFF8F0",
    muted: "#B7A99B",
    gold: "#DFA64A",
    gold2: "#F3C77D",
    green: "#3FDB7D",
    red: "#F26B6B",
    blue: "#67B7FF",
    purple: "#B889FF",
    shadow: "0 24px 80px rgba(0,0,0,.35)",
    heroImage:
      "radial-gradient(circle at 18% 42%, rgba(223,166,74,.30), transparent 20%), radial-gradient(circle at 10% 30%, rgba(255,255,255,.10), transparent 8%), linear-gradient(135deg, rgba(198,138,61,.18), rgba(0,0,0,0))",
  },
  light: {
    name: "النظام الفاتح",
    href: "?theme=light",
    bg: "#F7F2EA",
    bg2: "#EFE6D8",
    card: "rgba(255,255,255,.92)",
    card2: "rgba(255,252,247,.92)",
    hero: "linear-gradient(135deg, #FFF8EE, #F3E5D1)",
    border: "rgba(171,112,39,.28)",
    softBorder: "rgba(40,24,8,.10)",
    text: "#1D160F",
    muted: "#7B6A58",
    gold: "#A86D1F",
    gold2: "#C88A2E",
    green: "#0C9F57",
    red: "#C73E3E",
    blue: "#1769AA",
    purple: "#7048B6",
    shadow: "0 20px 55px rgba(88,58,18,.14)",
    heroImage:
      "radial-gradient(circle at 18% 42%, rgba(168,109,31,.18), transparent 20%), radial-gradient(circle at 10% 30%, rgba(255,255,255,.7), transparent 10%), linear-gradient(135deg, rgba(198,138,61,.10), rgba(255,255,255,0))",
  },
} satisfies Record<ThemeName, Record<string, string>>;

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

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function formatTime(value: string | null) {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
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

function getBusinessName(subscription: SubscriptionRow) {
  return subscription.businesses?.[0]?.name || "نشاط غير معروف";
}

function getPlanName(subscription: SubscriptionRow) {
  return subscription.plans?.[0]?.name || "باقة غير معروفة";
}

function getTicketTitle(ticket: SupportTicketRow) {
  return ticket.title || ticket.subject || ticket.category || "بلاغ جديد";
}

function getTicketBusiness(ticket: SupportTicketRow) {
  return ticket.businesses?.[0]?.name || "عميل غير محدد";
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() + 1);
  return copy;
}

function isDateBetween(value: string | null, start: Date, end: Date) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return time >= start.getTime() && time < end.getTime();
}

function getStatusClass(status: string) {
  if (status === "active") return "badge badge-green";
  if (status === "trial") return "badge badge-gold";
  if (["expired", "cancelled", "past_due"].includes(status)) return "badge badge-red";
  return "badge";
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

  if (error) goBackWithMessage(`خطأ: ${error.message}`);
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

  if (!id || !planId) goBackWithMessage("بيانات الاشتراك غير مكتملة");

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

  if (error) goBackWithMessage(`خطأ: ${error.message}`);
  goBackWithMessage("تم حفظ الاشتراك بنجاح");
}

async function extendSubscriptionAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const currentEndsAt = String(formData.get("current_ends_at") || "");
  const extraDays = Number(formData.get("extra_days") || 30);

  if (!id) goBackWithMessage("لم يتم تحديد الاشتراك");

  const baseDate =
    currentEndsAt && new Date(currentEndsAt) > new Date()
      ? new Date(currentEndsAt)
      : new Date();

  const newEndsAt = addDays(baseDate, extraDays);

  const { error } = await supabase
    .from("subscriptions")
    .update({ ends_at: newEndsAt.toISOString(), status: "active" })
    .eq("id", id);

  if (error) goBackWithMessage(`خطأ: ${error.message}`);
  goBackWithMessage("تم تمديد الاشتراك بنجاح");
}

async function stopSubscriptionAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  if (!id) goBackWithMessage("لم يتم تحديد الاشتراك");

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) goBackWithMessage(`خطأ: ${error.message}`);
  goBackWithMessage("تم إيقاف الاشتراك");
}

async function activateSubscriptionAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  if (!id) goBackWithMessage("لم يتم تحديد الاشتراك");

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "active" })
    .eq("id", id);

  if (error) goBackWithMessage(`خطأ: ${error.message}`);
  goBackWithMessage("تم تفعيل الاشتراك");
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ message?: string; theme?: string }>;
}) {
  const params = await searchParams;
  const message = params?.message;
  const themeName: ThemeName = params?.theme === "light" ? "light" : "coffee";
  const theme = themes[themeName];
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = endOfDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

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
      created_at,
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

  const { data: ticketsData } = await supabase
    .from("support_tickets")
    .select("id,title,subject,category,status,created_at,businesses(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  const subscriptions = (subscriptionsData || []) as SubscriptionRow[];
  const plans = (plansData || []) as Plan[];
  const businesses = (businessesData || []) as Business[];
  const tickets = (ticketsData || []) as SupportTicketRow[];

  const activeSubscriptions = subscriptions.filter((item) => item.status === "active");
  const trialCount = subscriptions.filter((item) => item.status === "trial").length;
  const expiredSubscriptions = subscriptions.filter((item) =>
    item.status === "expired" ||
    (item.ends_at ? new Date(item.ends_at).getTime() < now.getTime() : false)
  );
  const newSubscriptionsToday = subscriptions.filter((item) =>
    isDateBetween(item.created_at, todayStart, tomorrowStart)
  );
  const todayAmount = subscriptions
    .filter((item) => isDateBetween(item.created_at, todayStart, tomorrowStart))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const yesterdayAmount = subscriptions
    .filter((item) => isDateBetween(item.created_at, yesterdayStart, todayStart))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const twoDaysAmount = todayAmount + yesterdayAmount;
  const totalAmount = subscriptions.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const activePlansDistribution = activeSubscriptions.reduce<Record<string, number>>((acc, item) => {
    const name = getPlanName(item);
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const recentExpired = expiredSubscriptions.slice(0, 5);
  const recentNewSubscriptions = newSubscriptionsToday.length > 0
    ? newSubscriptionsToday.slice(0, 5)
    : subscriptions.slice(0, 5);

  return (
    <main dir="rtl" className="admin-page" style={cssVars(theme)}>
      <style>{adminCss}</style>

      <section className="topbar">
        <div className="brand-block">
          <div className="brand-logo">☕</div>
          <div>
            <strong>KARZ</strong>
            <span>لوحة التحكم</span>
          </div>
        </div>

        <div className="theme-switcher">
          <Link className={themeName === "coffee" ? "theme-btn active" : "theme-btn"} href="?theme=coffee">
            نظام القهوة ☕
          </Link>
          <Link className={themeName === "light" ? "theme-btn active light" : "theme-btn light"} href="?theme=light">
            النظام الفاتح ☀️
          </Link>
        </div>

        <div className="time-box">
          <span>الوقت الآن</span>
          <strong>{formatDateTime(now)}</strong>
        </div>
      </section>

      <section className="hero-card">
        <div className="hero-art" />
        <div className="hero-content">
          <p>👋 أهلاً بك في لوحة التحكم</p>
          <h1>هَذَا مِنْ فَضْلِ رَبِّي</h1>
          <span>سورة النمل - الآية 40</span>
        </div>
      </section>

      <section className="kpi-grid primary-grid">
        <MetricCard icon="👥" title="عدد العملاء" value={businesses.length} hint="إجمالي النشاطات المسجلة" tone="blue" />
        <MetricCard icon="🆕" title="الاشتراكات الجديدة" value={newSubscriptionsToday.length} hint="اليوم" tone="green" />
        <MetricCard icon="⚠️" title="الاشتراكات المنتهية" value={expiredSubscriptions.length} hint="تحتاج متابعة" tone="red" />
        <MetricCard icon="💬" title="البلاغات" value={tickets.length} hint="آخر البلاغات المفتوحة" tone="purple" />
        <MetricCard icon="💰" title="مبالغ آخر يومين" value={`${twoDaysAmount.toFixed(2)} ر.س`} hint={`اليوم ${todayAmount.toFixed(2)} / أمس ${yesterdayAmount.toFixed(2)}`} tone="gold" />
      </section>

      {message ? <div className="notice success">{message}</div> : null}
      {error ? <div className="notice error">خطأ في جلب الاشتراكات: {error.message}</div> : null}

      <section className="main-dashboard-grid">
        <div className="panel chart-panel">
          <div className="panel-header">
            <div>
              <h2>قيمة مبالغ الاشتراكات</h2>
              <p>نظرة سريعة على آخر يومين وإجمالي المبالغ.</p>
            </div>
            <strong>{totalAmount.toFixed(2)} ر.س</strong>
          </div>
          <div className="fake-chart">
            <span style={{ height: "28%" }} />
            <span style={{ height: "42%" }} />
            <span style={{ height: "58%" }} />
            <span style={{ height: "52%" }} />
            <span style={{ height: "70%" }} />
            <span style={{ height: "86%" }} />
            <span style={{ height: "62%" }} />
            <span style={{ height: "54%" }} />
            <span style={{ height: "66%" }} />
          </div>
          <div className="chart-footer">
            <span>أمس: {yesterdayAmount.toFixed(2)} ر.س</span>
            <span>اليوم: {todayAmount.toFixed(2)} ر.س</span>
          </div>
        </div>

        <div className="panel plans-panel">
          <div className="panel-header">
            <div>
              <h2>أنواع الاشتراكات المفعلة</h2>
              <p>توزيع الباقات النشطة حالياً.</p>
            </div>
          </div>

          <div className="donut-wrap">
            <div className="donut">
              <strong>{activeSubscriptions.length}</strong>
              <span>نشط</span>
            </div>
            <div className="legend-list">
              {Object.entries(activePlansDistribution).length === 0 ? (
                <p className="muted">لا توجد اشتراكات نشطة.</p>
              ) : (
                Object.entries(activePlansDistribution).map(([planName, count]) => (
                  <div key={planName} className="legend-row">
                    <span />
                    <strong>{planName}</strong>
                    <em>{count}</em>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="quick-grid">
        <MiniPanel title="أحدث البلاغات" href="/admin/support" link="عرض جميع البلاغات">
          {tickets.length === 0 ? (
            <div className="empty-small">لا توجد بلاغات حالياً.</div>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="list-row">
                <div>
                  <strong>{getTicketTitle(ticket)}</strong>
                  <span>{getTicketBusiness(ticket)} · {formatTime(ticket.created_at || null)}</span>
                </div>
                <em>{ticket.status || "جديد"}</em>
              </div>
            ))
          )}
        </MiniPanel>

        <MiniPanel title="أحدث الاشتراكات الجديدة" href="/admin/subscriptions" link="عرض الاشتراكات">
          {recentNewSubscriptions.map((subscription) => (
            <div key={subscription.id} className="list-row">
              <div>
                <strong>{getBusinessName(subscription)}</strong>
                <span>{getPlanName(subscription)} · {formatDate(subscription.created_at)}</span>
              </div>
              <em>{Number(subscription.amount || 0).toFixed(0)} ر.س</em>
            </div>
          ))}
        </MiniPanel>

        <MiniPanel title="أحدث الاشتراكات المنتهية" href="/admin/subscriptions" link="متابعة المنتهية">
          {recentExpired.length === 0 ? (
            <div className="empty-small">لا توجد اشتراكات منتهية.</div>
          ) : (
            recentExpired.map((subscription) => (
              <div key={subscription.id} className="list-row danger-row">
                <div>
                  <strong>{getBusinessName(subscription)}</strong>
                  <span>{getPlanName(subscription)} · انتهى {formatDate(subscription.ends_at)}</span>
                </div>
                <em>منتهي</em>
              </div>
            ))
          )}
        </MiniPanel>
      </section>

      <section className="panel add-panel">
        <div className="panel-header">
          <div>
            <h2>إضافة اشتراك جديد</h2>
            <p>تاريخ البداية يحفظ تلقائياً بتاريخ اليوم، والانتهاء حسب المدة المختارة.</p>
          </div>
        </div>

        <form action={createSubscriptionAction} className="create-form">
          <select name="business_id" required>
            <option value="">اختر النشاط</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>{business.name}</option>
            ))}
          </select>

          <select name="plan_id" required>
            <option value="">اختر الباقة</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>{plan.name} - {plan.price} ريال</option>
            ))}
          </select>

          <select name="status" defaultValue="active">
            <option value="trial">تجريبي</option>
            <option value="active">نشط</option>
            <option value="expired">منتهي</option>
            <option value="cancelled">ملغي</option>
          </select>

          <select name="duration_days" defaultValue="30">
            {durationOptions.map((option) => (
              <option key={option.days} value={option.days}>{option.label}</option>
            ))}
          </select>

          <button className="primary-btn">+ إضافة اشتراك</button>
        </form>
      </section>

      <section className="subscriptions-grid">
        {subscriptions.map((subscription) => (
          <article key={subscription.id} className="subscription-card">
            <div className="sub-head">
              <div>
                <h2>{getBusinessName(subscription)}</h2>
                <p>{getPlanName(subscription)}</p>
              </div>
              <span className={getStatusClass(subscription.status)}>{statusLabel[subscription.status] || subscription.status}</span>
            </div>

            <div className="details-grid">
              <DetailItem title="البداية" value={formatDate(subscription.starts_at)} />
              <DetailItem title="النهاية" value={formatDate(subscription.ends_at)} />
              <DetailItem title="المتبقي" value={daysLeft(subscription.ends_at)} />
              <DetailItem title="المبلغ" value={`${subscription.amount || 0} ${subscription.currency || "SAR"}`} />
            </div>

            <div className="payment-box">
              <strong>بيانات الدفع</strong>
              <span>{subscription.payment_provider || "بدون مزود دفع"}</span>
              <span>{subscription.payment_reference || "لا يوجد مرجع"}</span>
            </div>

            <form action={updateSubscriptionAction} className="edit-form">
              <input type="hidden" name="id" value={subscription.id} />

              <select name="plan_id" defaultValue={subscription.plan_id || ""}>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>

              <input name="amount" type="number" step="0.01" defaultValue={subscription.amount || 0} placeholder="المبلغ" />
              <input name="payment_provider" placeholder="مزود الدفع" defaultValue={subscription.payment_provider || ""} />
              <input name="payment_reference" placeholder="مرجع الدفع" defaultValue={subscription.payment_reference || ""} />

              <select name="status" defaultValue={subscription.status}>
                <option value="trial">تجريبي</option>
                <option value="active">نشط</option>
                <option value="expired">منتهي</option>
                <option value="cancelled">ملغي</option>
                <option value="past_due">متعثر</option>
              </select>

              <button className="primary-btn">حفظ الاشتراك</button>
            </form>

            <div className="extend-grid">
              {durationOptions.map((option) => (
                <form key={option.days} action={extendSubscriptionAction}>
                  <input type="hidden" name="id" value={subscription.id} />
                  <input type="hidden" name="current_ends_at" value={subscription.ends_at || ""} />
                  <input type="hidden" name="extra_days" value={option.days} />
                  <button>تمديد {option.label}</button>
                </form>
              ))}
            </div>

            {subscription.status === "cancelled" ? (
              <form action={activateSubscriptionAction}>
                <input type="hidden" name="id" value={subscription.id} />
                <button className="outline-btn">تفعيل الاشتراك</button>
              </form>
            ) : (
              <form action={stopSubscriptionAction}>
                <input type="hidden" name="id" value={subscription.id} />
                <button className="danger-btn">إيقاف الاشتراك</button>
              </form>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}

function MetricCard({
  icon,
  title,
  value,
  hint,
  tone,
}: {
  icon: string;
  title: string;
  value: string | number;
  hint: string;
  tone: "green" | "red" | "gold" | "blue" | "purple";
}) {
  return (
    <div className={`metric-card metric-${tone}`}>
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <em>{hint}</em>
      </div>
    </div>
  );
}

function MiniPanel({
  title,
  children,
  href,
  link,
}: {
  title: string;
  children: React.ReactNode;
  href: string;
  link: string;
}) {
  return (
    <section className="panel mini-panel">
      <div className="panel-header compact">
        <h2>{title}</h2>
        <Link href={href}>{link} ←</Link>
      </div>
      <div className="mini-list">{children}</div>
    </section>
  );
}

function DetailItem({ title, value }: { title: string; value: string }) {
  return (
    <div className="detail-item">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function cssVars(theme: Record<string, string>): React.CSSProperties {
  return {
    ["--bg" as string]: theme.bg,
    ["--bg2" as string]: theme.bg2,
    ["--card" as string]: theme.card,
    ["--card2" as string]: theme.card2,
    ["--hero" as string]: theme.hero,
    ["--heroImage" as string]: theme.heroImage,
    ["--border" as string]: theme.border,
    ["--softBorder" as string]: theme.softBorder,
    ["--text" as string]: theme.text,
    ["--muted" as string]: theme.muted,
    ["--gold" as string]: theme.gold,
    ["--gold2" as string]: theme.gold2,
    ["--green" as string]: theme.green,
    ["--red" as string]: theme.red,
    ["--blue" as string]: theme.blue,
    ["--purple" as string]: theme.purple,
    ["--shadow" as string]: theme.shadow,
  } as React.CSSProperties;
}

const adminCss = `
.admin-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--gold) 18%, transparent), transparent 28%),
    linear-gradient(180deg, var(--bg), var(--bg2));
  color: var(--text);
  padding: 24px;
  display: grid;
  gap: 18px;
  box-sizing: border-box;
}
.admin-page * { box-sizing: border-box; }
.topbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
}
.brand-block { display: flex; align-items: center; gap: 12px; }
.brand-logo {
  width: 52px; height: 52px; border-radius: 18px;
  border: 1px solid var(--border);
  display: grid; place-items: center;
  background: var(--card);
  color: var(--gold2);
  font-size: 24px;
  box-shadow: var(--shadow);
}
.brand-block strong { display: block; color: var(--gold2); font-size: 28px; font-weight: 950; }
.brand-block span { color: var(--muted); font-weight: 900; font-size: 13px; }
.theme-switcher { display: flex; justify-content: center; gap: 10px; }
.theme-btn {
  border: 1px solid var(--softBorder);
  background: var(--card);
  color: var(--muted);
  padding: 13px 18px;
  border-radius: 17px;
  text-decoration: none;
  font-weight: 950;
  white-space: nowrap;
}
.theme-btn.active {
  color: var(--gold2);
  border-color: var(--border);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 16%, transparent);
}
.theme-btn.light.active { color: var(--text); background: color-mix(in srgb, var(--gold) 12%, var(--card)); }
.time-box {
  justify-self: end;
  border: 1px solid var(--softBorder);
  border-radius: 18px;
  padding: 12px 16px;
  background: var(--card);
  text-align: left;
}
.time-box span { display: block; color: var(--muted); font-size: 12px; font-weight: 900; }
.time-box strong { display: block; margin-top: 5px; font-size: 15px; color: var(--text); }
.hero-card {
  min-height: 245px;
  border-radius: 30px;
  border: 1px solid var(--border);
  background: var(--hero);
  box-shadow: var(--shadow);
  overflow: hidden;
  position: relative;
  display: grid;
  grid-template-columns: .95fr 1.35fr;
  align-items: center;
}
.hero-card::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--gold) 10%, transparent), transparent);
  pointer-events: none;
}
.hero-art {
  height: 100%;
  min-height: 245px;
  background:
    var(--heroImage),
    radial-gradient(circle at 35% 55%, rgba(255,255,255,.10), transparent 18%);
  border-left: 1px solid var(--softBorder);
  position: relative;
}
.hero-art::before {
  content: "☕";
  position: absolute;
  left: 50%; top: 50%; transform: translate(-50%, -50%);
  font-size: 88px;
  filter: drop-shadow(0 18px 35px rgba(0,0,0,.45));
}
.hero-content { text-align: center; padding: 34px; position: relative; z-index: 1; }
.hero-content p { margin: 0 0 18px; font-size: 28px; font-weight: 900; }
.hero-content h1 { margin: 0; color: var(--gold2); font-size: 62px; line-height: 1.25; font-weight: 950; }
.hero-content span { display: block; margin-top: 12px; color: var(--muted); font-weight: 900; }
.kpi-grid { display: grid; gap: 14px; }
.primary-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.metric-card {
  min-height: 145px;
  border: 1px solid var(--softBorder);
  border-radius: 24px;
  background: linear-gradient(145deg, var(--card), var(--card2));
  box-shadow: var(--shadow);
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 15px;
}
.metric-icon {
  width: 56px; height: 56px; border-radius: 19px;
  display: grid; place-items: center;
  font-size: 24px;
  background: rgba(255,255,255,.06);
  flex: 0 0 auto;
}
.metric-card span { color: var(--muted); font-weight: 950; font-size: 13px; }
.metric-card strong { display: block; margin-top: 10px; color: var(--text); font-size: 31px; font-weight: 950; }
.metric-card em { display: block; margin-top: 8px; font-style: normal; color: var(--muted); font-size: 12px; font-weight: 900; }
.metric-green .metric-icon, .metric-green em { color: var(--green); }
.metric-red .metric-icon, .metric-red em { color: var(--red); }
.metric-gold .metric-icon, .metric-gold em { color: var(--gold2); }
.metric-blue .metric-icon, .metric-blue em { color: var(--blue); }
.metric-purple .metric-icon, .metric-purple em { color: var(--purple); }
.notice { border-radius: 18px; padding: 14px; font-weight: 950; }
.notice.success { border: 1px solid color-mix(in srgb, var(--green) 35%, transparent); color: var(--green); background: color-mix(in srgb, var(--green) 12%, transparent); }
.notice.error { border: 1px solid color-mix(in srgb, var(--red) 35%, transparent); color: var(--red); background: color-mix(in srgb, var(--red) 12%, transparent); }
.main-dashboard-grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 16px; }
.panel {
  border: 1px solid var(--softBorder);
  background: linear-gradient(145deg, var(--card), var(--card2));
  border-radius: 26px;
  padding: 20px;
  box-shadow: var(--shadow);
}
.panel-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; margin-bottom: 18px; }
.panel-header h2 { margin: 0; font-size: 23px; color: var(--text); font-weight: 950; }
.panel-header p { margin: 8px 0 0; color: var(--muted); font-weight: 850; }
.panel-header strong { color: var(--gold2); font-size: 24px; white-space: nowrap; }
.panel-header.compact { margin-bottom: 10px; align-items: center; }
.panel-header.compact h2 { font-size: 21px; }
.panel-header a { color: var(--gold2); text-decoration: none; font-weight: 950; }
.fake-chart {
  height: 255px;
  border-radius: 22px;
  border: 1px solid var(--softBorder);
  background:
    linear-gradient(to top, color-mix(in srgb, var(--gold) 12%, transparent), transparent),
    repeating-linear-gradient(to top, transparent 0 38px, rgba(255,255,255,.06) 39px);
  display: flex;
  align-items: end;
  gap: 10px;
  padding: 22px;
}
.fake-chart span {
  flex: 1;
  border-radius: 999px 999px 8px 8px;
  background: linear-gradient(180deg, var(--gold2), color-mix(in srgb, var(--gold) 45%, transparent));
  box-shadow: 0 0 22px color-mix(in srgb, var(--gold) 25%, transparent);
}
.chart-footer { display: flex; justify-content: space-between; color: var(--muted); margin-top: 12px; font-weight: 900; }
.donut-wrap { display: grid; grid-template-columns: 210px 1fr; align-items: center; gap: 20px; }
.donut {
  width: 205px; height: 205px; border-radius: 50%;
  background: conic-gradient(var(--gold2) 0 45%, var(--green) 45% 74%, var(--purple) 74% 100%);
  display: grid; place-items: center;
  position: relative;
}
.donut::after { content: ""; position: absolute; inset: 38px; border-radius: 50%; background: var(--bg); }
.donut strong, .donut span { position: relative; z-index: 1; }
.donut strong { font-size: 42px; font-weight: 950; }
.donut span { margin-top: 50px; color: var(--muted); font-weight: 900; }
.legend-list { display: grid; gap: 12px; }
.legend-row { display: grid; grid-template-columns: 12px 1fr auto; align-items: center; gap: 9px; color: var(--muted); font-weight: 900; }
.legend-row span { width: 12px; height: 12px; border-radius: 50%; background: var(--gold2); }
.legend-row:nth-child(2) span { background: var(--green); }
.legend-row:nth-child(3) span { background: var(--purple); }
.legend-row strong { color: var(--text); }
.legend-row em { font-style: normal; color: var(--gold2); }
.quick-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.mini-list { display: grid; gap: 10px; }
.list-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 13px;
  border-radius: 17px;
  border: 1px solid var(--softBorder);
  background: rgba(255,255,255,.035);
}
.list-row strong { display: block; font-size: 14px; color: var(--text); }
.list-row span { display: block; margin-top: 5px; color: var(--muted); font-size: 12px; font-weight: 850; }
.list-row em { font-style: normal; color: var(--gold2); font-weight: 950; white-space: nowrap; }
.danger-row em { color: var(--red); }
.empty-small { color: var(--muted); font-weight: 900; padding: 18px; text-align: center; }
.create-form, .edit-form { display: grid; gap: 12px; }
.create-form { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.edit-form { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 16px; }
.admin-page input, .admin-page select {
  width: 100%;
  border: 1px solid var(--softBorder);
  border-radius: 16px;
  padding: 13px;
  outline: none;
  background: color-mix(in srgb, var(--card) 80%, white 12%);
  color: var(--text);
  font-weight: 850;
}
.admin-page option { color: #111827; }
.primary-btn {
  border: 0; border-radius: 16px; padding: 14px 18px;
  background: linear-gradient(135deg, var(--gold), var(--gold2));
  color: #1B1208; font-weight: 950; cursor: pointer; width: 100%;
}
.subscriptions-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.subscription-card {
  border: 1px solid var(--softBorder);
  background: linear-gradient(145deg, var(--card), var(--card2));
  border-radius: 26px;
  padding: 20px;
  box-shadow: var(--shadow);
}
.sub-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.sub-head h2 { margin: 0; color: var(--text); font-size: 23px; font-weight: 950; }
.sub-head p { margin: 8px 0 0; color: var(--muted); font-weight: 850; }
.badge { border-radius: 999px; padding: 9px 13px; font-weight: 950; white-space: nowrap; border: 1px solid var(--softBorder); color: var(--muted); }
.badge-green { color: var(--green); border-color: color-mix(in srgb, var(--green) 35%, transparent); background: color-mix(in srgb, var(--green) 12%, transparent); }
.badge-gold { color: var(--gold2); border-color: color-mix(in srgb, var(--gold) 35%, transparent); background: color-mix(in srgb, var(--gold) 12%, transparent); }
.badge-red { color: var(--red); border-color: color-mix(in srgb, var(--red) 35%, transparent); background: color-mix(in srgb, var(--red) 12%, transparent); }
.details-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; margin-top: 16px; }
.detail-item {
  border: 1px solid var(--softBorder);
  background: rgba(255,255,255,.035);
  border-radius: 15px;
  padding: 11px;
  display: grid;
  gap: 7px;
}
.detail-item span { color: var(--muted); font-size: 12px; font-weight: 900; }
.detail-item strong { color: var(--text); font-size: 13px; }
.payment-box {
  margin-top: 14px;
  border: 1px solid var(--softBorder);
  background: rgba(255,255,255,.035);
  border-radius: 16px;
  padding: 13px;
  display: grid;
  gap: 7px;
  color: var(--muted);
  font-weight: 850;
}
.payment-box strong { color: var(--text); }
.extend-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
.extend-grid button, .outline-btn, .danger-btn {
  width: 100%;
  border-radius: 14px;
  padding: 11px;
  background: rgba(255,255,255,.045);
  border: 1px solid var(--softBorder);
  color: var(--text);
  font-weight: 900;
  cursor: pointer;
}
.outline-btn { margin-top: 14px; color: var(--green); border-color: color-mix(in srgb, var(--green) 35%, transparent); }
.danger-btn { margin-top: 14px; color: var(--red); border-color: color-mix(in srgb, var(--red) 35%, transparent); }
.muted { color: var(--muted); }
@media (max-width: 1250px) {
  .primary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .main-dashboard-grid, .quick-grid, .subscriptions-grid { grid-template-columns: 1fr; }
  .create-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 800px) {
  .admin-page { padding: 14px; }
  .topbar { grid-template-columns: 1fr; }
  .time-box { justify-self: stretch; text-align: right; }
  .theme-switcher { justify-content: flex-start; flex-wrap: wrap; }
  .hero-card { grid-template-columns: 1fr; }
  .hero-content h1 { font-size: 42px; }
  .primary-grid, .details-grid, .extend-grid, .create-form, .edit-form { grid-template-columns: 1fr; }
  .donut-wrap { grid-template-columns: 1fr; justify-items: center; }
}
`;
