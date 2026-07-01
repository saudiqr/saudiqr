"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { playSound } from "@/lib/playSound";
import { supabase } from "@/lib/supabase";

export type ActiveWaiterTab = "all" | "ready" | "bills" | "calls" | "cleaning";
export type ItemStatus = "pending" | "preparing" | "ready" | "picked_up" | "delivered" | "cancelled";
export type ServiceMode = "once" | "staged";

export type TableInfo = {
  id?: string;
  table_number: number;
  section_name: string | null;
  current_session_id?: string | null;
  status?: string | null;
};

export type OrderItem = {
  id: string;
  quantity: number;
  notes: string | null;
  status: ItemStatus;
  ready_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  products: {
    name: string;
  } | null;
};

export type ReadyOrder = {
  id: string;
  order_number: string | null;
  service_mode: ServiceMode;
  status: string;
  created_at: string;
  table_id: string | null;
  table_session_id: string | null;
  tables: TableInfo | null;
  order_items: OrderItem[];
};

export type ReadyTask = {
  id: string;
  mode: ServiceMode;
  orderId: string;
  orderNumber: string | null;
  table: TableInfo | null;
  tableSessionId: string | null;
  createdAt: string;
  readyAt: string | null;
  title: string;
  subtitle: string;
  items: OrderItem[];
  status: "ready" | "picked_up";
};

export type WaiterCall = {
  id: string;
  status: "pending" | "done";
  created_at: string;
  tables: TableInfo | null;
};

export type BillRequest = {
  id: string;
  status: "pending" | "done";
  created_at: string;
  tables: TableInfo | null;
};

export type CleaningTable = {
  id: string;
  table_number: number;
  section_name: string | null;
  status: string | null;
  current_session_id: string | null;
  last_activity_at: string | null;
};

export type WaiterOperationTask =
  | {
      id: string;
      type: "ready";
      priority: number;
      createdAt: string;
      readyTask: ReadyTask;
    }
  | {
      id: string;
      type: "bills";
      priority: number;
      createdAt: string;
      bill: BillRequest;
    }
  | {
      id: string;
      type: "calls";
      priority: number;
      createdAt: string;
      call: WaiterCall;
    }
  | {
      id: string;
      type: "cleaning";
      priority: number;
      createdAt: string;
      table: CleaningTable;
    };

export function useWaiter(branchId: string) {
  const [orders, setOrders] = useState<ReadyOrder[]>([]);
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [bills, setBills] = useState<BillRequest[]>([]);
  const [cleaningTables, setCleaningTables] = useState<CleaningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const playedIds = useRef(new Set<string>());

  const readyTasks = useMemo(() => buildReadyTasks(orders), [orders]);
  const readyCount = readyTasks.filter((task) => task.status === "ready").length;
  const pickedUpCount = readyTasks.filter((task) => task.status === "picked_up").length;
  const allTasks = useMemo(
    () => buildAllWaiterTasks(readyTasks, bills, calls, cleaningTables),
    [readyTasks, bills, calls, cleaningTables],
  );

  async function loadReadyOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        service_mode,
        status,
        created_at,
        table_id,
        table_session_id,
        tables (
          id,
          table_number,
          section_name,
          current_session_id,
          status
        ),
        order_items (
          id,
          quantity,
          notes,
          status,
          ready_at,
          picked_up_at,
          delivered_at,
          products (
            name
          )
        )
      `)
      .eq("branch_id", branchId)
      .in("status", ["preparing", "ready", "delivered"])
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(error.message);
      setOrders([]);
      return;
    }

    setOrders((data || []) as unknown as ReadyOrder[]);
  }

  async function loadCalls() {
    const { data, error } = await supabase
      .from("waiter_calls")
      .select(`
        id,
        status,
        created_at,
        tables (
          id,
          table_number,
          section_name,
          current_session_id,
          status
        )
      `)
      .eq("branch_id", branchId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(error.message);
      setCalls([]);
      return;
    }

    setCalls((data || []) as unknown as WaiterCall[]);
  }

  async function loadBills() {
    const { data, error } = await supabase
      .from("bill_requests")
      .select(`
        id,
        status,
        created_at,
        tables (
          id,
          table_number,
          section_name,
          current_session_id,
          status
        )
      `)
      .eq("branch_id", branchId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(error.message);
      setBills([]);
      return;
    }

    setBills((data || []) as unknown as BillRequest[]);
  }

  async function loadCleaningTables() {
    const { data, error } = await supabase
      .from("tables")
      .select("id, table_number, section_name, status, current_session_id, last_activity_at")
      .eq("branch_id", branchId)
      .eq("status", "cleaning")
      .order("table_number", { ascending: true });

    if (error) {
      setMessage(error.message);
      setCleaningTables([]);
      return;
    }

    setCleaningTables((data || []) as CleaningTable[]);
  }

  async function loadAll() {
    await Promise.all([loadReadyOrders(), loadCalls(), loadBills(), loadCleaningTables()]);
    setLoading(false);
  }

  function patchItemStatuses(
    itemIds: string[],
    status: ItemStatus,
    dateField: "picked_up_at" | "delivered_at"
  ) {
    const now = new Date().toISOString();

    setOrders((currentOrders) =>
      currentOrders.map((order) => ({
        ...order,
        order_items: (order.order_items || []).map((item) =>
          itemIds.includes(item.id)
            ? {
                ...item,
                status,
                [dateField]: now,
              }
            : item
        ),
      }))
    );
  }

  async function markItemsPickedUp(task: ReadyTask) {
    setMessage("");

    const readyItemIds = task.items
      .filter((item) => item.status === "ready")
      .map((item) => item.id);

    if (readyItemIds.length === 0) return;

    patchItemStatuses(readyItemIds, "picked_up", "picked_up_at");

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("order_items")
      .update({ status: "picked_up", picked_up_at: now })
      .in("id", readyItemIds);

    if (error) {
      setMessage(error.message);
      await loadReadyOrders();
      return;
    }

    await loadReadyOrders();
  }

  async function markItemsDelivered(task: ReadyTask) {
    setMessage("");

    const deliverableItemIds = task.items
      .filter((item) => item.status === "picked_up" || item.status === "ready")
      .map((item) => item.id);

    if (deliverableItemIds.length === 0) return;

    patchItemStatuses(deliverableItemIds, "delivered", "delivered_at");

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("order_items")
      .update({ status: "delivered", delivered_at: now })
      .in("id", deliverableItemIds);

    if (error) {
      setMessage(error.message);
      await loadReadyOrders();
      return;
    }

    await syncOrderStatusAfterDelivery(task.orderId);
    await loadReadyOrders();
  }

  async function syncOrderStatusAfterDelivery(orderId: string) {
    const { data } = await supabase
      .from("order_items")
      .select("id, status")
      .eq("order_id", orderId)
      .neq("status", "cancelled");

    const items = (data || []) as { id: string; status: ItemStatus }[];
    if (items.length === 0) return;

    const allDelivered = items.every((item) => item.status === "delivered");
    const allReadyOrAfter = items.every((item) =>
      ["ready", "picked_up", "delivered"].includes(item.status)
    );

    if (allDelivered) {
      await supabase.from("orders").update({ status: "delivered" }).eq("id", orderId);
      return;
    }

    if (allReadyOrAfter) {
      await supabase.from("orders").update({ status: "ready" }).eq("id", orderId);
    }
  }

  async function completeCall(callId: string) {
    setMessage("");

    setCalls((currentCalls) => currentCalls.filter((call) => call.id !== callId));

    const { error } = await supabase
      .from("waiter_calls")
      .update({ status: "done" })
      .eq("id", callId);

    if (error) {
      setMessage(error.message);
      await loadCalls();
      return;
    }

    await loadCalls();
  }

  function completeBillRequest(bill: BillRequest) {
    setMessage(
      `تم إبلاغ الكاشير بطاولة ${bill.tables?.table_number || "غير محددة"}. الفاتورة تبقى عند الكاشير حتى تتم المحاسبة.`
    );
  }

  async function finishCleaning(table: CleaningTable) {
    setMessage("");

    setCleaningTables((currentTables) => currentTables.filter((item) => item.id !== table.id));

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("tables")
      .update({
        status: "available",
        current_session_id: null,
        cleaned_at: now,
        last_activity_at: now,
      })
      .eq("id", table.id);

    if (error) {
      setMessage(error.message);
      await loadCleaningTables();
      return;
    }

    await loadCleaningTables();
  }

  useEffect(() => {
    if (!branchId) return;

    let mounted = true;

    async function init() {
      setLoading(true);
      await loadAll();
      if (mounted) setLoading(false);
    }

    init();

    const channel = supabase
      .channel(`waiter-operations-${branchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        (payload) => {
          const newRow = payload.new as { id?: string; status?: string };
          if (newRow?.status === "ready" && newRow.id && !playedIds.current.has(newRow.id)) {
            playedIds.current.add(newRow.id);
            playSound("new-order");
          }
          loadReadyOrders();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `branch_id=eq.${branchId}` },
        () => loadReadyOrders()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waiter_calls", filter: `branch_id=eq.${branchId}` },
        (payload) => {
          const newCall = payload.new as { id?: string };
          if (payload.eventType === "INSERT" && newCall.id && !playedIds.current.has(newCall.id)) {
            playedIds.current.add(newCall.id);
            playSound("waiter-call");
          }
          loadCalls();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bill_requests", filter: `branch_id=eq.${branchId}` },
        () => loadBills()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables", filter: `branch_id=eq.${branchId}` },
        () => loadCleaningTables()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [branchId]);

  return {
    orders,
    calls,
    bills,
    cleaningTables,
    readyTasks,
    allTasks,
    readyCount,
    pickedUpCount,
    loading,
    message,
    setMessage,
    loadAll,
    loadReadyOrders,
    loadCalls,
    loadBills,
    loadCleaningTables,
    markItemsPickedUp,
    markItemsDelivered,
    completeCall,
    completeBillRequest,
    finishCleaning,
  };
}

function buildReadyTasks(orders: ReadyOrder[]) {
  const tasks: ReadyTask[] = [];

  orders.forEach((order) => {
    const items = (order.order_items || []).filter(
      (item) => item.status !== "cancelled" && item.status !== "delivered"
    );

    if (items.length === 0) return;

    if (order.service_mode === "staged") {
      items
        .filter((item) => item.status === "ready" || item.status === "picked_up")
        .forEach((item) => {
          tasks.push({
            id: `item-${item.id}`,
            mode: "staged",
            orderId: order.id,
            orderNumber: order.order_number,
            table: order.tables,
            tableSessionId: order.table_session_id,
            createdAt: order.created_at,
            readyAt: item.ready_at,
            title: item.products?.name || "منتج غير معروف",
            subtitle: `دفعة مستقلة · ${item.quantity}×`,
            items: [item],
            status: item.status === "picked_up" ? "picked_up" : "ready",
          });
        });

      return;
    }

    const hasPendingKitchenWork = items.some(
      (item) => item.status === "pending" || item.status === "preparing"
    );
    const visibleItems = items.filter(
      (item) => item.status === "ready" || item.status === "picked_up"
    );

    if (hasPendingKitchenWork || visibleItems.length === 0) return;

    tasks.push({
      id: `order-${order.id}`,
      mode: "once",
      orderId: order.id,
      orderNumber: order.order_number,
      table: order.tables,
      tableSessionId: order.table_session_id,
      createdAt: order.created_at,
      readyAt: getLatestReadyAt(visibleItems),
      title: "الطلب كامل جاهز",
      subtitle: `${visibleItems.length} منتج · تقديم مرة واحدة`,
      items: visibleItems,
      status: visibleItems.every((item) => item.status === "picked_up") ? "picked_up" : "ready",
    });
  });

  return tasks.sort(
    (a, b) =>
      new Date(a.readyAt || a.createdAt).getTime() -
      new Date(b.readyAt || b.createdAt).getTime()
  );
}

function getLatestReadyAt(items: OrderItem[]) {
  const timestamps = items
    .map((item) => item.ready_at)
    .filter(Boolean)
    .map((date) => new Date(date as string).getTime());

  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}


function buildAllWaiterTasks(
  readyTasks: ReadyTask[],
  bills: BillRequest[],
  calls: WaiterCall[],
  cleaningTables: CleaningTable[],
): WaiterOperationTask[] {
  const tasks: WaiterOperationTask[] = [
    ...calls.map((call) => ({
      id: `call-${call.id}`,
      type: "calls" as const,
      priority: 1,
      createdAt: call.created_at,
      call,
    })),
    ...readyTasks.map((readyTask) => ({
      id: `ready-${readyTask.id}`,
      type: "ready" as const,
      priority: 2,
      createdAt: readyTask.readyAt || readyTask.createdAt,
      readyTask,
    })),
    ...bills.map((bill) => ({
      id: `bill-${bill.id}`,
      type: "bills" as const,
      priority: 3,
      createdAt: bill.created_at,
      bill,
    })),
    ...cleaningTables.map((table) => ({
      id: `cleaning-${table.id}`,
      type: "cleaning" as const,
      priority: 4,
      createdAt: table.last_activity_at || new Date(0).toISOString(),
      table,
    })),
  ];

  return tasks.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
