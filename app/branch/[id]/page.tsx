import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BranchActionsMenu from "../../../components/BranchActionsMenu";

type PageProps = {
  params: Promise<{ id: string }>;
};

type Branch = {
  id: string;
  name: string;
  city: string | null;
  slug: string | null;
  subdomain: string | null;
  subscription_status: string | null;
  business_id: string;
  is_primary: boolean | null;
  businesses?: {
    name: string;
    business_type: string | null;
    trial_ends_at: string | null;
  } | null;
};

type Subscription = {
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  plans: { name: string } | { name: string }[] | null;
};

async function updateBranchAction(formData: FormData) {
  "use server";

  const branchId = String(formData.get("branchId") || "");
  const name = String(formData.get("name") || "").trim();
  const city = String(formData.get("city") || "").trim();

  if (!branchId || !name) return;

  await supabase
    .from("branches")
    .update({
      name,
      city: city || null,
    })
    .eq("id", branchId);

  revalidatePath(`/branch/${branchId}`);
}

async function deleteBranchAction(formData: FormData) {
  "use server";

  const branchId = String(formData.get("branchId") || "");

  if (!branchId) return;

  await supabase.from("branches").delete().eq("id", branchId);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

function getPlanName(plans: Subscription["plans"]) {
  if (!plans) return "غير محددة";
  if (Array.isArray(plans)) return plans[0]?.name || "غير محددة";
  return plans.name || "غير محددة";
}

function formatDate(value?: string | null) {
  if (!value) return "غير محدد";
  return new Date(value).toLocaleDateString("ar-SA");
}

function getMenuUrl(branch: Branch) {
  const slug = branch.subdomain || branch.slug || branch.id;
  return `/menu/${slug}`;
}

export default async function BranchPage({ params }: PageProps) {
  const { id } = await params;

  const { data: branch } = await supabase
    .from("branches")
    .select(`
      id,
      name,
      city,
      slug,
      subdomain,
      subscription_status,
      business_id,
      is_primary,
      businesses (
        name,
        business_type,
        trial_ends_at
      )
    `)
    .eq("id", id)
    .single<Branch>();

  if (!branch) {
    return (
      <div className="rounded-[28px] border border-[#4A3425] bg-[#241B16] p-8 text-[#FFF8F0]">
        <h1 className="text-4xl font-black">الفرع غير موجود</h1>

        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-2xl bg-[#C68A3D] px-6 py-4 text-lg font-black text-[#16110E] transition hover:bg-[#DEA54B]"
        >
          العودة للوحة التحكم
        </Link>
      </div>
    );
  }

  const nowIso = new Date().toISOString();

  const [
    subscriptionResult,
    categoriesResult,
    productsResult,
    tablesResult,
    pendingOrdersResult,
    waiterCallsResult,
    billRequestsResult,
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(`
        status,
        starts_at,
        ends_at,
        plans (
          name
        )
      `)
      .eq("business_id", branch.business_id)
      .in("status", ["active", "trial"])
      .gt("ends_at", nowIso)
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle<Subscription>(),

    supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", branch.id),

    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", branch.id),

    supabase
      .from("tables")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", branch.id),

    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", branch.id)
      .in("status", ["new", "preparing", "ready"]),

    supabase
      .from("waiter_calls")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", branch.id)
      .eq("status", "pending"),

    supabase
      .from("bill_requests")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", branch.id)
      .eq("status", "pending"),
  ]);

  const subscription = subscriptionResult.data;
  const planName = getPlanName(subscription?.plans || null);
  const endsAt = formatDate(subscription?.ends_at || branch.businesses?.trial_ends_at);
  const isTrial = subscription?.status === "trial";

  const setupCards = [
    {
      title: "الأقسام",
      value: categoriesResult.count || 0,
      href: `/branch/${branch.id}/categories`,
      note: "تنظيم المنيو",
    },
    {
      title: "المنتجات",
      value: productsResult.count || 0,
      href: `/branch/${branch.id}/products`,
      note: "إدارة الأصناف",
    },
    {
      title: "الطاولات",
      value: tablesResult.count || 0,
      href: `/branch/${branch.id}/tables`,
      note: "QR لكل طاولة",
    },
  ];

  const operationCards = [
    {
      title: "الطلبات الحالية",
      value: pendingOrdersResult.count || 0,
      href: `/branch/${branch.id}/orders`,
      note: "طلبات تحتاج متابعة",
    },
    {
      title: "استدعاء النادل",
      value: waiterCallsResult.count || 0,
      href: `/branch/${branch.id}/waiter-calls`,
      note: "طلبات قيد الانتظار",
    },
    {
      title: "طلبات الفاتورة",
      value: billRequestsResult.count || 0,
      href: `/branch/${branch.id}/bill-requests`,
      note: "طاولات طلبت الحساب",
    },
  ];

  return (
    <div className="space-y-5 text-[#FFF8F0]">
      <section className="rounded-[30px] border border-[#4A3425] bg-gradient-to-l from-[#241B16] to-[#1C1612] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.30)]">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-[#C68A3D]/35 bg-[#C68A3D]/10 px-4 py-2 text-base font-bold text-[#DEA54B]">
              لوحة إدارة الفرع
            </div>

            <div className="flex items-center gap-4">
              <h1 className="text-5xl font-black leading-tight">{branch.name}</h1>

              <BranchActionsMenu
                branchId={branch.id}
                defaultName={branch.name || ""}
                defaultCity={branch.city || ""}
                updateBranchAction={updateBranchAction}
                deleteBranchAction={deleteBranchAction}
              />
            </div>

            <p className="mt-3 text-lg leading-8 text-[#C8B6A4]">
              {branch.businesses?.name || "النشاط"} · {branch.city || "المدينة غير محددة"}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <InfoPill title="الباقة" value={planName} />
            <InfoPill title="الحالة" value={isTrial ? "تجربة مجانية" : "نشط"} />
            <InfoPill title="تنتهي في" value={endsAt} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[28px] border border-[#4A3425] bg-[#241B16]/95 p-5 shadow-[0_18px_65px_rgba(0,0,0,0.25)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black">إعداد الفرع</h2>
              <p className="mt-1 text-base text-[#C8B6A4]">
                جهّز المنيو والطاولات قبل التشغيل.
              </p>
            </div>

            <Link
              href={`/branch/${branch.id}/settings`}
              className="rounded-2xl border border-[#4A3425] px-4 py-3 text-base font-black text-[#FFF8F0] transition hover:border-[#C68A3D]"
            >
              الإعدادات
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {setupCards.map((card) => (
              <MiniCard key={card.title} {...card} />
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[#4A3425] bg-[#241B16]/95 p-5 shadow-[0_18px_65px_rgba(0,0,0,0.25)]">
          <div className="mb-5">
            <h2 className="text-3xl font-black">رابط المنيو</h2>
            <p className="mt-1 text-base text-[#C8B6A4]">
              الرابط الخاص بعملاء الفرع.
            </p>
          </div>

          <div className="rounded-3xl border border-[#4A3425] bg-[#1C1612] p-4">
            <p className="text-sm text-[#C8B6A4]">الرابط</p>
            <div
              className="mt-2 break-all rounded-2xl border border-[#C68A3D]/25 bg-[#120D0A] px-4 py-4 text-left text-lg font-black text-[#DEA54B]"
              dir="ltr"
            >
              {getMenuUrl(branch)}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link
              href={getMenuUrl(branch)}
              className="rounded-2xl bg-[#C68A3D] px-5 py-4 text-center text-lg font-black text-[#16110E] transition hover:bg-[#DEA54B]"
            >
              عرض المنيو
            </Link>

            <Link
              href={`/branch/${branch.id}/tables`}
              className="rounded-2xl border border-[#4A3425] px-5 py-4 text-center text-lg font-black text-[#FFF8F0] transition hover:border-[#C68A3D]"
            >
              طباعة QR
            </Link>

            <Link
              href={`/branch/${branch.id}/qr`}
              className="rounded-2xl border border-[#4A3425] px-5 py-4 text-center text-lg font-black text-[#FFF8F0] transition hover:border-[#C68A3D]"
            >
              QR الفرع
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#4A3425] bg-[#241B16]/95 p-5 shadow-[0_18px_65px_rgba(0,0,0,0.25)]">
        <div className="mb-5">
          <h2 className="text-3xl font-black">التشغيل اليومي</h2>
          <p className="mt-1 text-base text-[#C8B6A4]">
            اختصارات العمل داخل الفرع.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {operationCards.map((card) => (
            <MiniCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-5">
        <ActionCard
          title="المطبخ"
          text="متابعة الطلبات وتحويل حالتها."
          href={`/branch/${branch.id}/kitchen`}
        />
        <ActionCard
          title="الكاشير"
          text="متابعة الجاهز والفواتير."
          href={`/branch/${branch.id}/cashier`}
        />
        <ActionCard
          title="الإحصائيات"
          text="قراءة أداء الفرع."
          href={`/branch/${branch.id}/stats`}
        />
        <ActionCard
          title="التقييمات"
          text="إدارة آراء العملاء."
          href={`/branch/${branch.id}/reviews`}
        />
        <ActionCard
          title="الموظفين"
          text="إدارة صلاحيات الفريق."
          href={`/branch/${branch.id}/staff`}
        />
      </section>
    </div>
  );
}

function InfoPill({ title, value }: { title: string; value: string }) {
  return (
    <div className="min-w-[150px] rounded-2xl border border-[#4A3425] bg-[#2A211C] px-4 py-3">
      <p className="text-sm text-[#C8B6A4]">{title}</p>
      <p className="mt-1 text-lg font-black text-[#DEA54B]">{value}</p>
    </div>
  );
}

function MiniCard({
  title,
  value,
  note,
  href,
}: {
  title: string;
  value: number;
  note: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-[#4A3425] bg-[#2A211C] p-5 transition hover:border-[#C68A3D] hover:bg-[#2f241e]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black text-[#FFF8F0]">{title}</p>
          <p className="mt-3 text-5xl font-black text-[#FFF8F0]">{value}</p>
        </div>

        <span className="rounded-2xl border border-[#C68A3D]/25 bg-[#C68A3D]/10 px-3 py-2 text-sm font-black text-[#DEA54B]">
          فتح
        </span>
      </div>

      <p className="mt-4 text-base text-[#C8B6A4]">{note}</p>
    </Link>
  );
}

function ActionCard({
  title,
  text,
  href,
}: {
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[26px] border border-[#4A3425] bg-[#241B16] p-5 transition hover:border-[#C68A3D] hover:bg-[#2A211C]"
    >
      <h3 className="text-2xl font-black text-[#FFF8F0]">{title}</h3>
      <p className="mt-2 min-h-12 text-base leading-7 text-[#C8B6A4]">{text}</p>
      <div className="mt-4 text-base font-black text-[#DEA54B]">فتح الصفحة ←</div>
    </Link>
  );
}
