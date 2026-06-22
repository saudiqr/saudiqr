import { supabase } from "@/lib/supabase";
import Link from "next/link";
import BranchPageHeader from "@/components/BranchPageHeader";
import BranchLayout from "@/components/BranchLayout";
import type { ReactNode } from "react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export default async function BranchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: branch } = await supabase
    .from("branches")
    .select("*")
    .eq("id", id)
    .single();

  if (!branch) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#06140f] p-10 text-white">
        الفرع غير موجود
      </main>
    );
  }

  const [
    { count: ordersCount },
    { count: waiterCallsCount },
    { count: billRequestsCount },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("branch_id", id),

    supabase
      .from("waiter_calls")
      .select("*", { count: "exact", head: true })
      .eq("branch_id", id),

    supabase
      .from("bill_requests")
      .select("*", { count: "exact", head: true })
      .eq("branch_id", id),
  ]);

  return (
    <BranchLayout branchId={id}>
      <section className="min-h-screen bg-[#10b981] px-4 py-8 text-[#111827] md:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <BranchPageHeader
            title={branch.name}
            description={branch.city || "إدارة الفرع"}
            branchId={id}
          />

          <section className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="إجمالي الطلبات"
              value={ordersCount || 0}
              icon="🧾"
            />
            <StatCard
              title="طلبات النادل"
              value={waiterCallsCount || 0}
              icon="🛎️"
            />
            <StatCard
              title="طلبات الفاتورة"
              value={billRequestsCount || 0}
              icon="💳"
            />
          </section>

          <section className="rounded-[2rem] border border-white/20 bg-[#06140f] p-6 text-white shadow-2xl">
            <h2 className="mb-5 text-xl font-black">إدارة بيانات الفرع</h2>

            <form
              action={updateBranchAction}
              className="grid gap-4 md:grid-cols-3"
            >
              <input type="hidden" name="branchId" value={id} />

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-300">
                  اسم الفرع
                </label>
                <input
                  name="name"
                  defaultValue={branch.name || ""}
                  className="w-full rounded-2xl border border-emerald-500/30 bg-[#07130f] px-4 py-4 font-bold text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-300">
                  المدينة
                </label>
                <input
                  name="city"
                  defaultValue={branch.city || ""}
                  className="w-full rounded-2xl border border-emerald-500/30 bg-[#07130f] px-4 py-4 font-bold text-white outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-emerald-500 px-5 py-4 font-black text-black transition hover:bg-emerald-400"
                >
                  حفظ التعديل
                </button>
              </div>
            </form>

            <form action={deleteBranchAction} className="mt-5">
              <input type="hidden" name="branchId" value={id} />

              <button
                type="submit"
                className="rounded-2xl bg-red-500 px-5 py-4 font-black text-white transition hover:bg-red-600"
              >
                حذف الفرع
              </button>
            </form>
          </section>

          <DashboardSection title="التشغيل اليومي">
            <DashboardLink href={`/branch/${id}/orders`} icon="📦" title="الطلبات" />
            <DashboardLink href={`/branch/${id}/kitchen`} icon="👨‍🍳" title="شاشة المطبخ" />
            <DashboardLink href={`/branch/${id}/cashier`} icon="💰" title="شاشة الكاشير" />
            <DashboardLink href={`/branch/${id}/waiter-calls`} icon="🛎️" title="طلبات النادل" />
            <DashboardLink href={`/branch/${id}/bill-requests`} icon="💳" title="طلبات الفاتورة" />
            <DashboardLink href={`/branch/${id}/tables`} icon="🪑" title="إدارة الطاولات" />
          </DashboardSection>

          <DashboardSection title="إدارة المنيو">
            <DashboardLink href={`/branch/${id}/categories`} icon="📂" title="إدارة الأقسام" />
            <DashboardLink href={`/branch/${id}/products`} icon="☕" title="إدارة المنتجات" />
            <DashboardLink href={`/menu/${branch.slug}`} icon="📱" title="عرض المنيو" />
            <DashboardLink href={`/branch/${id}/qr`} icon="🔳" title="QR" />
          </DashboardSection>

          <DashboardSection title="الإدارة">
            <DashboardLink href={`/branch/${id}/stats`} icon="📊" title="الإحصائيات" />
            <DashboardLink href={`/branch/${id}/reviews`} icon="⭐" title="التقييمات" />
            <DashboardLink href={`/branch/${id}/settings`} icon="⚙️" title="الإعدادات" />
          </DashboardSection>
        </div>
      </section>
    </BranchLayout>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-3xl border border-white/20 bg-[#06140f] p-6 text-white shadow-2xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-300">{title}</p>
          <p className="mt-2 text-4xl font-black">{value}</p>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-3xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function DashboardSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/20 bg-[#06140f] p-5 text-white shadow-2xl">
      <h2 className="mb-5 text-xl font-black">{title}</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

function DashboardLink({
  href,
  title,
  icon,
}: {
  href: string;
  title: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-emerald-500/25 bg-[#0b1f19] p-6 transition hover:-translate-y-1 hover:border-emerald-500 hover:bg-[#0f2a22]"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-2xl">
        {icon}
      </div>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-black">{title}</h3>
        <span className="text-gray-500 transition group-hover:text-white">
          ←
        </span>
      </div>
    </Link>
  );
}