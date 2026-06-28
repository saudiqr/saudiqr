"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Feature = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  active: boolean;
  sort_order: number;
};

type BillingCycle = "monthly" | "yearly";

export default function CustomPlanPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([
    "orders",
    "waiter_calls",
    "bill_requests",
  ]);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadFeatures() {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("custom_plan_features")
        .select("id,key,name,description,monthly_price,yearly_price,active,sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true });

      setLoading(false);

      if (error) {
        setMessage("تعذر تحميل مميزات الباقة: " + error.message);
        return;
      }

      setFeatures((data || []) as Feature[]);
    }

    loadFeatures();
  }, []);

  function toggleFeature(key: string) {
    setSelectedKeys((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key);
      }

      return [...current, key];
    });
  }

  const selectedFeatures = useMemo(() => {
    return features.filter((feature) => selectedKeys.includes(feature.key));
  }, [features, selectedKeys]);

  const monthlyTotal = useMemo(() => {
    return selectedFeatures.reduce(
      (total, feature) => total + Number(feature.monthly_price || 0),
      0
    );
  }, [selectedFeatures]);

  const yearlyTotal = useMemo(() => {
    return selectedFeatures.reduce(
      (total, feature) => total + Number(feature.yearly_price || 0),
      0
    );
  }, [selectedFeatures]);

  const displayedTotal = billingCycle === "monthly" ? monthlyTotal : yearlyTotal;
  const displayedLabel = billingCycle === "monthly" ? "شهري" : "سنوي";

  return (
    <main dir="rtl" className="min-h-screen bg-[#06140f] px-4 py-10 text-white">
      <section className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_380px]">
        <div className="rounded-[32px] border border-emerald-500/20 bg-[#0b1c15] p-8 shadow-2xl">
          <div className="mb-8">
            <div className="mb-4 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
              بناء الباقة
            </div>

            <h1 className="text-4xl font-black">
              اختر المميزات التي يحتاجها مطعمك
            </h1>

            <p className="mt-3 max-w-2xl leading-8 text-emerald-100/70">
              العميل يحدد احتياجه، والسعر يظهر مباشرة حسب الاختيارات.
            </p>
          </div>

          <div className="mb-7 grid grid-cols-2 rounded-3xl bg-[#06140f] p-1">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-2xl px-5 py-3 font-black transition ${
                billingCycle === "monthly"
                  ? "bg-emerald-500 text-[#06140f]"
                  : "text-emerald-100/70"
              }`}
            >
              شهري
            </button>

            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`rounded-2xl px-5 py-3 font-black transition ${
                billingCycle === "yearly"
                  ? "bg-emerald-500 text-[#06140f]"
                  : "text-emerald-100/70"
              }`}
            >
              سنوي
            </button>
          </div>

          {message && (
            <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {message}
            </div>
          )}

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              جاري تحميل المميزات...
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {features.map((feature) => {
                const checked = selectedKeys.includes(feature.key);
                const price =
                  billingCycle === "monthly"
                    ? feature.monthly_price
                    : feature.yearly_price;

                return (
                  <label
                    key={feature.id}
                    className={`cursor-pointer rounded-3xl border p-5 transition ${
                      checked
                        ? "border-emerald-400 bg-emerald-400/10"
                        : "border-white/10 bg-white/5 hover:border-emerald-400/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFeature(feature.key)}
                        className="mt-1 h-5 w-5 accent-emerald-500"
                      />

                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-lg font-black">{feature.name}</h3>
                          <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-black text-emerald-300">
                            {Number(price || 0)} ريال
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-7 text-white/55">
                          {feature.description || "ميزة ضمن SaudiQR"}
                        </p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <aside className="h-fit rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-[#0b241b] to-[#071912] p-8 shadow-2xl">
          <h2 className="text-3xl font-black">ملخص الباقة</h2>

          <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-black/20 p-6 text-center">
            <p className="text-sm text-white/60">الإجمالي</p>
            <div className="mt-2 text-5xl font-black text-emerald-300">
              {displayedTotal}
            </div>
            <p className="mt-2 text-sm text-white/60">ريال / {displayedLabel}</p>
          </div>

          <div className="mt-6 space-y-3">
            {selectedFeatures.length === 0 ? (
              <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
                لم يتم اختيار أي ميزة.
              </div>
            ) : (
              selectedFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <span className="font-bold">{feature.name}</span>
                  <span className="text-sm text-emerald-300">
                    {billingCycle === "monthly"
                      ? feature.monthly_price
                      : feature.yearly_price}{" "}
                    ريال
                  </span>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            className="mt-7 w-full rounded-2xl bg-emerald-500 px-5 py-4 font-black text-[#06140f] transition hover:bg-emerald-400"
          >
            اعتماد هذه الباقة
          </button>

          <p className="mt-4 text-center text-xs leading-6 text-white/45">
            زر الاعتماد جاهز للربط لاحقًا مع الدفع وإنشاء الاشتراك.
          </p>
        </aside>
      </section>
    </main>
  );
}
