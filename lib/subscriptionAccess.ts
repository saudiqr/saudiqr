import { supabase } from "@/lib/supabase";

export type SubscriptionAccess = {
  allowed: boolean;
  reason: string | null;
  businessId: string | null;
  subscriptionId: string | null;
  planId: string | null;
  status: string | null;
  endsAt: string | null;
  plan: {
    name: string;
    maxBranches: number;
    maxProducts: number | null;
    allowOrders: boolean;
    allowKitchen: boolean;
    allowCashier: boolean;
    allowStats: boolean;
  } | null;
};

type AccessPlan = NonNullable<SubscriptionAccess["plan"]>;

type AccessFeature =
  | "orders"
  | "kitchen"
  | "cashier"
  | "stats"
  | "branches"
  | "products";

type BranchBusinessRow = {
  business_id: string | null;
};

type BusinessTrialRow = {
  id: string;
  selected_plan_id: string | null;
  trial_ends_at: string | null;
  onboarding_completed: boolean | null;
};

type PlanRow = {
  name: string;
  max_branches: number;
  max_products: number | null;
  allow_orders: boolean;
  allow_kitchen: boolean;
  allow_cashier: boolean;
  allow_stats: boolean;
};

type SubscriptionRow = {
  id: string;
  business_id: string;
  plan_id: string | null;
  status: string;
  ends_at: string | null;
  plans: PlanRow[] | PlanRow | null;
};

function isExpired(endsAt: string | null) {
  if (!endsAt) return false;
  return new Date(endsAt).getTime() < Date.now();
}

function denied(
  reason: string,
  data?: Partial<SubscriptionAccess>
): SubscriptionAccess {
  return {
    allowed: false,
    reason,
    businessId: data?.businessId || null,
    subscriptionId: data?.subscriptionId || null,
    planId: data?.planId || null,
    status: data?.status || null,
    endsAt: data?.endsAt || null,
    plan: data?.plan || null,
  };
}

function allowed(
  data: Omit<SubscriptionAccess, "allowed" | "reason">
): SubscriptionAccess {
  return {
    allowed: true,
    reason: null,
    ...data,
  };
}

function getFullTrialPlan(): AccessPlan {
  return {
    name: "تجربة مجانية - فل أوبشن",
    maxBranches: 999,
    maxProducts: null,
    allowOrders: true,
    allowKitchen: true,
    allowCashier: true,
    allowStats: true,
  };
}

function normalizePlanFromSubscription(
  subscription: SubscriptionRow
): AccessPlan | null {
  const rawPlan = Array.isArray(subscription.plans)
    ? subscription.plans[0] || null
    : subscription.plans || null;

  if (!rawPlan) return null;

  return {
    name: rawPlan.name,
    maxBranches: rawPlan.max_branches,
    maxProducts: rawPlan.max_products,
    allowOrders: rawPlan.allow_orders,
    allowKitchen: rawPlan.allow_kitchen,
    allowCashier: rawPlan.allow_cashier,
    allowStats: rawPlan.allow_stats,
  };
}

function featureIsAllowed(feature: AccessFeature | undefined, plan: AccessPlan) {
  if (feature === "orders") return plan.allowOrders;
  if (feature === "kitchen") return plan.allowKitchen;
  if (feature === "cashier") return plan.allowCashier;
  if (feature === "stats") return plan.allowStats;

  return true;
}

function featureDeniedReason(feature?: AccessFeature) {
  if (feature === "orders") return "الباقة لا تسمح بالطلبات.";
  if (feature === "kitchen") return "الباقة لا تسمح بشاشة المطبخ.";
  if (feature === "cashier") return "الباقة لا تسمح بشاشة الكاشير.";
  if (feature === "stats") return "الباقة لا تسمح بالإحصائيات.";

  return "الباقة لا تسمح بهذه الميزة.";
}

export async function getBusinessIdFromBranch(branchId: string) {
  const { data, error } = await supabase
    .from("branches")
    .select("business_id")
    .eq("id", branchId)
    .single();

  if (error || !data) return null;

  const row = data as BranchBusinessRow;
  return row.business_id;
}

async function getBusinessTrialAccess(
  businessId: string,
  feature?: AccessFeature
): Promise<SubscriptionAccess | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, selected_plan_id, trial_ends_at, onboarding_completed")
    .eq("id", businessId)
    .single();

  if (error || !data) return null;

  const business = data as BusinessTrialRow;

  if (!business.trial_ends_at) return null;

  const trialPlan = getFullTrialPlan();

  const baseData = {
    businessId: business.id,
    subscriptionId: null,
    planId: business.selected_plan_id,
    status: "trial",
    endsAt: business.trial_ends_at,
    plan: trialPlan,
  };

  if (isExpired(business.trial_ends_at)) {
    return denied("انتهت التجربة المجانية. اختر باقة للاستمرار.", baseData);
  }

  if (!featureIsAllowed(feature, trialPlan)) {
    return denied(featureDeniedReason(feature), baseData);
  }

  return allowed(baseData);
}

export async function getSubscriptionAccessByBusinessId(
  businessId: string,
  feature?: AccessFeature
): Promise<SubscriptionAccess> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      `
      id,
      business_id,
      plan_id,
      status,
      ends_at,
      plans(
        name,
        max_branches,
        max_products,
        allow_orders,
        allow_kitchen,
        allow_cashier,
        allow_stats
      )
    `
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    const trialAccess = await getBusinessTrialAccess(businessId, feature);

    if (trialAccess) return trialAccess;

    return denied("تعذر التحقق من الاشتراك.", {
      businessId,
    });
  }

  if (!data) {
    const trialAccess = await getBusinessTrialAccess(businessId, feature);

    if (trialAccess) return trialAccess;

    return denied("لا يوجد اشتراك لهذا النشاط.", {
      businessId,
    });
  }

  const subscription = data as SubscriptionRow;
  const plan = normalizePlanFromSubscription(subscription);

  const isTrial = subscription.status === "trial";
  const effectivePlan = isTrial ? getFullTrialPlan() : plan;

  const baseData = {
    businessId: subscription.business_id,
    subscriptionId: subscription.id,
    planId: subscription.plan_id,
    status: subscription.status,
    endsAt: subscription.ends_at,
    plan: effectivePlan,
  };

  if (!effectivePlan) {
    return denied("الاشتراك غير مرتبط بباقة.", baseData);
  }

  if (subscription.status !== "active" && subscription.status !== "trial") {
    return denied("الاشتراك غير نشط.", baseData);
  }

  if (isExpired(subscription.ends_at)) {
    return denied(
      isTrial
        ? "انتهت التجربة المجانية. اختر باقة للاستمرار."
        : "الاشتراك منتهي.",
      baseData
    );
  }

  if (!featureIsAllowed(feature, effectivePlan)) {
    return denied(featureDeniedReason(feature), baseData);
  }

  return allowed(baseData);
}

export async function getSubscriptionAccessByBranchId(
  branchId: string,
  feature?: AccessFeature
): Promise<SubscriptionAccess> {
  const businessId = await getBusinessIdFromBranch(branchId);

  if (!businessId) {
    return denied("لم يتم العثور على النشاط المرتبط بهذا الفرع.");
  }

  return getSubscriptionAccessByBusinessId(businessId, feature);
}

export async function canCreateBranch(
  businessId: string
): Promise<SubscriptionAccess> {
  const access = await getSubscriptionAccessByBusinessId(businessId, "branches");

  if (!access.allowed || !access.plan) return access;

  const { count, error } = await supabase
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  if (error) {
    return denied("تعذر التحقق من عدد الفروع.", access);
  }

  if ((count || 0) >= access.plan.maxBranches) {
    return denied("وصل النشاط إلى الحد الأعلى للفروع في هذه الباقة.", access);
  }

  return access;
}

export async function canCreateProduct(
  branchId: string
): Promise<SubscriptionAccess> {
  const access = await getSubscriptionAccessByBranchId(branchId, "products");

  if (!access.allowed || !access.plan) return access;

  if (access.plan.maxProducts === null) return access;

  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("branch_id", branchId);

  if (error) {
    return denied("تعذر التحقق من عدد المنتجات.", access);
  }

  if ((count || 0) >= access.plan.maxProducts) {
    return denied("وصل الفرع إلى الحد الأعلى للمنتجات في هذه الباقة.", access);
  }

  return access;
}
