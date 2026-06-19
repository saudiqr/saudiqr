"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  approved: boolean;
  created_at: string;
  products: {
    name: string;
  } | null;
};

export default function ReviewsPage() {
  const params = useParams();
  const branchId = params.id as string;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadReviews() {
    const { data } = await supabase
      .from("product_reviews")
      .select(`
        id,
        rating,
        comment,
        approved,
        created_at,
        products (
          name
        )
      `)
      .eq("branch_id", branchId)
      .order("approved", { ascending: true })
.order("created_at", { ascending: false });

    setReviews((data || []) as unknown as Review[]);
    setLoading(false);
  }

  async function rejectReview(reviewId: string) {
    await supabase
      .from("product_reviews")
      .delete()
      .eq("id", reviewId);

    await loadReviews();
  }
async function reportReview(reviewId: string) {
  await supabase
    .from("review_reports")
    .insert({
      review_id: reviewId,
      reason: "Reported by restaurant",
    });

  alert("تم إرسال البلاغ");
}
  useEffect(() => {
    loadReviews();
  }, []);

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#06140f] p-10 text-white">
        جاري تحميل التقييمات...
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#06140f] p-10 text-white">
      <h1 className="text-4xl font-black">إدارة التقييمات</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
    <p className="text-gray-400">إجمالي التقييمات</p>
    <p className="mt-2 text-3xl font-black">{reviews.length}</p>
  </div>

  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
    <p className="text-gray-400">متوسط التقييم</p>
    <p className="mt-2 text-3xl font-black">
      ⭐{" "}
      {reviews.length > 0
        ? (
            reviews.reduce((sum, review) => sum + review.rating, 0) /
            reviews.length
          ).toFixed(1)
        : "0.0"}
    </p>
  </div>

  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
  <p className="text-gray-400">تقييم 5 نجوم</p>
  <p className="mt-2 text-3xl font-black">
    {reviews.filter((review) => review.rating === 5).length}
  </p>
</div>
</div>

      <p className="mt-4 text-gray-400">
       التقييمات تظهر مباشرة، ويمكنك الإبلاغ عن الإساءة أو السبام.
      </p>

      <div className="mt-8 space-y-4">
        {reviews.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-gray-400">
            لا توجد تقييمات حتى الآن.
          </div>
        )}

        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-3xl border border-white/10 bg-white/5 p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">
                  {review.products?.name || "منتج غير معروف"}
                </h2>

                <p className="mt-2 text-2xl">
                  {"⭐".repeat(review.rating)}
                </p>

                {review.comment && (
                  <p className="mt-3 text-gray-300">{review.comment}</p>
                )}

                <p className="mt-3 text-xs text-gray-500">
                  {new Date(review.created_at).toLocaleString("ar-SA")}
                </p>
              </div>

              <span
                className={`rounded-full px-4 py-2 text-sm font-black ${
                  review.approved
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {review.approved ? "ظاهر" : "مخفي"}
              </span>
            </div>

            <div className="mt-6 flex gap-3">

  <button
    onClick={() => reportReview(review.id)}
    className="rounded-2xl bg-amber-500/20 px-5 py-3 font-black text-amber-300"
  >
    🚩 إبلاغ
  </button>

  <button
    onClick={() => rejectReview(review.id)}
    className="rounded-2xl bg-red-500/20 px-5 py-3 font-black text-red-300"
  >
    حذف
  </button>

</div>
          </div>
        ))}
      </div>
    </main>
  );
}