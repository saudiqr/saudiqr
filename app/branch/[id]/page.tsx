import { supabase } from "@/lib/supabase";
import Link from "next/link";

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
      <div className="p-10 text-white">
        الفرع غير موجود
      </div>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#06140f] px-6 py-10 text-white"
    >
      <div className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-black">
          {branch.name}
        </h1>

        <p className="mt-3 text-gray-400">
          {branch.city}
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-5">

          <Link
            href={`/branch/${id}/categories`}
            className="rounded-3xl bg-white/5 p-6 text-center hover:bg-white/10"
          >
            إدارة الأقسام
          </Link>

          <Link
            href={`/branch/${id}/products`}
            className="rounded-3xl bg-white/5 p-6 text-center hover:bg-white/10"
          >
            إدارة المنتجات
          </Link>

          <Link
            href={`/menu/${branch.slug}`}
            className="rounded-3xl bg-white/5 p-6 text-center hover:bg-white/10"
          >
            عرض المنيو
          </Link>

          <Link
            href={`/branch/${id}/qr`}
            className="rounded-3xl bg-white/5 p-6 text-center hover:bg-white/10"
          >
            QR
          </Link>

          <Link
  href={`/branch/${id}/tables`}
  className="rounded-3xl bg-white/5 p-6 text-center hover:bg-white/10"
>
  إدارة الطاولات
</Link>

<Link
  href={`/branch/${id}/orders`}
  className="rounded-3xl bg-white/5 p-6 text-center hover:bg-white/10"
>
  الطلبات
</Link>
<Link
  href={`/branch/${id}/kitchen`}
  className="rounded-3xl bg-white/5 p-6 text-center hover:bg-white/10"
>
  شاشة المطبخ
</Link>
<Link
  href={`/branch/${id}/cashier`}
  className="rounded-3xl bg-white/5 p-6 text-center hover:bg-white/10"
>
  شاشة الكاشير
</Link>
<Link
  href={`/branch/${id}/stats`}
  className="rounded-3xl bg-white/5 p-6 text-center hover:bg-white/10"
>
  الإحصائيات
</Link>
<Link
  href={`/branch/${id}/settings`}
  className="rounded-3xl bg-white/5 p-6 text-center hover:bg-white/10"
>
  الإعدادات
</Link>
<Link
  href={`/branch/${id}/reviews`}
  className="rounded-3xl border border-white/10 bg-white/5 p-6 font-black hover:bg-white/10"
>
  ⭐ التقييمات
</Link>
        </div>
      </div>
    </main>
  );
}