"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { canCreateProduct } from "@/lib/subscriptionAccess";

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  category_id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  active: boolean;
  stock_quantity: number | null;
};

const MAX_IMAGE_SIZE = 1024 * 1024;

export default function ProductsPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const activeProducts = products.filter((product) => product.active).length;
  const hiddenProducts = products.filter((product) => !product.active).length;
  const outOfStockProducts = products.filter(
    (product) => Number(product.stock_quantity || 0) <= 0
  ).length;

  async function loadData() {
    setMessage("");

    const { data: categoriesData, error: categoriesError } = await supabase
      .from("categories")
      .select("id,name")
      .eq("branch_id", branchId)
      .order("name", { ascending: true });

    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("*")
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false });

    if (categoriesError || productsError) {
      setMessage(
        categoriesError?.message ||
          productsError?.message ||
          "حدث خطأ أثناء تحميل المنتجات."
      );
      return;
    }

    setCategories(categoriesData || []);
    setProducts(productsData || []);
  }

  function resetForm() {
    setCategoryId("");
    setName("");
    setDescription("");
    setPrice("");
    setStockQuantity("");
    setImageFile(null);
    setEditingProduct(null);
    setOpenId(null);
    setMessage("");

    const fileInput = document.getElementById(
      "product-image"
    ) as HTMLInputElement | null;

    if (fileInput) fileInput.value = "";
  }

  function validateImage(file: File | null) {
    if (!file) return true;

    if (!file.type.startsWith("image/")) {
      setMessage("الملف لازم يكون صورة.");
      return false;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setMessage("حجم الصورة لازم لا يتجاوز 1MB.");
      return false;
    }

    return true;
  }

  async function uploadImage() {
    if (!imageFile) return null;

    if (!validateImage(imageFile)) {
      throw new Error("الصورة غير مقبولة.");
    }

    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${branchId}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, imageFile);

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  function handleImageChange(file: File | null) {
    setMessage("");

    if (!file) {
      setImageFile(null);
      return;
    }

    if (!validateImage(file)) {
      const fileInput = document.getElementById(
        "product-image"
      ) as HTMLInputElement | null;

      if (fileInput) fileInput.value = "";

      setImageFile(null);
      return;
    }

    setImageFile(file);
  }

  async function saveProduct() {
    setMessage("");

    if (!categoryId || !name.trim() || !price) {
      setMessage("اختر القسم واكتب اسم المنتج والسعر.");
      return;
    }

    try {
      setLoading(true);

      if (!editingProduct) {
        const access = await canCreateProduct(branchId);

        if (!access.allowed) {
          setMessage(
            access.reason || "لا يمكن إضافة منتج جديد حسب حدود الباقة الحالية."
          );
          setLoading(false);
          return;
        }
      }

      const newImageUrl = await uploadImage();

      if (editingProduct) {
        const updatePayload: {
          category_id: string;
          name: string;
          description: string;
          price: number;
          stock_quantity: number;
          image_url?: string;
        } = {
          category_id: categoryId,
          name: name.trim(),
          description: description.trim(),
          price: Number(price),
          stock_quantity: Number(stockQuantity || 0),
        };

        if (newImageUrl) {
          updatePayload.image_url = newImageUrl;
        }

        const { error } = await supabase
          .from("products")
          .update(updatePayload)
          .eq("id", editingProduct.id);

        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("products").insert({
          branch_id: branchId,
          category_id: categoryId,
          name: name.trim(),
          description: description.trim(),
          price: Number(price),
          stock_quantity: Number(stockQuantity || 0),
          image_url: newImageUrl,
          active: true,
        });

        if (error) throw new Error(error.message);
      }

      resetForm();
      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "حدث خطأ غير معروف."
      );
    } finally {
      setLoading(false);
    }
  }

  function startEdit(product: Product) {
    setEditingProduct(product);
    setCategoryId(product.category_id);
    setName(product.name);
    setDescription(product.description || "");
    setPrice(String(product.price));
    setStockQuantity(String(product.stock_quantity || 0));
    setImageFile(null);
    setOpenId(null);
    setMessage("");

    const fileInput = document.getElementById(
      "product-image"
    ) as HTMLInputElement | null;

    if (fileInput) fileInput.value = "";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteProduct(productId: string) {
    const confirmed = window.confirm("متأكد تبغى تحذف المنتج؟");

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setOpenId(null);
    await loadData();
  }

  async function toggleProductActive(product: Product) {
    setMessage("");

    const { error } = await supabase
      .from("products")
      .update({
        active: !product.active,
      })
      .eq("id", product.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setOpenId(null);
    await loadData();
  }

  useEffect(() => {
    if (!branchId) return;
    loadData();
  }, [branchId]);

  useEffect(() => {
    function close(event: MouseEvent) {
      const target = event.target as HTMLElement | null;

      if (target?.closest("[data-product-menu]")) {
        return;
      }

      setOpenId(null);
    }

    document.addEventListener("mousedown", close);

    return () => {
      document.removeEventListener("mousedown", close);
    };
  }, []);

  return (
    <div dir="rtl" style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}></p>
          <h1 style={heroTitleStyle}>إدارة المنتجات</h1>
          <p style={heroTextStyle}>
            أضف المنتجات، الأسعار، الكميات، الصور، وتحكم بظهورها داخل المنيو.
          </p>
        </div>

      </section>

      <section style={statsGridStyle}>
        <StatCard title="عدد المنتجات" value={products.length} />
        <StatCard title="ظاهرة في المنيو" value={activeProducts} />
        <StatCard title="مخفية" value={hiddenProducts} />
        <StatCard title="نفدت الكمية" value={outOfStockProducts} />
      </section>

      <section style={formCardStyle}>
        <div>
          <h2 style={sectionTitleStyle}>
            {editingProduct ? "تعديل منتج" : "إضافة منتج جديد"}
          </h2>
          <p style={sectionSubtitleStyle}>
            الصور اختيارية. المشروبات والمنتجات البسيطة ممكن تظهر بدون صورة. إضافة منتج جديد تخضع لحد المنتجات في الباقة.
          </p>
        </div>

        {editingProduct ? (
          <div style={editNoticeStyle}>
            أنت الآن تعدّل المنتج: {editingProduct.name}
          </div>
        ) : null}

        <div style={formGridStyle}>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            style={inputStyle}
          >
            <option value="">اختر القسم</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="اسم المنتج"
            style={inputStyle}
          />

          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="السعر"
            type="number"
            style={inputStyle}
          />

          <input
            value={stockQuantity}
            onChange={(event) => setStockQuantity(event.target.value)}
            placeholder="الكمية"
            type="number"
            style={inputStyle}
          />
        </div>

        <div style={descriptionGridStyle}>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="وصف المنتج"
            style={textareaStyle}
          />

          <div>
            <input
              id="product-image"
              type="file"
              accept="image/*"
              onChange={(event) =>
                handleImageChange(event.target.files?.[0] || null)
              }
              style={inputStyle}
            />

            <p style={hintTextStyle}>
              الحد الأقصى للصورة 1MB. الصيغ المقبولة: PNG / JPG / JPEG / GIF / WEBP.
            </p>

            {editingProduct?.image_url ? (
              <p style={hintTextStyle}>
                إذا لم ترفع صورة جديدة، ستبقى الصورة الحالية كما هي.
              </p>
            ) : null}
          </div>
        </div>

        {message ? (
          <div
            style={{
              ...messageStyle,
              border:
                message.includes("تم") || message.includes("نجاح")
                  ? "1px solid #4A3425"
                  : "1px solid rgba(239,68,68,0.35)",
              background:
                message.includes("تم") || message.includes("نجاح")
                  ? "rgba(16,185,129,0.14)"
                  : "rgba(239,68,68,0.14)",
              color:
                message.includes("تم") || message.includes("نجاح")
                  ? "#DEA54B"
                  : "#fca5a5",
            }}
          >
            {message}
          </div>
        ) : null}

        <div style={actionsRowStyle}>
          <button
            onClick={saveProduct}
            disabled={loading}
            style={greenButtonStyle}
          >
            {loading
              ? "جاري الحفظ..."
              : editingProduct
              ? "حفظ التعديل"
              : "+ إضافة منتج"}
          </button>

          {editingProduct ? (
            <button onClick={resetForm} style={secondaryButtonStyle}>
              إلغاء
            </button>
          ) : null}
        </div>
      </section>

      <section style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>المنتجات الحالية</h2>
            <p style={sectionSubtitleStyle}>
              كل منتج يظهر حسب حالته وكمية المخزون.
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <div style={emptyStyle}>لا توجد منتجات حتى الآن.</div>
        ) : (
          <div style={productsGridStyle}>
            {products.map((product) => (
              <article key={product.id} style={productCardStyle}>
                <button
                  data-product-menu="true"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenId((current) =>
                      current === product.id ? null : product.id
                    );
                  }}
                  style={threeDotsButtonStyle}
                  type="button"
                  aria-label="خيارات المنتج"
                >
                  ⋮
                </button>

                {openId === product.id ? (
                  <div
                    data-product-menu="true"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                    style={menuStyle}
                  >
                    <button
                      onClick={() => startEdit(product)}
                      style={menuButtonStyle}
                    >
                      تعديل المنتج
                    </button>

                    <button
                      onClick={() => toggleProductActive(product)}
                      style={menuButtonStyle}
                    >
                      {product.active ? "إخفاء المنتج" : "إظهار المنتج"}
                    </button>

                    <button
                      onClick={() => deleteProduct(product.id)}
                      style={menuDangerButtonStyle}
                    >
                      حذف المنتج
                    </button>
                  </div>
                ) : null}

                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    style={productImageStyle}
                  />
                ) : (
                  <div style={noImageStyle}>بدون صورة</div>
                )}

                <h3 style={productTitleStyle}>{product.name}</h3>

                <p style={productDescriptionStyle}>
                  {product.description || "لا يوجد وصف."}
                </p>

                <div style={productMetaGridStyle}>
                  <div style={metaBoxStyle}>
                    <span>السعر</span>
                    <strong>{Number(product.price || 0).toFixed(2)} ريال</strong>
                  </div>

                  <div style={metaBoxStyle}>
                    <span>المتوفر</span>
                    <strong>{product.stock_quantity ?? 0}</strong>
                  </div>
                </div>

                <div
                  style={{
                    ...statusBadgeStyle,
                    border: product.active
  ? "1px solid #4A3425"
  : "1px solid rgba(201,79,79,0.34)",
                    background: product.active
                      ? "rgba(198,138,61,0.12)"
                      : "rgba(239,68,68,0.14)",
                    color: product.active ? "#DEA54B" : "#fca5a5",
                  }}
                >
                  {product.active ? "ظاهر في المنيو" : "مخفي من المنيو"}
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

      <strong style={statValueStyle}>{value}</strong>
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
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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

const statValueStyle: React.CSSProperties = {
  display: "block",
  marginTop: "12px",
  color: "#FFF8F0",
  fontWeight: 950,
  fontSize: "34px",
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
  gridTemplateColumns: "1.2fr 1.4fr 0.8fr 0.8fr",
  gap: "14px",
  marginTop: "20px",
};

const descriptionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr",
  gap: "14px",
  marginTop: "14px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #4A3425",
  borderRadius: "18px",
  padding: "16px",
  outline: "none",
  background: "#2A211C",
color: "#FFF8F0",
  fontWeight: 850,
  fontSize: "15px",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: "110px",
  resize: "vertical",
};

const hintTextStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#C8B6A4",
  fontWeight: 800,
  fontSize: "12px",
  lineHeight: 1.7,
};

const messageStyle: React.CSSProperties = {
  marginTop: "16px",
  borderRadius: "18px",
  padding: "14px",
  fontWeight: 900,
};

const actionsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "18px",
  flexWrap: "wrap",
};

const greenButtonStyle: React.CSSProperties = {
  border: "0",
  borderRadius: "16px",
  padding: "15px 18px",
  background: "linear-gradient(135deg, #C68A3D, #DEA54B)",
  color: "#FFF8F0",
  fontWeight: 950,
  cursor: "pointer",
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

const productsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginTop: "20px",
};

const productCardStyle: React.CSSProperties = {
  position: "relative",
  background: "rgba(255,255,255,0.055)",
  border: "1px solid #4A3425",
  borderRadius: "24px",
  padding: "18px",
  overflow: "visible",
};

const threeDotsButtonStyle: React.CSSProperties = {
  position: "absolute",
  left: "14px",
  top: "14px",
  border: "1px solid #4A3425",
  background: "rgba(6,20,15,0.84)",
  color: "#C8B6A4",
  borderRadius: "14px",
  width: "38px",
  height: "38px",
  fontSize: "24px",
  fontWeight: 950,
  cursor: "pointer",
  lineHeight: 1,
  zIndex: 20,
};

const menuStyle: React.CSSProperties = {
  position: "absolute",
  top: "56px",
  left: "14px",
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

const productImageStyle: React.CSSProperties = {
  width: "100%",
  height: "160px",
  objectFit: "cover",
  borderRadius: "18px",
  marginBottom: "14px",
};

const noImageStyle: React.CSSProperties = {
  width: "100%",
  height: "160px",
  borderRadius: "18px",
  marginBottom: "14px",
  background: "rgba(198,138,61,0.08)",
  border: "1px dashed #4A3425",
  color: "#DEA54B",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 950,
};

const productTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#FFF8F0",
  fontSize: "22px",
  fontWeight: 950,
};

const productDescriptionStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#C8B6A4",
  fontWeight: 800,
  fontSize: "13px",
  lineHeight: 1.7,
  minHeight: "44px",
};

const productMetaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "14px",
};

const metaBoxStyle: React.CSSProperties = {
  border: "1px solid #4A3425",
  background: "rgba(255,255,255,0.055)",
  borderRadius: "16px",
  padding: "12px",
  display: "grid",
  gap: "8px",
  color: "#C8B6A4",
  fontWeight: 850,
  fontSize: "12px",
};

const statusBadgeStyle: React.CSSProperties = {
  marginTop: "14px",
  borderRadius: "999px",
  padding: "10px 13px",
  fontWeight: 950,
  textAlign: "center",
};
