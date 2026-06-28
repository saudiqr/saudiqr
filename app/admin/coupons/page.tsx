import Link from "next/link";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

type Coupon = {
  id: string;
  code: string;
  name: string | null;
  type: "percent" | "fixed" | "free_days";
  value: number;
  max_uses: number | null;
  used_count: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

const typeLabel: Record<string, string> = {
  percent: "نسبة خصم",
  fixed: "مبلغ ثابت",
  free_days: "أيام مجانية",
};

function formatDate(value: string | null) {
  if (!value) return "غير محدد";

  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}/${month}/${day}`;
}

function typeHelp(type: string, value: number) {
  if (type === "percent") return `${value}%`;
  if (type === "fixed") return `${value} ريال`;
  if (type === "free_days") return `${value} يوم إضافي`;
  return String(value);
}

 function getTodayInputDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function addCouponAction(formData: FormData) {
  "use server";

  const code = String(formData.get("code") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "percent");
  const value = Number(formData.get("value") || 0);
  const maxUsesValue = String(formData.get("max_uses") || "").trim();
  const maxUses = maxUsesValue === "" ? null : Number(maxUsesValue);
  const startsAt = String(formData.get("starts_at") || "").trim();
  const endsAt = String(formData.get("ends_at") || "").trim();

 
  const today = getTodayInputDate();

  if (!code || !type || value <= 0) return;
  if (startsAt && startsAt < today) return;
  if (endsAt && endsAt < today) return;
  if (startsAt && endsAt && endsAt < startsAt) return;

  await supabase.from("coupons").insert({
    code,
    name: name || null,
    type,
    value,
    max_uses: maxUses,
    used_count: 0,
    active: true,
    starts_at: startsAt || null,
    ends_at: endsAt || null,
  });

  revalidatePath("/admin/coupons");
}

async function updateCouponAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "percent");
  const value = Number(formData.get("value") || 0);
  const maxUsesValue = String(formData.get("max_uses") || "").trim();
  const maxUses = maxUsesValue === "" ? null : Number(maxUsesValue);
  const startsAt = String(formData.get("starts_at") || "").trim();
  const endsAt = String(formData.get("ends_at") || "").trim();

  if (!id || !code || value <= 0) return;
  if (startsAt && endsAt && endsAt < startsAt) return;

  await supabase
    .from("coupons")
    .update({
      code,
      name: name || null,
      type,
      value,
      max_uses: maxUses,
      starts_at: startsAt || null,
      ends_at: endsAt || null,
    })
    .eq("id", id);

  revalidatePath("/admin/coupons");
}

async function toggleCouponAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const active = String(formData.get("active") || "") === "true";

  if (!id) return;

  await supabase.from("coupons").update({ active: !active }).eq("id", id);

  revalidatePath("/admin/coupons");
}

async function deleteCouponAction(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");

  if (!id) return;

  await supabase.from("coupons").delete().eq("id", id);

  revalidatePath("/admin/coupons");
}

export default async function AdminCouponsPage() {
  const { data, error } = await supabase
    .from("coupons")
    .select(
      "id,code,name,type,value,max_uses,used_count,active,starts_at,ends_at,created_at"
    )
    .order("created_at", { ascending: false });

  const coupons = (data || []) as Coupon[];
  const today = getTodayInputDate();

  const activeCount = coupons.filter((coupon) => coupon.active).length;
  const inactiveCount = coupons.filter((coupon) => !coupon.active).length;
  const percentCount = coupons.filter((coupon) => coupon.type === "percent").length;
  const freeDaysCount = coupons.filter((coupon) => coupon.type === "free_days").length;

  return (
    <main dir="rtl" style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>SaudiQR Admin</p>
          <h1 style={heroTitleStyle}>إدارة أكواد الخصم</h1>
          <p style={heroTextStyle}>
            إنشاء كوبونات خصم أو أيام مجانية لاستخدامها في الاشتراكات.
          </p>
        </div>

      </section>

      <section style={statsGridStyle}>
        <StatCard title="كل الكوبونات" value={coupons.length} />
        <StatCard title="مفعلة" value={activeCount} />
        <StatCard title="معطلة" value={inactiveCount} />
        <StatCard title="نسبة خصم" value={percentCount} />
        <StatCard title="أيام مجانية" value={freeDaysCount} />
      </section>

      {error ? (
        <div style={errorStyle}>خطأ في جلب الكوبونات: {error.message}</div>
      ) : null}

      <section style={cardStyle}>
        <div>
          <h2 style={sectionTitleStyle}>إضافة كوبون جديد</h2>
          <p style={sectionSubtitleStyle}>
            الكوبون يمكن أن يكون نسبة خصم، مبلغ ثابت، أو أيام مجانية تضاف للاشتراك.
          </p>
        </div>

        <form action={addCouponAction} style={createFormStyle}>
          <div style={formGridFourStyle}>
            <input
              name="code"
              placeholder="كود الخصم مثال: WELCOME20"
              style={inputStyle}
              required
            />

            <input
              name="name"
              placeholder="اسم داخلي للكوبون"
              style={inputStyle}
            />

            <select name="type" defaultValue="percent" style={inputStyle}>
              <option value="percent">نسبة خصم</option>
              <option value="fixed">مبلغ ثابت</option>
              <option value="free_days">أيام مجانية</option>
            </select>

            <input
              name="value"
              placeholder="القيمة: 20 أو 50 أو 30"
              type="number"
              step="0.01"
              style={inputStyle}
              required
            />
          </div>

          <div style={formGridFourBottomStyle}>
            <input
              name="max_uses"
              placeholder="عدد الاستخدامات، فارغ = غير محدود"
              type="number"
              style={inputStyle}
            />

            <DateField label="تاريخ البداية">
              <input
                name="starts_at"
                type="date"
                min={today}
                style={inputStyle}
              />
            </DateField>

            <DateField label="تاريخ النهاية">
              <input
                name="ends_at"
                type="date"
                min={today}
                style={inputStyle}
              />
            </DateField>

            <button style={greenButtonStyle}>+ إضافة كوبون</button>
          </div>
        </form>
      </section>

      {coupons.length === 0 && !error ? (
        <section style={emptyStyle}>لا توجد كوبونات حتى الآن.</section>
      ) : (
        <section style={couponsGridStyle}>
          {coupons.map((coupon) => (
            <article key={coupon.id} style={couponCardStyle}>
              <form action={updateCouponAction} style={editFormStyle}>
                <input type="hidden" name="id" value={coupon.id} />

                <div style={cardHeaderStyle}>
                  <div style={{ width: "100%" }}>
                    <input
                      name="code"
                      defaultValue={coupon.code}
                      style={couponCodeInputStyle}
                      required
                    />

                    <input
                      name="name"
                      defaultValue={coupon.name || ""}
                      placeholder="اسم داخلي للكوبون"
                      style={{ ...inputStyle, marginTop: "12px" }}
                    />
                  </div>

                  <span
                    style={{
                      ...statusBadgeStyle,
                      ...(coupon.active ? activeBadgeStyle : inactiveBadgeStyle),
                    }}
                  >
                    {coupon.active ? "مفعل" : "معطل"}
                  </span>
                </div>

                <div style={summaryBoxStyle}>
                  النوع الحالي:{" "}
                  <strong>
                    {typeLabel[coupon.type]} - {typeHelp(coupon.type, coupon.value)}
                  </strong>
                </div>

                <div style={detailsGridStyle}>
                  <Field label="النوع">
                    <select name="type" defaultValue={coupon.type} style={inputStyle}>
                      <option value="percent">نسبة خصم</option>
                      <option value="fixed">مبلغ ثابت</option>
                      <option value="free_days">أيام مجانية</option>
                    </select>
                  </Field>

                  <Field label="القيمة">
                    <input
                      name="value"
                      type="number"
                      step="0.01"
                      defaultValue={coupon.value}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="عدد الاستخدامات">
                    <input
                      name="max_uses"
                      type="number"
                      defaultValue={coupon.max_uses ?? ""}
                      placeholder="فارغ = غير محدود"
                      style={inputStyle}
                    />
                  </Field>

                  <div style={usageBoxStyle}>
                    المستخدم: <strong>{coupon.used_count}</strong>
                    {coupon.max_uses ? ` / ${coupon.max_uses}` : " / غير محدود"}
                  </div>

                  <Field label="يبدأ من">
                    <input
                      name="starts_at"
                      type="date"
                      defaultValue={coupon.starts_at ? coupon.starts_at.slice(0, 10) : ""}
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="ينتهي في">
                    <input
                      name="ends_at"
                      type="date"
                      defaultValue={coupon.ends_at ? coupon.ends_at.slice(0, 10) : ""}
                      style={inputStyle}
                    />
                  </Field>
                </div>

                <div style={summaryBoxStyle}>
                  الصلاحية: من {formatDate(coupon.starts_at)} إلى{" "}
                  {formatDate(coupon.ends_at)}
                </div>

                <button style={greenButtonStyle}>حفظ التعديل</button>
              </form>

              <div style={actionsGridStyle}>
                <form action={toggleCouponAction}>
                  <input type="hidden" name="id" value={coupon.id} />
                  <input type="hidden" name="active" value={String(coupon.active)} />
                  <button
                    style={
                      coupon.active
                        ? dangerOutlineButtonStyle
                        : greenOutlineButtonStyle
                    }
                  >
                    {coupon.active ? "تعطيل" : "تفعيل"}
                  </button>
                </form>

                <form action={deleteCouponAction}>
                  <input type="hidden" name="id" value={coupon.id} />
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

function DateField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={dateFieldStyle}>
      <span style={dateLabelStyle}>{label}</span>
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

const formGridFourBottomStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "14px",
  alignItems: "end",
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

const dateFieldStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
};

const dateLabelStyle: React.CSSProperties = {
  color: "#a7f3d0",
  fontSize: "13px",
  fontWeight: 950,
  paddingRight: "4px",
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

const couponsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "18px",
};

const couponCardStyle: React.CSSProperties = {
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

const couponCodeInputStyle: React.CSSProperties = {
  ...inputStyle,
  fontSize: "24px",
  fontWeight: 950,
  color: "#ffffff",
  background: "rgba(255,255,255,0.06)",
  textTransform: "uppercase",
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

const summaryBoxStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.18)",
  background: "rgba(255,255,255,0.055)",
  borderRadius: "16px",
  padding: "14px",
  color: "#d1d5db",
  fontWeight: 850,
  fontSize: "13px",
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

const usageBoxStyle: React.CSSProperties = {
  border: "1px solid rgba(16,185,129,0.18)",
  background: "rgba(255,255,255,0.055)",
  borderRadius: "16px",
  padding: "14px",
  color: "#d1d5db",
  fontWeight: 850,
  fontSize: "13px",
  display: "flex",
  alignItems: "center",
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
