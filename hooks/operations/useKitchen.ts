"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSubscriptionAccessByBranchId } from "@/lib/subscriptionAccess";

export type OrderStatus = "preparing" | "ready" | "delivered";
export type ItemStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "picked_up"
  | "delivered"
  | "cancelled";
export type ServiceMode = "once" | "staged";

export type KitchenOrderItem = {
  id: string;
  quantity: number;
  price: number;
  notes: string | null;
  status: ItemStatus | null;
  prepared_at: string | null;
  ready_at: string | null;
  products: {
    name: string;
  } | null;
};

export type KitchenOrder = {
  id: string;
  order_number: string | null;
  status: OrderStatus;
  service_mode: ServiceMode | null;
  total: number;
  notes: string | null;
  created_at: string;
  table_session_id: string | null;
  tables: {
    table_number: number;
    section_name: string | null;
  } | null;
  order_items?: KitchenOrderItem[];
};

export const itemStatusConfig: Record<
  ItemStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  pending: {
    label: "بانتظار التحضير",
    color: "#F3C77D",
    bg: "rgba(198,138,61,0.12)",
    border: "rgba(198,138,61,0.38)",
  },
  preparing: {
    label: "جاري التحضير",
    color: "#FFF8F0",
    bg: "rgba(255,248,240,0.08)",
    border: "rgba(200,182,164,0.24)",
  },
  ready: {
    label: "جاهز للاستلام",
    color: "#9DE7B4",
    bg: "rgba(63,163,108,0.14)",
    border: "rgba(63,163,108,0.38)",
  },
  picked_up: {
    label: "استلمه النادل",
    color: "#C8B6A4",
    bg: "rgba(200,182,164,0.10)",
    border: "rgba(200,182,164,0.26)",
  },
  delivered: {
    label: "تم التسليم",
    color: "#C8B6A4",
    bg: "rgba(200,182,164,0.10)",
    border: "rgba(200,182,164,0.26)",
  },
  cancelled: {
    label: "ملغي",
    color: "#F3B0B0",
    bg: "rgba(201,79,79,0.14)",
    border: "rgba(201,79,79,0.42)",
  },
};

export const kitchenFilters: { label: string; value: "all" | ItemStatus }[] = [
  { label: "الكل", value: "all" },
  { label: "بانتظار", value: "pending" },
  { label: "تحضير", value: "preparing" },
  { label: "جاهزة", value: "ready" },
  { label: "استلمها النادل", value: "picked_up" },
];

export function useKitchen(branchId: string) {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [filter, setFilter] = useState<"all" | ItemStatus>("all");
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessDeniedReason, setAccessDeniedReason] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const visibleOrders = useMemo(() => {
    return orders
      .map((order) => ({
        ...order,
        order_items: (order.order_items || []).filter((item) => {
          const status = item.status || "pending";
          if (status === "cancelled") return false;
          if (filter === "all") return status !== "delivered";
          return status === filter;
        }),
      }))
      .filter((order) => (order.order_items || []).length > 0);
  }, [orders, filter]);

  const allItems = orders.flatMap((order) => order.order_items || []);
  const pendingCount = allItems.filter((item) => (item.status || "pending") === "pending").length;
  const preparingCount = allItems.filter((item) => item.status === "preparing").length;
  const readyCount = allItems.filter((item) => item.status === "ready").length;
  const pickedUpCount = allItems.filter((item) => item.status === "picked_up").length;

  async function loadOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        service_mode,
        total,
        notes,
        created_at,
        table_session_id,
        tables (
          table_number,
          section_name
        ),
        order_items (
          id,
          quantity,
          price,
          notes,
          status,
          prepared_at,
          ready_at,
          products (
            name
          )
        )
      `)
      .eq("branch_id", branchId)
      .in("status", ["preparing", "ready"])
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(error.message);
      setOrders([]);
      return;
    }

    setOrders((data ?? []) as unknown as KitchenOrder[]);
  }

  async function addAuditLog(orderId: string, action: string, details?: string) {
    await supabase.from("order_audit_logs").insert({
      order_id: orderId,
      branch_id: branchId,
      action,
      details: details || null,
    });
  }

  async function refreshOrderStatus(order: KitchenOrder) {
    const { data: itemsData } = await supabase
      .from("order_items")
      .select("id, status")
      .eq("order_id", order.id)
      .neq("status", "cancelled");

    const items = (itemsData || []) as { id: string; status: ItemStatus | null }[];
    const hasItems = items.length > 0;
    const allReadyOrLater =
      hasItems &&
      items.every((item) => ["ready", "picked_up", "delivered"].includes(item.status || "pending"));
    const allDelivered = hasItems && items.every((item) => item.status === "delivered");

    if (allDelivered) {
      await supabase.from("orders").update({ status: "delivered" }).eq("id", order.id);
      return;
    }

    if (allReadyOrLater) {
      await supabase.from("orders").update({ status: "ready" }).eq("id", order.id);
      if (order.table_session_id) {
        await supabase
          .from("table_sessions")
          .update({ ready_at: new Date().toISOString() })
          .eq("id", order.table_session_id)
          .is("ready_at", null);
      }
      return;
    }

    if (order.status !== "preparing") {
      await supabase.from("orders").update({ status: "preparing" }).eq("id", order.id);
    }
  }

  async function updateItemStatus(order: KitchenOrder, item: KitchenOrderItem, status: ItemStatus) {
    setMessage("");
    const now = new Date().toISOString();
    const updates: Record<string, string | null> = { status };

    if (status === "preparing") updates.prepared_at = now;
    if (status === "ready") updates.ready_at = now;

    const { error } = await supabase.from("order_items").update(updates).eq("id", item.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await addAuditLog(
      order.id,
      status === "ready" ? "item_ready" : "item_status_changed",
      `${item.products?.name || "منتج غير معروف"} أصبح ${itemStatusConfig[status].label}`
    );

    await refreshOrderStatus(order);
    await loadOrders();
  }

  async function markWholeOrderReady(order: KitchenOrder) {
    setMessage("");
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("order_items")
      .update({ status: "ready", ready_at: now })
      .eq("order_id", order.id)
      .not("status", "in", "(ready,picked_up,delivered,cancelled)");

    if (error) {
      setMessage(error.message);
      return;
    }

    await addAuditLog(order.id, "order_ready_once", "تم تجهيز الطلب كامل دفعة واحدة");
    await refreshOrderStatus(order);
    await loadOrders();
  }

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initKitchen() {
      setCheckingAccess(true);
      setAccessDeniedReason(null);

      const access = await getSubscriptionAccessByBranchId(branchId, "kitchen");
      if (!mounted) return;

      if (!access.allowed) {
        setOrders([]);
        setAccessDeniedReason(access.reason || "غير متاح في الباقة الحالية.");
        setCheckingAccess(false);
        return;
      }

      await loadOrders();
      if (!mounted) return;

      channel = supabase
        .channel(`kitchen-items-${branchId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders", filter: `branch_id=eq.${branchId}` },
          () => loadOrders()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "order_items" },
          () => loadOrders()
        )
        .subscribe();

      setCheckingAccess(false);
    }

    initKitchen();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [branchId]);

  return {
    orders,
    visibleOrders,
    filter,
    setFilter,
    checkingAccess,
    accessDeniedReason,
    message,
    pendingCount,
    preparingCount,
    readyCount,
    pickedUpCount,
    updateItemStatus,
    markWholeOrderReady,
    loadOrders,
  };
}
