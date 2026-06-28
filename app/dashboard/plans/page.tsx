"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number | null;
  max_branches: number;
  active: boolean;
  sort_order: number;
  created_at?: string;
};

type PlanForm = {
  name: string;
  description: string;
  monthly_price: string;
  yearly_price: string;
  max_branches: string;
  active: boolean;
  sort_order: string;
};

const emptyForm: PlanForm = {
  name: "",
  description: "",
  monthly_price: "",
  yearly_price: "",
  max_branches: "1",
  active: true,
  sort_order: "1",
};

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return `${Number(value).toLocaleString("ar-SA")} ريال`;
}

function toForm(plan: Plan): PlanForm {
  return {
    name: plan.name ?? "",
    description: plan.description ?? "",
    monthly_price: String(plan.monthly_price ?? ""),
    yearly_price: plan.yearly_price === null || plan.yearly_price === undefined ? "" : String(plan.yearly_price),
    max_branches: String(plan.max_branches ?? 1),
    active: Boolean(plan.active),
    sort_order: String(plan.sort_order ?? 1),
  };
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  const isEditing = useMemo(() => Boolean(editingPlanId), [editingPlanId]);

  async function fetchPlans() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("plans")
      .select("id,name,description,monthly_price,yearly_price,max_branches,active,sort_order,created_at")
      .order("sort_order", { ascending: true })
      .order("monthly_price", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setPlans([]);
    } else {
      setPlans((data ?? []) as Plan[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchPlans();
  }, []);

  function updateForm<K extends keyof PlanForm>(key: K, value: PlanForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingPlanId(null);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function validateForm() {
    if (!form.name.trim()) return "اسم الباقة مطلوب";
    if (!form.monthly_price.trim()) return "السعر الشهري مطلوب";
    if (Number.isNaN(Number(form.monthly_price)) || Number(form.monthly_price) < 0) {
      return "السعر الشهري غير صحيح";
    }
    if (form.yearly_price.trim() && (Number.isNaN(Number(form.yearly_price)) || Number(form.yearly_price) < 0)) {
      return "السعر السنوي غير صحيح";
    }
    if (!form.max_branches.trim() || Number.isNaN(Number(form.max_branches)) || Number(form.max_branches) < 1) {
      return "عدد الفروع يجب أن يكون 1 أو أكثر";
    }
    if (!form.sort_order.trim() || Number.isNaN(Number(form.sort_order))) {
      return "ترتيب العرض غير صحيح";
    }
    return "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      monthly_price: Number(form.monthly_price),
      yearly_price: form.yearly_price.trim() ? Number(form.yearly_price) : null,
      max_branches: Number(form.max_branches),
      active: form.active,
      sort_order: Number(form.sort_order),
    };

    const result = editingPlanId
      ? await supabase.from("plans").update(payload).eq("id", editingPlanId)
      : await supabase.from("plans").insert(payload);

    if (result.error) {
      setErrorMessage(result.error.message);
    } else {
      setSuccessMessage(editingPlanId ? "تم تعديل الباقة بنجاح" : "تمت إضافة الباقة بنجاح");
      resetForm();
      await fetchPlans();
    }

    setSaving(false);
  }

  function startEdit(plan: Plan) {
    setEditingPlanId(plan.id);
    setForm(toForm(plan));
    setErrorMessage("");
    setSuccessMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function togglePlan(plan: Plan) {
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("plans")
      .update({ active: !plan.active })
      .eq("id", plan.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(plan.active ? "تم تعطيل الباقة" : "تم تفعيل الباقة");
    await fetchPlans();
  }

  async function deletePlan(planId: string) {
    const confirmDelete = window.confirm("هل أنت متأكد من حذف الباقة؟ الأفضل غالبًا تعطيلها بدل حذفها إذا عليها اشتراكات.");
    if (!confirmDelete) return;

    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase.from("plans").delete().eq("id", planId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("تم حذف الباقة");
    await fetchPlans();
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#06140f] p-8 text-white">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">إدارة الباقات</h1>
          <p className="mt-2 text-sm text-gray-300">
            إنشاء وتعديل الباقات التي تظهر في نظام الاشتراكات.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="rounded-2xl border border-white/20 px-5 py-3 text-sm hover:bg-white/10"
        >
          رجوع للداش بورد
        </Link>
      </div>

      <section className="mb-8 rounded-3xl border border-emerald-500/30 bg-white/10 p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{isEditing ? "تعديل باقة" : "إضافة باقة جديدة"}</h2>
            <p className="mt-1 text-sm text-gray-300">
              خلي الحذف آخر خيار. التعطيل أفضل إذا الباقة مرتبطة باشتراكات قديمة.
            </p>
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
            >
              إلغاء التعديل
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-5 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-sm text-gray-300">اسم الباقة</span>
            <input
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#0b1f17] px-4 py-3 outline-none focus:border-emerald-400"
              placeholder="مثال: Pro"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-gray-300">السعر الشهري</span>
            <input
              value={form.monthly_price}
              onChange={(event) => updateForm("monthly_price", event.target.value)}
              type="number"
              min="0"
              className="w-full rounded-2xl border border-white/10 bg-[#0b1f17] px-4 py-3 outline-none focus:border-emerald-400"
              placeholder="99"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-gray-300">السعر السنوي</span>
            <input
              value={form.yearly_price}
              onChange={(event) => updateForm("yearly_price", event.target.value)}
              type="number"
              min="0"
              className="w-full rounded-2xl border border-white/10 bg-[#0b1f17] px-4 py-3 outline-none focus:border-emerald-400"
              placeholder="990"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-gray-300">عدد الفروع المسموح</span>
            <input
              value={form.max_branches}
              onChange={(event) => updateForm("max_branches", event.target.value)}
              type="number"
              min="1"
              className="w-full rounded-2xl border border-white/10 bg-[#0b1f17] px-4 py-3 outline-none focus:border-emerald-400"
              placeholder="1"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm text-gray-300">وصف الباقة</span>
            <textarea
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              rows={4}
              className="w-full resize-none rounded-2xl border border-white/10 bg-[#0b1f17] px-4 py-3 outline-none focus:border-emerald-400"
              placeholder="وصف مختصر للباقة"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-gray-300">ترتيب العرض</span>
            <input
              value={form.sort_order}
              onChange={(event) => updateForm("sort_order", event.target.value)}
              type="number"
              className="w-full rounded-2xl border border-white/10 bg-[#0b1f17] px-4 py-3 outline-none focus:border-emerald-400"
              placeholder="1"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1f17] px-4 py-3">
            <input
              checked={form.active}
              onChange={(event) => updateForm("active", event.target.checked)}
              type="checkbox"
              className="h-5 w-5 accent-emerald-500"
            />
            <span>الباقة فعالة</span>
          </label>

          <div className="flex items-end gap-3 md:col-span-2 xl:col-span-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-emerald-500 px-7 py-3 font-bold text-[#06140f] hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "جاري الحفظ..." : isEditing ? "حفظ التعديل" : "+ إضافة الباقة"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-white/20 px-7 py-3 hover:bg-white/10"
            >
              تفريغ الحقول
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-emerald-500/30 bg-white/10 p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">الباقات الحالية</h2>
          <span className="rounded-full bg-[#0b1f17] px-4 py-2 text-sm text-gray-300">
            العدد: {plans.length}
          </span>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-[#0b1f17] p-8 text-center text-gray-300">
            جاري تحميل الباقات...
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#0b1f17] p-8 text-center text-gray-300">
            لا توجد باقات حتى الآن.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={`rounded-3xl border p-6 ${
                  plan.active
                    ? "border-emerald-500/40 bg-[#0b1f17]"
                    : "border-white/10 bg-[#0b1f17]/60 opacity-70"
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <p className="mt-2 min-h-10 text-sm text-gray-300">
                      {plan.description || "لا يوجد وصف"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      plan.active
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-red-500/15 text-red-300"
                    }`}
                  >
                    {plan.active ? "فعالة" : "معطلة"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-gray-400">شهري</p>
                    <p className="mt-1 font-bold text-emerald-300">{formatPrice(plan.monthly_price)}</p>
                  </div>

                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-gray-400">سنوي</p>
                    <p className="mt-1 font-bold text-emerald-300">{formatPrice(plan.yearly_price)}</p>
                  </div>

                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-gray-400">الفروع</p>
                    <p className="mt-1 font-bold">{plan.max_branches}</p>
                  </div>

                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-gray-400">الترتيب</p>
                    <p className="mt-1 font-bold">{plan.sort_order}</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => startEdit(plan)}
                    className="rounded-xl border border-white/20 py-2 text-sm hover:bg-white/10"
                  >
                    تعديل
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePlan(plan)}
                    className="rounded-xl border border-yellow-400/40 py-2 text-sm text-yellow-200 hover:bg-yellow-500/10"
                  >
                    {plan.active ? "تعطيل" : "تفعيل"}
                  </button>

                  <button
                    type="button"
                    onClick={() => deletePlan(plan.id)}
                    className="rounded-xl border border-red-400/40 py-2 text-sm text-red-300 hover:bg-red-500/10"
                  >
                    حذف
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
