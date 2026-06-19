import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function DashboardPage() {
  const { data: businesses, error } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      created_at,
      branches (
        id,
        name,
        city,
        subscription_status
      )
    `)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#06140f] text-white" dir="rtl">
      <header className="border-b border-white/10 px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">لوحة تحكم SaudiQR</h1>
            <p className="text-sm text-gray-400">
              إدارة النشاطات التجارية والفروع والمنيو والـ QR
            </p>
          </div>

          <button className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black">
            تسجيل خروج
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-black">نشاطاتي التجارية</h2>

          <Link
            href="/business/new"
            className="rounded-2xl bg-emerald-500 px-6 py-4 font-black text-black"
          >
            + إنشاء نشاط جديد
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            حدث خطأ أثناء جلب البيانات: {error.message}
          </div>
        )}

        {!businesses || businesses.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <h3 className="text-2xl font-black">لا يوجد نشاط تجاري حتى الآن</h3>
            <p className="mt-3 text-gray-400">
              أنشئ أول نشاط تجاري ثم أضف الفروع والمنيو.
            </p>

            <Link
              href="/business/new"
              className="mt-6 inline-block rounded-2xl bg-emerald-500 px-6 py-4 font-black text-black"
            >
              إنشاء نشاط جديد
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {businesses.map((business) => (
              <div
                key={business.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black">{business.name}</h3>
                    <p className="mt-2 text-sm text-gray-400">
                      عدد الفروع: {business.branches?.length || 0}
                    </p>
                  </div>

                  <Link
                    href={`/branch/new?business_id=${business.id}`}
                    className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-black"
                  >
                    + إضافة فرع
                  </Link>
                </div>

                <div className="mt-6 space-y-3">
                  {business.branches && business.branches.length > 0 ? (
                    business.branches.map((branch) => (
                      <div
                        key={branch.id}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <div>
                          <p className="font-bold">{branch.name}</p>
                          <p className="mt-1 text-sm text-gray-400">
                            {branch.city || "بدون مدينة"} • الاشتراك:{" "}
                            {branch.subscription_status || "inactive"}
                          </p>
                        </div>

                        <Link
                          href={`/branch/${branch.id}`}
                          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold"
                        >
                          إدارة
                        </Link>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                      لا توجد فروع لهذا النشاط بعد.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}