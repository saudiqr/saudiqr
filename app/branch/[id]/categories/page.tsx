"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Category = {
  id: string;
  branch_id: string;
  name: string;
  sort_order: number | null;
  created_at: string | null;
  products?: {
    id: string;
  }[];
};

export default function CategoriesPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadCategories() {
    setMessage("");

    const { data, error } = await supabase
      .from("categories")
      .select(`
        id,
        branch_id,
        name,
        sort_order,
        created_at,
        products (
          id
        )
      `)
      .eq("branch_id", branchId)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(error.message);
      setCategories([]);
      return;
    }

    setCategories((data || []) as Category[]);
  }

  function resetForm() {
    setName("");
    setSortOrder("");
    setEditingCategory(null);
    setOpenId(null);
    setMessage("");
  }

  async function saveCategory() {
    setMessage("");

    if (!name.trim()) {
      setMessage("اكتب اسم القسم.");
      return;
    }

    setLoading(true);

    if (editingCategory) {
      const { error } = await supabase
        .from("categories")
        .update({
          name: name.trim(),
          sort_order: sortOrder ? Number(sortOrder) : null,
        })
        .eq("id", editingCategory.id);

      setLoading(false);

      if (error) {
        setMessage(error.message);
        return;
      }

      resetForm();
      await loadCategories();
      return;
    }

    const { error } = await supabase.from("categories").insert({
      branch_id: branchId,
      name: name.trim(),
      sort_order: sortOrder ? Number(sortOrder) : categories.length + 1,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    resetForm();
    await loadCategories();
  }

  function startEdit(category: Category) {
    setEditingCategory(category);
    setName(category.name);
    setSortOrder(String(category.sort_order || ""));
    setOpenId(null);
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteCategory(category: Category) {
    const productsCount = category.products?.length || 0;

    if (productsCount > 0) {
      setMessage(
        `لا يمكن حذف القسم لأنه يحتوي على ${productsCount} منتج. انقل المنتجات أو احذفها أولاً.`
      );
      setOpenId(null);
      return;
    }

    const confirmed = window.confirm(`هل تريد حذف قسم "${category.name}"؟`);

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", category.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setOpenId(null);
    await loadCategories();
  }

  async function moveCategory(category: Category, direction: "up" | "down") {
    setMessage("");

    const currentOrder = Number(category.sort_order || 0);
    const nextOrder = direction === "up" ? currentOrder - 1 : currentOrder + 1;

    if (nextOrder < 1) return;

    const { error } = await supabase
      .from("categories")
      .update({ sort_order: nextOrder })
      .eq("id", category.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setOpenId(null);
    await loadCategories();
  }

  useEffect(() => {
    if (!branchId) return;
    loadCategories();
  }, [branchId]);

  useEffect(() => {
    function close(event: MouseEvent) {
      const target = event.target as HTMLElement | null;

      if (target?.closest("[data-category-menu]")) {
        return;
      }

      setOpenId(null);
    }

    document.addEventListener("mousedown", close);

    return () => {
      document.removeEventListener("mousedown", close);
    };
  }, []);

  const totalProducts = categories.reduce(
    (sum, category) => sum + (category.products?.length || 0),
    0
  );

  return (
    <div dir="rtl" style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}></p>
          <h1 style={heroTitleStyle}>إدارة الأقسام</h1>
          <p style={heroTextStyle}>
            أضف أقسام المنيو ورتبها لتظهر بشكل منظم داخل صفحة العميل.
          </p>
        </div>

      </section>

      <section style={statsGridStyle}>
        <StatCard title="عدد الأقسام" value={categories.length} />
        <StatCard title="عدد المنتجات داخل الأقسام" value={totalProducts} />
        <StatCard title="حالة الصفحة" value="جاهزة" />
      </section>

      <section style={formCardStyle}>
        <div>
          <h2 style={sectionTitleStyle}>
            {editingCategory ? "تعديل قسم" : "إضافة قسم جديد"}
          </h2>
          <p style={sectionSubtitleStyle}>
            مثال: مشروبات ساخنة، مشروبات باردة، حلويات، وجبات.
          </p>
        </div>

        {editingCategory ? (
          <div style={editNoticeStyle}>
            أنت الآن تعدّل القسم: {editingCategory.name}
          </div>
        ) : null}

        <div style={formGridStyle}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="اسم القسم"
            style={inputStyle}
          />

          <input
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            placeholder="ترتيب الظهور"
            type="number"
            style={inputStyle}
          />

          <button onClick={saveCategory} disabled={loading} style={greenButtonStyle}>
            {loading
              ? "جاري الحفظ..."
              : editingCategory
              ? "حفظ التعديل"
              : "+ إضافة قسم"}
          </button>

          {editingCategory ? (
            <button onClick={resetForm} style={secondaryButtonStyle}>
              إلغاء
            </button>
          ) : null}
        </div>

        {message ? (
          <div
            style={{
              ...messageStyle,
              border: message.includes("لا يمكن") || message.includes("اكتب")
                ? "1px solid rgba(239,68,68,0.35)"
                : "1px solid #4A3425",
              background:
                message.includes("لا يمكن") || message.includes("اكتب")
                  ? "rgba(239,68,68,0.14)"
                  : "rgba(16,185,129,0.14)",
              color:
                message.includes("لا يمكن") || message.includes("اكتب")
                  ? "#fca5a5"
                  : "#DEA54B",
            }}
          >
            {message}
          </div>
        ) : null}
      </section>

      <section style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>الأقسام الحالية</h2>
            <p style={sectionSubtitleStyle}>
              كل قسم يظهر في المنيو حسب ترتيب الظهور.
            </p>
          </div>
        </div>

        {categories.length === 0 ? (
          <div style={emptyStyle}>لا توجد أقسام حتى الآن.</div>
        ) : (
          <div style={categoriesGridStyle}>
            {categories.map((category) => (
              <article key={category.id} style={categoryCardStyle}>
                <div style={categoryHeaderStyle}>
                  <button
                    data-category-menu="true"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenId((current) =>
                        current === category.id ? null : category.id
                      );
                    }}
                    style={threeDotsButtonStyle}
                    type="button"
                    aria-label="خيارات القسم"
                  >
                    ⋮
                  </button>

                  <div>
                    <h3 style={categoryTitleStyle}>{category.name}</h3>

                    <p style={mutedTextStyle}>
                      ترتيب الظهور: {category.sort_order || "غير محدد"}
                    </p>

                    <span style={productsBadgeStyle}>
                      {category.products?.length || 0} منتج
                    </span>
                  </div>

                  {openId === category.id ? (
                    <div
                      data-category-menu="true"
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                      style={menuStyle}
                    >
                      <button
                        onClick={() => startEdit(category)}
                        style={menuButtonStyle}
                      >
                        تعديل القسم
                      </button>

                      <button
                        onClick={() => moveCategory(category, "up")}
                        style={menuButtonStyle}
                      >
                        رفع الترتيب
                      </button>

                      <button
                        onClick={() => moveCategory(category, "down")}
                        style={menuButtonStyle}
                      >
                        إنزال الترتيب
                      </button>

                      <button
                        onClick={() => deleteCategory(category)}
                        style={menuDangerButtonStyle}
                      >
                        حذف القسم
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <div style={statCardStyle}>
      <p style={{ margin: 0, color: "#C8B6A4", fontWeight: 950 }}>
        {title}
      </p>

      <strong
        style={{
          display: "block",
          marginTop: "12px",
          color: "#FFF8F0",
          fontWeight: 950,
          fontSize: "34px",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "100vh",
  color: "#e5e7eb",
  display: "grid",
  gap: "24px",
};

const heroStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, #241B16, #16110E)",
  border: "1px solid #4A3425",
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
  color: "#DEA54B",
  fontWeight: 900,
  fontSize: "15px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "38px",
  fontWeight: 950,
  color: "#FFF8F0",
};

const heroTextStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#C8B6A4",
  fontWeight: 800,
  fontSize: "16px",
  lineHeight: 1.8,
};

const liveBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "12px 16px",
  background: "rgba(198,138,61,0.12)",
  color: "#DEA54B",
  border: "1px solid #4A3425",
  fontWeight: 950,
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "18px",
};

const statCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, #241B16, #2A211C)",
  border: "1px solid #4A3425",
  borderRadius: "24px",
  padding: "22px",
  boxShadow: "0 18px 38px rgba(0,0,0,0.25)",
};

const formCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, #241B16, #16110E)",
  border: "1px solid #4A3425",
  borderRadius: "28px",
  padding: "24px",
  boxShadow: "0 22px 45px rgba(0,0,0,0.28)",
};

const cardStyle: React.CSSProperties = {
  ...formCardStyle,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 950,
  color: "#FFF8F0",
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#C8B6A4",
  fontWeight: 800,
  fontSize: "14px",
  lineHeight: 1.8,
};

const editNoticeStyle: React.CSSProperties = {
  marginTop: "18px",
  border: "1px solid rgba(245,158,11,0.32)",
  background: "rgba(245,158,11,0.12)",
  color: "#fde68a",
  borderRadius: "18px",
  padding: "14px",
  fontWeight: 900,
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 220px auto auto",
  gap: "14px",
  marginTop: "20px",
  alignItems: "center",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #4A3425",
  borderRadius: "18px",
  padding: "16px",
  outline: "none",
  background: "rgba(255,255,255,0.96)",
  color: "#111827",
  fontWeight: 850,
  fontSize: "15px",
  boxSizing: "border-box",
};

const greenButtonStyle: React.CSSProperties = {
  border: "0",
  borderRadius: "16px",
  padding: "15px 18px",
  background: "linear-gradient(135deg, #C68A3D, #DEA54B)",
  color: "#FFF8F0",
  fontWeight: 950,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #4A3425",
  borderRadius: "16px",
  padding: "15px 18px",
  background: "rgba(255,255,255,0.055)",
  color: "#C8B6A4",
  fontWeight: 950,
  cursor: "pointer",
};

const messageStyle: React.CSSProperties = {
  marginTop: "16px",
  borderRadius: "18px",
  padding: "14px",
  fontWeight: 900,
};

const emptyStyle: React.CSSProperties = {
  marginTop: "18px",
  border: "1px solid #4A3425",
  background: "rgba(255,255,255,0.055)",
  color: "#C8B6A4",
  borderRadius: "22px",
  padding: "22px",
  textAlign: "center",
  fontWeight: 950,
};

const categoriesGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginTop: "20px",
};

const categoryCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.055)",
  border: "1px solid #4A3425",
  borderRadius: "24px",
  padding: "18px",
  overflow: "visible",
};

const categoryHeaderStyle: React.CSSProperties = {
  position: "relative",
  minHeight: "110px",
};

const categoryTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#FFF8F0",
  fontSize: "24px",
  fontWeight: 950,
  paddingLeft: "46px",
};

const mutedTextStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#C8B6A4",
  fontWeight: 850,
  fontSize: "13px",
};

const productsBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  marginTop: "16px",
  borderRadius: "999px",
  padding: "9px 13px",
  background: "rgba(198,138,61,0.12)",
  color: "#DEA54B",
  border: "1px solid #4A3425",
  fontWeight: 950,
};

const threeDotsButtonStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  border: "1px solid #4A3425",
  background: "rgba(255,255,255,0.055)",
  color: "#C8B6A4",
  borderRadius: "14px",
  width: "38px",
  height: "38px",
  fontSize: "24px",
  fontWeight: 950,
  cursor: "pointer",
  lineHeight: 1,
};

const menuStyle: React.CSSProperties = {
  position: "absolute",
  top: "44px",
  left: 0,
  zIndex: 9999,
  minWidth: "170px",
  overflow: "hidden",
  borderRadius: "16px",
  border: "1px solid #4A3425",
  background: "#16110E",
  boxShadow: "0 18px 35px rgba(0,0,0,0.36)",
};

const menuButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "0",
  background: "transparent",
  color: "#DEA54B",
  padding: "13px 14px",
  fontWeight: 950,
  cursor: "pointer",
  textAlign: "right",
};

const menuDangerButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "0",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  background: "transparent",
  color: "#fca5a5",
  padding: "13px 14px",
  fontWeight: 950,
  cursor: "pointer",
  textAlign: "right",
};
