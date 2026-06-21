"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BranchPageHeader from "@/components/BranchPageHeader";
import BranchLayout from "@/components/BranchLayout";

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

  const totalReviews = reviews.length;
  const fiveStarsCount = reviews.filter((review) => review.rating === 5).length;
  const reportedNote =
    "التقييمات الحقيقية تظهر مباشرة. الإبلاغ مخصص للإساءة أو السبام فقط، والمراجعة تكون من لوحة الأدمن.";

  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

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
      .eq("approved", true)
      .order("created_at", { ascending: false });

    setReviews((data || []) as unknown as Review[]);
    setLoading(false);
  }

  async function reportReview(reviewId: string) {
    const { error } = await supabase.from("review_reports").insert({
      review_id: reviewId,
      reason: "Reported by restaurant",
    });

    if (error) {
      alert("تعذر إرسال البلاغ.");
      return;
    }

    alert("تم إرسال البلاغ للأدمن.");
  }

  useEffect(() => {
    loadReviews();

    const channel = supabase
      .channel(`product-reviews-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_reviews",
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          loadReviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId]);

  if (loading) {
    return (
      <BranchLayout branchId={branchId}>
        جاري تحميل التقييمات...
      </BranchLayout>
    );
  }

  return (
    <BranchLayout branchId={branchId}>
      <div className="mx-auto max-w-7xl">
        <BranchPageHeader
          title="التقييمات"
          description="تابع تقييمات العملاء الحقيقية. التقييمات تظهر مباشرة، والإبلاغ يذهب للأدمن للمراجعة."
          branchId={branchId}
        />

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <StatCard title="إجمالي التقييمات" value={totalReviews} />
          <StatCard title="متوسط التقييم" value={`⭐ ${averageRating.toFixed(1)}`} />
          <StatCard title="تقييم 5 نجوم" value={fiveStarsCount} />
        </section>

        <div className="mt-6 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-200">
          {reportedNote}
        </div>

        <div className="mt-8">
          {reviews.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-gray-400">
              لا توجد تقييمات حتى الآن.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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

                      <p className="mt-3 text-2xl">
                        {"⭐".repeat(review.rating)}
                      </p>

                      <p className="mt-3 text-xs text-gray-500">
                        {new Date(review.created_at).toLocaleString("ar-SA")}
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-black text-emerald-300">
                      ظاهر
                    </span>
                  </div>

                  {review.comment ? (
                    <div className="mt-5 rounded-2xl bg-black/25 p-4 text-gray-300">
                      {review.comment}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl bg-black/25 p-4 text-gray-500">
                      لا يوجد تعليق مكتوب.
                    </div>
                  )}

                  <button
                    onClick={() => reportReview(review.id)}
                    className="mt-6 w-full rounded-2xl bg-amber-500/20 px-5 py-4 font-black text-amber-300"
                  >
                    🚩 إبلاغ عن إساءة أو سبام
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BranchLayout>
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
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}