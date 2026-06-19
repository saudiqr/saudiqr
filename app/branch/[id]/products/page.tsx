"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("id,name")
      .eq("branch_id", branchId);

    const { data: productsData } = await supabase
      .from("products")
      .select("*")
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false });

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
    setOpenMenuId(null);
    setErrorMessage("");

    const fileInput = document.getElementById(
      "product-image"
    ) as HTMLInputElement | null;

    if (fileInput) fileInput.value = "";
  }

  function validateImage(file: File | null) {
    if (!file) return true;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("الملف لازم يكون صورة.");
      return false;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setErrorMessage("حجم الصورة لازم لا يتجاوز 1MB.");
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
    setErrorMessage("");

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
    setErrorMessage("");

    if (!categoryId || !name.trim() || !price) {
      setErrorMessage("اختر القسم واكتب اسم المنتج والسعر.");
      return;
    }

    try {
      setLoading(true);

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
      setErrorMessage(
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
    setOpenMenuId(null);
    setErrorMessage("");

    const fileInput = document.getElementById(
      "product-image"
    ) as HTMLInputElement | null;

    if (fileInput) fileInput.value = "";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteProduct(productId: string) {
    const confirmed = confirm("متأكد تبغى تحذف المنتج؟");

    if (!confirmed) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setOpenMenuId(null);
    await loadData();
  }

  async function toggleProductActive(product: Product) {
    const { error } = await supabase
      .from("products")
      .update({
        active: !product.active,
      })
      .eq("id", product.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setOpenMenuId(null);
    await loadData();
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <main dir="rtl" className="min-h-screen bg-[#06140f] p-10 text-white">
      <h1 className="text-4xl font-black">إدارة المنتجات</h1>

      <p className="mt-4 text-sm text-gray-400">
        عدد الأقسام: {categories.length}
      </p>

      <div className="mt-8 max-w-xl space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
        {editingProduct && (
          <div className="rounded-2xl bg-amber-500/20 p-4 text-amber-200">
            أنت الآن تعدّل المنتج: {editingProduct.name}
          </div>
        )}

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white px-4 py-4 text-black"
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
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم المنتج"
          className="w-full rounded-2xl bg-black/20 p-4"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="وصف المنتج"
          className="w-full rounded-2xl bg-black/20 p-4"
        />

        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="السعر"
          type="number"
          className="w-full rounded-2xl bg-black/20 p-4"
        />

        <input
          value={stockQuantity}
          onChange={(e) => setStockQuantity(e.target.value)}
          placeholder="الكمية المتوفرة"
          type="number"
          className="w-full rounded-2xl bg-black/20 p-4"
        />

        <div>
          <input
            id="product-image"
            type="file"
            accept="image/*"
            onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
            className="w-full rounded-2xl bg-black/20 p-4"
          />

          <p className="mt-2 text-xs text-gray-400">
            الحد الأقصى للصورة 1MB. الصيغ المقبولة: PNG / JPG / JPEG / GIF / WEBP.
          </p>

          {editingProduct?.image_url && (
            <p className="mt-2 text-xs text-gray-400">
              إذا لم ترفع صورة جديدة، ستبقى الصورة الحالية كما هي.
            </p>
          )}
        </div>

        {errorMessage && (
          <div className="rounded-2xl bg-red-500/20 p-4 text-red-300">
            {errorMessage}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={saveProduct}
            disabled={loading}
            className="rounded-2xl bg-emerald-500 px-6 py-4 font-black text-black disabled:opacity-60"
          >
            {loading
              ? "جاري الحفظ..."
              : editingProduct
              ? "حفظ التعديل"
              : "+ إضافة منتج"}
          </button>

          {editingProduct && (
            <button
              onClick={resetForm}
              className="rounded-2xl border border-white/10 px-6 py-4 font-black"
            >
              إلغاء
            </button>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="relative rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <button
              onClick={() =>
                setOpenMenuId(openMenuId === product.id ? null : product.id)
              }
              className="absolute left-4 top-4 z-20 rounded-full bg-black/60 px-3 py-1 text-xl font-black"
            >
              ⋯
            </button>

            {openMenuId === product.id && (
              <div className="absolute left-4 top-12 z-30 w-40 rounded-2xl border border-white/10 bg-[#102019] p-2 shadow-xl">
                <button
                  onClick={() => startEdit(product)}
                  className="w-full rounded-xl px-3 py-2 text-right text-sm hover:bg-white/10"
                >
                  تعديل
                </button>

                <button
                  onClick={() => toggleProductActive(product)}
                  className="w-full rounded-xl px-3 py-2 text-right text-sm hover:bg-white/10"
                >
                  {product.active ? "إخفاء المنتج" : "إظهار المنتج"}
                </button>

                <button
                  onClick={() => deleteProduct(product.id)}
                  className="w-full rounded-xl px-3 py-2 text-right text-sm text-red-300 hover:bg-red-500/10"
                >
                  حذف
                </button>
              </div>
            )}

            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="mb-4 h-40 w-full rounded-2xl object-cover"
              />
            )}

            <h2 className="text-xl font-black">{product.name}</h2>

            <p className="mt-2 text-gray-400">{product.description}</p>

            <p className="mt-4 font-black text-emerald-400">
              {product.price} ريال
            </p>

            <p className="mt-2 text-sm text-gray-400">
              المتوفر: {product.stock_quantity ?? 0}
            </p>

            <p
              className={`mt-2 text-sm font-bold ${
                product.active ? "text-emerald-400" : "text-red-300"
              }`}
            >
              {product.active ? "ظاهر في المنيو" : "مخفي من المنيو"}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}