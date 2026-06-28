"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number | null;
  yearly_price: number | null;
  price: number | null;
  sort_order: number | null;
};

type OnboardingResult = {
  business_id?: string;
  branch_id?: string;
};

const TRIAL_DAYS = 7;

const trialFeatures = [
  "menu_qr",
  "orders",
  "kitchen",
  "cashier",
  "waiter_calls",
  "bill_requests",
  "reviews",
  "stats",
];

export default function OnboardingPage() {
  const router = useRouter();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("restaurant");
  const [city, setCity] = useState("");
  const [branchName, setBranchName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(
    null
  );

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const cleanSubdomain = useMemo(() => {
    return subdomain
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
  }, [subdomain]);

  useEffect(() => {
    async function initPage() {
      setPageLoading(true);
      setErrorMessage("");

      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        router.push("/login");
        return;
      }

      const { data: plansData, error: plansError } = await supabase
        .from("plans")
        .select("id,name,description,monthly_price,yearly_price,price,sort_order")
        .or("is_active.eq.true,active.eq.true")
        .order("sort_order", { ascending: true });

      if (plansError) {
        setErrorMessage(plansError.message);
      } else {
        const safePlans = (plansData || []) as Plan[];
        setPlans(safePlans);

        const trialPlan =
          safePlans.find((plan) => plan.name.includes("تجربة")) || safePlans[0];

        if (trialPlan) {
          setSelectedPlanId(trialPlan.id);
        }
      }

      setPageLoading(false);
    }

    initPage();
  }, [router]);

  useEffect(() => {
    async function checkSubdomain() {
      setSubdomainAvailable(null);

      if (cleanSubdomain.length < 3) {
        return;
      }

      setCheckingSubdomain(true);

      const { data, error } = await supabase.rpc("is_subdomain_available", {
        input_subdomain: cleanSubdomain,
      });

      setCheckingSubdomain(false);

      if (error) {
        setSubdomainAvailable(null);
        return;
      }

      setSubdomainAvailable(Boolean(data));
    }

    const timer = setTimeout(checkSubdomain, 500);

    return () => clearTimeout(timer);
  }, [cleanSubdomain]);

  async function createTrialAccess({
    businessId,
    planId,
  }: {
    businessId: string;
    planId: string;
  }) {
    const startsAt = new Date();
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + TRIAL_DAYS);

    const startsAtIso = startsAt.toISOString();
    const endsAtIso = endsAt.toISOString();

    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .insert({
        business_id: businessId,
        plan_id: planId,
        status: "trial",
        starts_at: startsAtIso,
        ends_at: endsAtIso,
        amount: 0,
        currency: "SAR",
        payment_provider: "trial",
        payment_reference: "trial_7_days",
      });

    if (subscriptionError) {
      throw subscriptionError;
    }

    const { error: licenseError } = await supabase
      .from("business_license")
      .insert({
        business_id: businessId,
        license_type: "trial",
        status: "active",
        starts_at: startsAtIso,
        ends_at: endsAtIso,
        auto_renew: false,
      });

    if (licenseError) {
      throw licenseError;
    }

    const featureRows = trialFeatures.map((featureKey) => ({
  business_id: businessId,
  feature_key: featureKey,
  status: "active",
  source: "subscription",
  billing_cycle: "trial",
  started_at: startsAtIso,
  ends_at: endsAtIso,
  auto_renew: false,
}));

    const { error: featuresError } = await supabase
      .from("business_features")
      .insert(featureRows);

    if (featuresError) {
      throw featuresError;
    }
  }

  async function getBusinessIdFromBranch(branchId: string) {
    const { data, error } = await supabase
      .from("branches")
      .select("business_id")
      .eq("id", branchId)
      .single();

    if (error) {
      throw error;
    }

    return data?.business_id as string | undefined;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    const finalBusinessName = businessName.trim();
    const finalCity = city.trim();
    const finalBranchName = branchName.trim() || finalBusinessName;

    if (!finalBusinessName) {
      setErrorMessage("اكتب اسم النشاط.");
      return;
    }

    if (!finalCity) {
      setErrorMessage("اكتب المدينة.");
      return;
    }

    if (!selectedPlanId) {
      setErrorMessage("اختر الباقة.");
      return;
    }

    if (cleanSubdomain.length < 3) {
      setErrorMessage("رابط المطعم لازم يكون 3 أحرف على الأقل.");
      return;
    }

    if (subdomainAvailable === false) {
      setErrorMessage("رابط المطعم مستخدم. اختر رابط آخر.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.rpc("create_onboarding_workspace", {
      p_business_name: finalBusinessName,
      p_business_type: businessType,
      p_city: finalCity,
      p_plan_id: selectedPlanId,
      p_branch_name: finalBranchName,
      p_subdomain: cleanSubdomain,
    });

    if (error) {
      setLoading(false);
      setErrorMessage(error.message || "تعذر إكمال الإعداد.");
      return;
    }

    try {
      const result = Array.isArray(data)
        ? ((data[0] || {}) as OnboardingResult)
        : ((data || {}) as OnboardingResult);

      const branchId = result?.branch_id;
      const businessId =
        result?.business_id ||
        (branchId ? await getBusinessIdFromBranch(branchId) : undefined);

      if (!businessId) {
        throw new Error("تم إنشاء الفرع لكن لم يتم العثور على رقم النشاط.");
      }

      await createTrialAccess({
        businessId,
        planId: selectedPlanId,
      });

      if (branchId) {
        router.push(`/branch/${branchId}`);
        return;
      }

      router.push("/dashboard");
    } catch (trialError) {
      const message =
        trialError instanceof Error
          ? trialError.message
          : "تم إنشاء النشاط لكن تعذر تفعيل التجربة المجانية.";

      setErrorMessage(message);
      setLoading(false);
    }
  }

  if (pageLoading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#16110E] text-[#FFF8F0]"
      >
        <div className="rounded-[28px] border border-[#4A3425] bg-[#241B16] px-8 py-6 text-[#C8B6A4] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          جاري تحميل الإعداد...
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[radial-gradient(circle_at_top,#2A211C_0%,#16110E_42%,#120D0A_100%)] px-5 py-8 text-[#FFF8F0]"
    >
      <section className="mx-auto grid w-full max-w-6xl gap-7 lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="rounded-[32px] border border-[#4A3425] bg-gradient-to-br from-[#241B16]/95 to-[#1C1612]/95 p-7 shadow-[0_26px_90px_rgba(0,0,0,0.32)]">
          <div className="mb-8 inline-flex rounded-full border border-[#C68A3D]/35 bg-[#C68A3D]/10 px-4 py-2 text-sm font-bold text-[#DEA54B]">
            Onboarding
          </div>

          <h2 className="text-4xl font-black leading-tight text-[#FFF8F0]">
            جهّز مطعمك
            <span className="block text-[#C68A3D]">في أقل من دقيقة</span>
          </h2>

          <p className="mt-5 text-lg leading-8 text-[#C8B6A4]">
            أدخل بيانات النشاط، اختر الباقة، واحجز رابط المطعم الخاص بك.
          </p>

          <div className="mt-10 rounded-3xl border border-[#4A3425] bg-[#2A211C] p-5">
            <p className="text-sm text-[#C8B6A4]">الرابط النهائي</p>
            <div className="mt-3 break-all rounded-2xl border border-[#C68A3D]/30 bg-[#1C1612] px-4 py-4 text-lg font-black text-[#DEA54B]">
              https://{cleanSubdomain || "restaurant"}.saudiqr.sa
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 text-center text-sm text-[#C8B6A4]">
            <div className="flex aspect-square items-center justify-center rounded-3xl border border-[#4A3425] bg-[#2A211C]/70 p-4 leading-7">
              تجربة مجانية كاملة لمدة 7 أيام.
            </div>
            <div className="flex aspect-square items-center justify-center rounded-3xl border border-[#4A3425] bg-[#2A211C]/70 p-4 leading-7">
              تفعيل المنيو والطلبات والمطبخ والكاشير تلقائيًا.
            </div>
            <div className="flex aspect-square items-center justify-center rounded-3xl border border-[#4A3425] bg-[#2A211C]/70 p-4 leading-7">
              يمكن تعديل الباقة لاحقًا من صفحة الاشتراكات.
            </div>
          </div>
        </aside>

        <form
          onSubmit={handleSubmit}
          className="rounded-[32px] border border-[#4A3425] bg-[#241B16]/95 p-7 shadow-[0_26px_90px_rgba(0,0,0,0.38)]"
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-[#FFF8F0]">
                بيانات البداية
              </h1>
              <p className="mt-2 text-sm leading-7 text-[#C8B6A4]">
                هذه البيانات تفتح أول نشاط وأول فرع وتجربة مجانية 7 أيام.
              </p>
            </div>

            <div className="hidden rounded-2xl border border-[#C68A3D]/30 bg-[#C68A3D]/10 px-4 py-2 text-sm font-bold text-[#DEA54B] sm:block">
              Trial 7 Days
            </div>
          </div>

          {errorMessage && (
            <div className="mb-5 rounded-2xl border border-[#D95C5C]/40 bg-[#D95C5C]/10 px-4 py-3 text-sm leading-7 text-[#D95C5C]">
              {errorMessage}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-[#C8B6A4]">
                اسم النشاط
              </span>
              <input
                value={businessName}
                onChange={(event) => {
                  setBusinessName(event.target.value);
                  if (!branchName) setBranchName(event.target.value);
                }}
                className="w-full rounded-2xl border border-[#4A3425] bg-[#1C1612] px-4 py-3 text-[#FFF8F0] outline-none transition placeholder:text-[#C8B6A4]/45 focus:border-[#C68A3D]"
                placeholder="مثال: مطعم علي"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#C8B6A4]">
                نوع النشاط
              </span>
              <select
                value={businessType}
                onChange={(event) => setBusinessType(event.target.value)}
                className="w-full rounded-2xl border border-[#4A3425] bg-[#1C1612] px-4 py-3 text-[#FFF8F0] outline-none transition focus:border-[#C68A3D]"
              >
                <option value="restaurant">مطعم</option>
                <option value="cafe">كافيه</option>
                <option value="bakery">مخبز / حلويات</option>
                <option value="food_truck">فود ترك</option>
                <option value="other">أخرى</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#C8B6A4]">
                المدينة
              </span>
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="w-full rounded-2xl border border-[#4A3425] bg-[#1C1612] px-4 py-3 text-[#FFF8F0] outline-none transition placeholder:text-[#C8B6A4]/45 focus:border-[#C68A3D]"
                placeholder="مثال: جدة"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-[#C8B6A4]">
                اسم أول فرع
              </span>
              <input
                value={branchName}
                onChange={(event) => setBranchName(event.target.value)}
                className="w-full rounded-2xl border border-[#4A3425] bg-[#1C1612] px-4 py-3 text-[#FFF8F0] outline-none transition placeholder:text-[#C8B6A4]/45 focus:border-[#C68A3D]"
                placeholder="مثال: فرع التحلية"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-[#C8B6A4]">
               رابط دومين المطعم
              </span>
              <div className="flex overflow-hidden rounded-2xl border border-[#4A3425] bg-[#1C1612] transition focus-within:border-[#C68A3D]">
                <input
                  value={subdomain}
                  onChange={(event) => setSubdomain(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-left text-[#FFF8F0] outline-none placeholder:text-[#C8B6A4]/45"
                  placeholder="ali"
                  dir="ltr"
                />
                <span className="border-r border-[#4A3425] px-4 py-3 text-sm text-[#C8B6A4]">
                  .saudiqr.sa
                </span>
              </div>

              <div className="mt-2 min-h-5 text-sm">
                {checkingSubdomain && (
                  <span className="text-[#C8B6A4]">جاري فحص الرابط...</span>
                )}

                {!checkingSubdomain &&
                  cleanSubdomain.length >= 3 &&
                  subdomainAvailable === true && (
                    <span className="text-[#65C466]">الرابط متاح.</span>
                  )}

                {!checkingSubdomain &&
                  cleanSubdomain.length >= 3 &&
                  subdomainAvailable === false && (
                    <span className="text-[#D95C5C]">الرابط مستخدم.</span>
                  )}
              </div>
            </label>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 font-black text-[#FFF8F0]">اختر الباقة</h3>

            <div className="grid gap-3 md:grid-cols-3">
              {plans.length === 0 && (
                <div className="rounded-2xl border border-[#F0A53B]/40 bg-[#F0A53B]/10 p-4 text-sm leading-7 text-[#F0A53B] md:col-span-3">
                  لا توجد باقات مفعلة. فعّل الباقات من لوحة الإدارة.
                </div>
              )}

              {plans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const displayPrice = plan.monthly_price ?? plan.price ?? 0;

                return (
                  <button
                    type="button"
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`rounded-2xl border p-4 text-right transition ${
                      isSelected
                        ? "border-[#C68A3D] bg-[#C68A3D]/12 shadow-[0_0_0_1px_rgba(198,138,61,0.25)]"
                        : "border-[#4A3425] bg-[#2A211C] hover:border-[#C68A3D]/60"
                    }`}
                  >
                    <div className="font-black text-[#FFF8F0]">{plan.name}</div>
                    <div className="mt-1 min-h-10 text-xs leading-5 text-[#C8B6A4]">
                      {plan.description || "باقة SaudiQR"}
                    </div>
                    <div className="mt-3 text-sm font-bold text-[#DEA54B]">
                      {displayPrice} ريال / شهري
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || plans.length === 0}
            className="mt-6 w-full rounded-2xl bg-[#C68A3D] py-4 font-black text-[#16110E] transition hover:bg-[#DEA54B] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "جاري إنشاء النشاط..." : "إنشاء النشاط والفرع"}
          </button>
        </form>


      </section>
    </main>
  );
}
