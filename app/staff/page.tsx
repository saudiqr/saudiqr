import { headers } from "next/headers";
import StaffLoginForm from "@/components/staff/StaffLoginForm";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StaffPageProps = {
  searchParams: Promise<{
    branch_id?: string;
    branch?: string;
  }>;
};

function extractSubdomain(host: string | null) {
  if (!host) return null;

  const cleanHost = host.split(":")[0];

  if (
    cleanHost === "localhost" ||
    cleanHost === "127.0.0.1" ||
    cleanHost === "karz.sa" ||
    cleanHost === "www.karz.sa"
  ) {
    return null;
  }

  if (cleanHost.endsWith(".karz.sa")) {
    return cleanHost.replace(".karz.sa", "").split(".")[0] || null;
  }

  return null;
}

async function resolveBranch({
  branchId,
  branchSlug,
  subdomain,
}: {
  branchId?: string;
  branchSlug?: string;
  subdomain: string | null;
}) {
  if (branchId) {
    const { data } = await supabaseAdmin
      .from("branches")
      .select("id, name, business_id, slug")
      .eq("id", branchId)
      .single();

    return data;
  }

  const lookupSlug = branchSlug || subdomain;
  if (!lookupSlug) return null;

  const { data } = await supabaseAdmin
    .from("branches")
    .select("id, name, business_id, slug")
    .eq("slug", lookupSlug)
    .single();

  return data;
}

export default async function StaffPage({ searchParams }: StaffPageProps) {
  const params = await searchParams;
  const headersList = await headers();
  const host = headersList.get("host");
  const subdomain = extractSubdomain(host);

  const branch = await resolveBranch({
    branchId: params.branch_id,
    branchSlug: params.branch,
    subdomain,
  });

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#100b07] text-white"
      style={{
        background:
          "radial-gradient(circle at top right, rgba(216,163,66,.18), transparent 34%), linear-gradient(135deg, #100b07, #1b120c 55%, #0b0705)",
      }}
    >
      <div className="mx-auto grid min-h-screen max-w-6xl place-items-center px-5 py-10">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1fr_440px]">
          <section className="hidden lg:block">
            <p className="text-sm font-black text-[#d8a342]">KARZ TECH</p>

            <h2 className="mt-4 text-6xl font-black leading-tight text-[#fff7ed]">
              دخول سريع وآمن لفريق المطعم
            </h2>

            <p className="mt-6 max-w-2xl text-lg font-bold leading-9 text-[#bfa789]">
              كل موظف يدخل بكود خاص و PIN. الجلسة القديمة تُلغى تلقائيًا عند
              الدخول من جهاز جديد، والصلاحيات تحدد الصفحة التي تظهر له.
            </p>

            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              {["جلسة واحدة", "PIN مشفر", "صلاحيات حسب الدور"].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[#6b4a25] bg-[#1b120c]/80 p-4 text-center text-sm font-black text-[#f5d18a]"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <StaffLoginForm
            branchId={branch?.id || null}
            branchName={branch?.name || "فرع غير محدد"}
            subdomain={subdomain}
          />
        </div>
      </div>
    </main>
  );
}
