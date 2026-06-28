import DashboardSidebar from "@/components/DashboardSidebar";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type SubscriptionWithPlan = {
  id: string;
  status: string;
  ends_at: string | null;
  plans: { name: string } | { name: string }[] | null;
};

type BusinessLicense = {
  status: string;
  license_type: string | null;
  ends_at: string | null;
};

function getPlanName(plans: SubscriptionWithPlan["plans"]) {
  if (!plans) return "غير محددة";
  if (Array.isArray(plans)) return plans[0]?.name || "غير محددة";
  return plans.name || "غير محددة";
}

function formatDate(value: string | null) {
  if (!value) return "غير محدد";
  return new Date(value).toLocaleDateString("ar-SA");
}

export default async function BranchLayout({
  branchId,
  children,
}: {
  branchId: string;
  children: React.ReactNode;
}) {
  const { data: branch } = await supabase
    .from("branches")
    .select("id, name, business_id")
    .eq("id", branchId)
    .single();

  let subscriptionIsActive = false;
  let subscriptionLabel = "غير مفعل";
  let planName = "غير محددة";
  let endsAtText = "غير محدد";

  if (branch?.business_id) {
    const nowIso = new Date().toISOString();

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select(`
        id,
        status,
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
      .maybeSingle<SubscriptionWithPlan>();

    const { data: businessLicense } = await supabase
      .from("business_license")
      .select("status, license_type, ends_at")
      .eq("business_id", branch.business_id)
      .eq("status", "active")
      .gt("ends_at", nowIso)
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle<BusinessLicense>();

    if (subscription || businessLicense) {
      subscriptionIsActive = true;

      const status = subscription?.status || businessLicense?.license_type || "active";

      subscriptionLabel = status === "trial" ? "تجربة مجانية" : "نشط";
      planName = subscription ? getPlanName(subscription.plans) : "تجربة مجانية";
      endsAtText = formatDate(subscription?.ends_at || businessLicense?.ends_at || null);
    }
  }

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        background: "#16110E",
        color: "#FFF8F0",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px minmax(0, 1fr)",
          minHeight: "100vh",
          width: "100%",
          maxWidth: "100%",
        }}
      >
        <aside
          style={{
            minHeight: "100vh",
            background: "#1C1612",
            borderLeft: "1px solid #4A3425",
          }}
        >
          <DashboardSidebar firstBranchId={branchId} />
        </aside>

        <section
          style={{
            minWidth: 0,
            minHeight: "100vh",
            overflowX: "hidden",
            background:
              "radial-gradient(circle at top, #2A211C 0%, #16110E 42%, #120D0A 100%)",
            padding: "32px",
            color: "#FFF8F0",
            boxSizing: "border-box",
          }}
        >
          {!branch ? (
            <div className="rounded-[2rem] border border-[#4A3425] bg-[#241B16] p-8 text-[#FFF8F0] shadow-2xl">
              <h1 className="text-3xl font-black">الفرع غير موجود</h1>

              <Link
                href="/dashboard"
                className="mt-6 inline-flex rounded-2xl bg-[#C68A3D] px-6 py-4 font-black text-[#16110E] transition hover:bg-[#DEA54B]"
              >
                العودة للوحة التحكم
              </Link>
            </div>
          ) : !subscriptionIsActive ? (
            <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
              <div className="w-full max-w-2xl rounded-[2rem] border border-[#D95C5C]/35 bg-[#241B16]/95 p-8 text-center text-[#FFF8F0] shadow-[0_26px_90px_rgba(0,0,0,0.38)]">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-[#D95C5C]/35 bg-[#D95C5C]/10 text-4xl">
                  🔒
                </div>

                <h1 className="text-3xl font-black text-[#FFF8F0]">
                  الاشتراك غير نشط
                </h1>

                <p className="mt-4 leading-8 text-[#C8B6A4]">
                  لا يمكن الدخول إلى هذا الفرع حالياً لأن اشتراك النشاط منتهي أو
                  غير مفعل.
                </p>

                <div className="mt-6 rounded-2xl border border-[#4A3425] bg-[#2A211C] p-5 text-right">
                  <p className="font-bold text-[#C8B6A4]">
                    حالة الاشتراك:{" "}
                    <span className="text-[#D95C5C]">{subscriptionLabel}</span>
                  </p>

                  <p className="mt-2 font-bold text-[#C8B6A4]">
                    الباقة: <span className="text-[#FFF8F0]">{planName}</span>
                  </p>

                  <p className="mt-2 font-bold text-[#C8B6A4]">
                    تاريخ الانتهاء:{" "}
                    <span className="text-[#FFF8F0]">{endsAtText}</span>
                  </p>
                </div>

                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    href="/dashboard"
                    className="rounded-2xl bg-[#C68A3D] px-6 py-4 font-black text-[#16110E] transition hover:bg-[#DEA54B]"
                  >
                    العودة للوحة التحكم
                  </Link>

                  <Link
                    href="/dashboard/subscription"
                    className="rounded-2xl border border-[#4A3425] px-6 py-4 font-black text-[#FFF8F0] transition hover:border-[#C68A3D]"
                  >
                    تجديد الاشتراك
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </section>
      </div>
    </main>
  );
}
