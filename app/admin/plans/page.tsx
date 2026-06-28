import Link from "next/link";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

type Plan = {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  max_branches: number;
  max_products: number | null;
  allow_orders: boolean;
  allow_kitchen: boolean;
  allow_cashier: boolean;
  allow_stats: boolean;
  active: boolean;
  created_at: string;
  description: string | null;
  sort_order: number | null;
};

async function addPlanAction(formData: FormData) {
  "use server";

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const price = Number(formData.get("price") || 0);
  const durationDays = Number(formData.get("duration_days") || 30);
  const maxBranches = Number(formData.get("max_branches") || 1);
  const maxProductsValue = String(formData.get("max_products") || "").trim();
  const maxProducts = maxProductsValue === "" ? null : Number(maxProductsValue);
  const sortOrder = Number(formData.get("sort_order") || 0);

  const allowOrders = formData.get("allow_orders") === "on";
  const allowKitchen = formData.get("allow_kitchen") === "on";
  const allowCashier = formData.get("allow_cashier") === "on";
  const allowStats = formData.get("allow_stats") === "on";

  if (!name) return;

  await supabase.from("plans").insert({
    name,
    description: description || null,
    price,
    duration_days: durationDays,
    max_branches: maxBranches,
    max_products: maxProducts,
    allow_orders: allowOrders,
    allow_kitchen: allowKitchen,
    allow_cashier: allowCashier,
    allow_stats: allowStats,
    active: true,
    sort_order: sortOrder,
  });

  revalidatePath("/admin/plans");
}

async function updatePlanAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const price = Number(formData.get("price") || 0);
  const durationDays = Number(formData.get("duration_days") || 30);
  const maxBranches = Number(formData.get("max_branches") || 1);
  const maxProductsValue = String(formData.get("max_products") || "").trim();
  const maxProducts = maxProductsValue === "" ? null : Number(maxProductsValue);
  const sortOrder = Number(formData.get("sort_order") || 0);

  const allowOrders = formData.get("allow_orders") === "on";
  const allowKitchen = formData.get("allow_kitchen") === "on";
  const allowCashier = formData.get("allow_cashier") === "on";
  const allowStats = formData.get("allow_stats") === "on";

  if (!id || !name) return;

  await supabase
    .from("plans")
    .update({
      name,
      description: description || null,
      price,
      duration_days: durationDays,
      max_branches: maxBranches,
      max_products: maxProducts,
      allow_orders: allowOrders,
      allow_kitchen: allowKitchen,
      allow_cashier: allowCashier,
      allow_stats: allowStats,
      sort_order: sortOrder,
    })
    .eq("id", id);

  revalidatePath("/admin/plans");
}

async function togglePlanAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const active = String(formData.get("active") || "") === "true";

  if (!id) return;

  await supabase.from("plans").update({ active: !active }).eq("id", id);

  revalidatePath("/admin/plans");
}

async function deletePlanAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");

  if (!id) return;

  await supabase.from("plans").delete().eq("id", id);

  revalidatePath("/admin/plans");
}

export default async function AdminPlansPage() {
  const { data, error } = await supabase
    .from("plans")
    .select(
      "id,name,price,duration_days,max_branches,max_products,allow_orders,allow_kitchen,allow_cashier,allow_stats,active,created_at,description,sort_order"
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const plans = (data || []) as Plan[];

  const activeCount = plans.filter((plan) => plan.active).length;
  const inactiveCount = plans.filter((plan) => !plan.active).length;
  const monthlyCount = plans.filter((plan) => plan.duration_days <= 31).length;
  const yearlyCount = plans.filter((plan) => plan.duration_days >= 365).length;

  return (
    <main dir="rtl" style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>SaudiQR Admin</p>
          <h1 style={heroTitleStyle}>إدارة الباقات</h1>
          <p style={heroTextStyle}>
            إدارة باقات المنصة، الأسعار، مدة الاشتراك، الحدود، والصلاحيات المتاحة لكل باقة.
          </p>
        </div>

      </section>

      <section style={statsGridStyle}>
        <StatCard title="كل الباقات" value={plans.length} />
        <StatCard title="مفعلة" value={activeCount} />
        <StatCard title="معطلة" value={inactiveCount} />
        <StatCard title="شهرية" value={monthlyCount} />
        <StatCard title="سنوية" value={yearlyCount} />
      </section>

      {error ? (
        <div style={errorStyle}>خطأ في جلب الباقات: {error.message}</div>
      ) : null}

      <section style={cardStyle}>
        <div>
          <h2 style={sectionTitleStyle}>إضافة باقة جديدة</h2>
          <p style={sectionSubtitleStyle}>
            هذه الباقات لا تظهر لصاحب المطعم إلا حسب ما تحدده في واجهة الاشتراك لاحقاً.
          </p>
        </div>

        <form action={addPlanAction} style={createFormStyle}>
          <div style={formGridFourStyle}>
            <input name="name" placeholder="اسم الباقة" style={inputStyle} required />

            <input
              name="price"
              placeholder="السعر"
              type="number"
              step="0.01"
              style={inputStyle}
              required
            />

            <input
              name="duration_days"
              placeholder="مدة الاشتراك بالأيام"
              type="number"
              defaultValue={30}
              style={inputStyle}
              required
            />

            <input
              name="sort_order"
              placeholder="ترتيب العرض"
              type="number"
              defaultValue={0}
              style={inputStyle}
            />
          </div>

          <div style={formGridThreeStyle}>
            <input
              name="max_branches"
              placeholder="عدد الفروع"
              type="number"
              defaultValue={1}
              style={inputStyle}
              required
            />

            <input
              name="max_products"
              placeholder="عدد المنتجات، اتركه فارغ = غير محدود"
              type="number"
              style={inputStyle}
            />

            <input name="description" placeholder="وصف الباقة" style={inputStyle} />
          </div>

          <div style={featuresGridStyle}>
            <FeatureCheckbox name="allow_orders" label="الطلبات" defaultChecked />
            <FeatureCheckbox name="allow_kitchen" label="المطبخ" defaultChecked />
            <FeatureCheckbox name="allow_cashier" label="الكاشير" defaultChecked />
            <FeatureCheckbox name="allow_stats" label="الإحصائيات" defaultChecked />
          </div>

          <button style={greenButtonStyle}>+ إضافة باقة</button>
        </form>
      </section>

      {plans.length === 0 && !error ? (
        <section style={emptyStyle}>لا توجد باقات حتى الآن.</section>
      ) : (
        <section style={plansGridStyle}>
          {plans.map((plan) => (
            <article key={plan.id} style={planCardStyle}>
              <form action={updatePlanAction} style={editFormStyle}>
                <input type="hidden" name="id" value={plan.id} />

                <div style={cardHeaderStyle}>
                  <div style={{ width: "100%" }}>
                    <input
                      name="name"
                      defaultValue={plan.name}
                      style={planNameInputStyle}
                      required
                    />

                    <input
                      name="description"
                      defaultValue={plan.description || ""}
                      placeholder="وصف الباقة"
                      style={{ ...inputStyle, marginTop: "12px" }}
                    />
                  </div>

                  <span
                    style={{
                      ...statusBadgeStyle,
                      ...(plan.active ? activeBadgeStyle : inactiveBadgeStyle),
                    }}
                  >
                    {plan.active ? "مفعلة" : "معطلة"}
                  </span>
                </div>

                <div style={detailsGridStyle}>
                  <Field label="السعر">
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      defaultValue={plan.price}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="مدة الاشتراك بالأيام">
                    <input
                      name="duration_days"
                      type="number"
                      defaultValue={plan.duration_days}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="عدد الفروع">
                    <input
                      name="max_branches"
                      type="number"
                      defaultValue={plan.max_branches}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="عدد المنتجات">
                    <input
                      name="max_products"
                      type="number"
                      defaultValue={plan.max_products ?? ""}
                      placeholder="فارغ = غير محدود"
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="ترتيب العرض">
                    <input
                      name="sort_order"
                      type="number"
                      defaultValue={plan.sort_order ?? 0}
                      style={inputStyle}
                    />
                  </Field>
                </div>

                <div style={featuresGridTwoStyle}>
                  <FeatureCheckbox
                    name="allow_orders"
                    label="الطلبات"
                    defaultChecked={plan.allow_orders}
                  />
                  <FeatureCheckbox
                    name="allow_kitchen"
                    label="المطبخ"
                    defaultChecked={plan.allow_kitchen}
                  />
                  <FeatureCheckbox
                    name="allow_cashier"
                    label="الكاشير"
                    defaultChecked={plan.allow_cashier}
                  />
                  <FeatureCheckbox
                    name="allow_stats"
                    label="الإحصائيات"
                    defaultChecked={plan.allow_stats}
                  />
                </div>

                <button style={greenButtonStyle}>حفظ</button>
              </form>

              <div style={actionsGridStyle}>
                <form action={togglePlanAction}>
                  <input type="hidden" name="id" value={plan.id} />
                  <input type="hidden" name="active" value={String(plan.active)} />
                  <button style={plan.active ? dangerOutlineButtonStyle : greenOutlineButtonStyle}>
                    {plan.active ? "تعطيل" : "تفعيل"}
                  </button>
                </form>

                <form action={deletePlanAction}>
                  <input type="hidden" name="id" value={plan.id} />
                  <button style={dangerButtonStyle}>حذف</button>
                </form>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div style={statCardStyle}>
      <p style={statTitleStyle}>{title}</p>
      <strong style={statValueStyle}>{value}</strong>
    </div>
  );
}

function FeatureCheckbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label style={checkboxLabelStyle}>
      <span>{label}</span>
      <input name={name} type="checkbox" defaultChecked={defaultChecked} />
    </label>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      {children}
    </label>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100%",
  background: "#06140f",
  color: "#e5e7eb",
  padding: "32px",
  display: "grid",
  gap: "24px",
  boxSizing: "border-box",
};

const heroStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(6,78,59,0.98), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.42)",
  borderRadius: "28px",
  padding: "28px",
  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: "#6ee7b7",
  fontWeight: 900,
  fontSize: "15px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "38px",
  fontWeight: 950,
  color: "#ffffff",
};

const heroTextStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#d1fae5",
  fontWeight: 800,
  fontSize: "16px",
  lineHeight: 1.8,
};

const secondaryLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  border: "1px solid rgba(16,185,129,0.32)",
  borderRadius: "18px",
  padding: "14px 20px",
  background: "rgba(255,255,255,0.06)",
  color: "#d1fae5",
  fontWeight: 950,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "14px",
};

const statCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(6,78,59,0.98), rgba(9,40,30,0.98))",
  border: "1px solid rgba(16,185,129,0.38)",
  borderRadius: "24px",
  padding: "18px",
  boxShadow: "0 18px 38px rgba(0,0,0,0.25)",
  minHeight: "108px",
  display: "grid",
  alignContent: "center",
  gap: "10px",
};

const statTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#a7f3d0",
  fontWeight: 950,
};

const statValueStyle: React.CSSProperties = {
  color: "#ffffff",
  fontWeight: 950,
  fontSize: "28px",
};

const errorStyle: React.CSSProperties = {
  border: "1px solid rgba(239,68,68,0.35)",
  background: "rgba(239,68,68,0.14)",
  color: "#fca5a5",
  borderRadius: "18px",
  padding: "14px",
  fontWeight: 950,
};

const cardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(8,47,35,0.98), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.38)",
  borderRadius: "28px",
  padding: "24px",
  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 950,
  color: "#ffffff",
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#a7f3d0",
  fontWeight: 800,
  fontSize: "14px",
  lineHeight: 1.8,
};

const createFormStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
  marginTop: "22px",
};

const formGridFourStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "14px",
};

const formGridThreeStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "14px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(16,185,129,0.32)",
  borderRadius: "16px",
  padding: "14px",
  outline: "none",
  background: "rgba(255,255,255,0.96)",
  color: "#111827",
  fontWeight: 850,
  fontSize: "14px",
  boxSizing: "border-box",
};

const featuresGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "12px",
};

const featuresGridTwoStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
};

const checkboxLabelStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.2)",
  borderRadius: "16px",
  padding: "14px",
  background: "rgba(255,255,255,0.055)",
  color: "#d1fae5",
  fontWeight: 950,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const greenButtonStyle: React.CSSProperties = {
  border: "0",
  borderRadius: "16px",
  padding: "14px 18px",
  background: "linear-gradient(135deg, #10b981, #059669)",
  color: "#ffffff",
  fontWeight: 950,
  cursor: "pointer",
  width: "100%",
};

const plansGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "18px",
};

const planCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(8,47,35,0.98), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.38)",
  borderRadius: "28px",
  padding: "22px",
  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
};

const editFormStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "14px",
};

const planNameInputStyle: React.CSSProperties = {
  ...inputStyle,
  fontSize: "24px",
  fontWeight: 950,
  color: "#ffffff",
  background: "rgba(255,255,255,0.06)",
};

const statusBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "10px 14px",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const activeBadgeStyle: React.CSSProperties = {
  background: "rgba(16,185,129,0.16)",
  color: "#6ee7b7",
  border: "1px solid rgba(16,185,129,0.34)",
};

const inactiveBadgeStyle: React.CSSProperties = {
  background: "rgba(239,68,68,0.14)",
  color: "#fca5a5",
  border: "1px solid rgba(239,68,68,0.34)",
};

const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const fieldStyle: React.CSSProperties = {
  color: "#a7f3d0",
  fontWeight: 900,
  fontSize: "13px",
  display: "grid",
  gap: "8px",
};

const actionsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "14px",
};

const greenOutlineButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(16,185,129,0.35)",
  borderRadius: "15px",
  padding: "13px",
  background: "rgba(16,185,129,0.12)",
  color: "#6ee7b7",
  fontWeight: 950,
  cursor: "pointer",
};

const dangerOutlineButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(239,68,68,0.32)",
  borderRadius: "15px",
  padding: "13px",
  background: "rgba(239,68,68,0.08)",
  color: "#fca5a5",
  fontWeight: 950,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(239,68,68,0.32)",
  borderRadius: "15px",
  padding: "13px",
  background: "rgba(239,68,68,0.12)",
  color: "#fca5a5",
  fontWeight: 950,
  cursor: "pointer",
};

const emptyStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(8,47,35,0.98), rgba(6,20,15,0.98))",
  border: "1px solid rgba(16,185,129,0.38)",
  borderRadius: "28px",
  padding: "34px",
  textAlign: "center",
  color: "#d1d5db",
  fontWeight: 950,
};
