"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export type CashierTab = "pending" | "paid";
export type DiscountType = "percent" | "fixed";
export type PaymentMethod = "cash" | "mada" | "visa" | "installments";

export type BillRequest = {
  id: string;
  status: "pending" | "done";
  created_at: string;
  table_id: string | null;
  table_session_id: string | null;
  subtotal_amount: number | null;
  discount_code: string | null;
  discount_type: DiscountType | null;
  discount_value: number | null;
  discount_amount: number | null;
  paid_amount: number | null;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  transaction_reference: string | null;
  tables: {
    id: string;
    table_number: number;
    section_name: string | null;
    current_session_id: string | null;
  } | null;
};

export type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  notes: string | null;
  products: { name: string } | null;
};

export type Order = {
  id: string;
  order_number: string | null;
  status: string;
  total: number;
  notes: string | null;
  created_at: string;
  table_id: string | null;
  table_session_id: string | null;
  order_items?: OrderItem[];
};

export type CashierSession = {
  request: BillRequest;
  session_id: string | null;
  table_id: string | null;
  table_number: number | null;
  section_name: string;
  orders: Order[];
  subtotal: number;
  discountCode: string | null;
  discountType: DiscountType | null;
  discountValue: number;
  discountAmount: number;
  paidAmount: number;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  transactionReference: string | null;
};

type DiscountCode = {
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  starts_at?: string | null;
  ends_at?: string | null;
};

export function useCashier(branchId: string, selectedTableId: string | null) {
  const [activeTab, setActiveTab] = useState<CashierTab>("pending");
  const [dateFrom, setDateFrom] = useState(getTodayInputValue());
  const [dateTo, setDateTo] = useState(getTodayInputValue());
  const [sessions, setSessions] = useState<CashierSession[]>([]);
  const [discountInputs, setDiscountInputs] = useState<Record<string, string>>({});
  const [paymentMethods, setPaymentMethods] = useState<Record<string, PaymentMethod>>({});
  const [transactionRefs, setTransactionRefs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const visibleSessions = useMemo(() => {
    const byTable = selectedTableId
      ? sessions.filter((session) => session.table_id === selectedTableId)
      : sessions;

    return byTable
      .filter((session) => session.request.status === (activeTab === "pending" ? "pending" : "done"))
      .sort((a, b) => {
        const aTime = activeTab === "paid" ? a.paidAt || a.request.created_at : a.request.created_at;
        const bTime = activeTab === "paid" ? b.paidAt || b.request.created_at : b.request.created_at;
        return new Date(aTime).getTime() - new Date(bTime).getTime();
      });
  }, [sessions, selectedTableId, activeTab]);

  const pendingSessions = useMemo(
    () => sessions.filter((session) => session.request.status === "pending"),
    [sessions]
  );

  const paidSessions = useMemo(
    () => sessions.filter((session) => session.request.status === "done"),
    [sessions]
  );

  const pendingAmount = pendingSessions.reduce((sum, session) => sum + session.paidAmount, 0);
  const paidAmount = paidSessions.reduce((sum, session) => sum + session.paidAmount, 0);
  const discountAmount = sessions.reduce((sum, session) => sum + session.discountAmount, 0);

  async function loadCashierSessions(showLoader = false) {
    if (showLoader) setLoading(true);
    setMessage("");

    const { start, end } = getDateRange(dateFrom, dateTo);

    const baseSelect = `
      id,
      status,
      created_at,
      table_id,
      table_session_id,
      subtotal_amount,
      discount_code,
      discount_type,
      discount_value,
      discount_amount,
      paid_amount,
      paid_at,
      payment_method,
      transaction_reference,
      tables (
        id,
        table_number,
        section_name,
        current_session_id
      )
    `;

    const { data: pendingData, error: pendingError } = await supabase
      .from("bill_requests")
      .select(baseSelect)
      .eq("branch_id", branchId)
      .eq("status", "pending")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: true });

    const { data: paidData, error: paidError } = await supabase
      .from("bill_requests")
      .select(baseSelect)
      .eq("branch_id", branchId)
      .eq("status", "done")
      .gte("paid_at", start)
      .lt("paid_at", end)
      .order("paid_at", { ascending: true });

    if (pendingError || paidError) {
      setMessage(pendingError?.message || paidError?.message || "فشل تحميل الفواتير.");
      setSessions([]);
      setLoading(false);
      return;
    }

    const requests = [
      ...((pendingData || []) as unknown as BillRequest[]),
      ...((paidData || []) as unknown as BillRequest[]),
    ];

    const enrichedSessions = await Promise.all(requests.map(enrichBillRequest));
    setSessions(enrichedSessions);
    setLoading(false);
  }

  async function enrichBillRequest(request: BillRequest): Promise<CashierSession> {
    const sessionId = request.table_session_id || request.tables?.current_session_id || null;
    const tableId = request.table_id || request.tables?.id || null;

    let ordersQuery = supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        total,
        notes,
        created_at,
        table_id,
        table_session_id,
        order_items (
          id,
          quantity,
          price,
          notes,
          products (name)
        )
      `)
      .eq("branch_id", branchId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true });

    if (sessionId) {
      ordersQuery = ordersQuery.eq("table_session_id", sessionId);
    } else if (tableId) {
      ordersQuery = ordersQuery.eq("table_id", tableId);
    }

    const { data: ordersData } = await ordersQuery;
    const orders = (ordersData || []) as unknown as Order[];
    const computedSubtotal = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);

    const subtotal = Number(request.subtotal_amount || 0) > 0
      ? Number(request.subtotal_amount || 0)
      : computedSubtotal;
    const discountAmount = Number(request.discount_amount || 0);
    const paidAmount = Number(request.paid_amount || 0) > 0
      ? Number(request.paid_amount || 0)
      : Math.max(subtotal - discountAmount, 0);

    return {
      request,
      session_id: sessionId,
      table_id: tableId,
      table_number: request.tables?.table_number || null,
      section_name: request.tables?.section_name || "القسم الرئيسي",
      orders,
      subtotal,
      discountCode: request.discount_code,
      discountType: request.discount_type,
      discountValue: Number(request.discount_value || 0),
      discountAmount,
      paidAmount,
      paidAt: request.paid_at,
      paymentMethod: request.payment_method,
      transactionReference: request.transaction_reference,
    };
  }

  async function applyDiscount(session: CashierSession) {
    setMessage("");

    if (session.request.status !== "pending") {
      setMessage("لا يمكن تعديل الخصم بعد المحاسبة.");
      return;
    }

    const inputCode = (discountInputs[session.request.id] || "").trim().toUpperCase();

    if (!inputCode) {
      setMessage("اكتب كود الخصم أولاً.");
      return;
    }

    const now = new Date().toISOString();

    const { data: discountData, error } = await supabase
      .from("discount_codes")
      .select("code, discount_type, discount_value, active, starts_at, ends_at")
      .eq("branch_id", branchId)
      .eq("code", inputCode)
      .eq("active", true)
      .maybeSingle();

    if (error || !discountData) {
      setMessage("كود الخصم غير صحيح أو غير مفعل.");
      return;
    }

    const discount = discountData as DiscountCode;

    if (discount.starts_at && new Date(discount.starts_at).getTime() > new Date(now).getTime()) {
      setMessage("كود الخصم لم يبدأ بعد.");
      return;
    }

    if (discount.ends_at && new Date(discount.ends_at).getTime() < new Date(now).getTime()) {
      setMessage("كود الخصم منتهي.");
      return;
    }

    const subtotal = Number(session.subtotal || 0);
    const discountAmount = calculateDiscountAmount(
      subtotal,
      discount.discount_type,
      Number(discount.discount_value || 0)
    );
    const paidAmount = Math.max(subtotal - discountAmount, 0);

    const { error: updateError } = await supabase
      .from("bill_requests")
      .update({
        table_session_id: session.session_id,
        subtotal_amount: subtotal,
        discount_code: inputCode,
        discount_type: discount.discount_type,
        discount_value: Number(discount.discount_value || 0),
        discount_amount: discountAmount,
        paid_amount: paidAmount,
      })
      .eq("id", session.request.id);

    if (updateError) {
      setMessage(updateError.message);
      return;
    }

    setMessage(`تم تطبيق كود الخصم ${inputCode}.`);
    await loadCashierSessions(false);
  }

  async function removeDiscount(session: CashierSession) {
    setMessage("");

    if (session.request.status !== "pending") return;

    const { error } = await supabase
      .from("bill_requests")
      .update({
        discount_code: null,
        discount_type: null,
        discount_value: 0,
        discount_amount: 0,
        paid_amount: session.subtotal,
      })
      .eq("id", session.request.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadCashierSessions(false);
  }

  async function completePayment(session: CashierSession) {
    setMessage("");

    if (session.orders.length === 0 || session.subtotal <= 0) {
      setMessage("لا توجد طلبات فعلية على هذه الطاولة.");
      return;
    }

    const now = new Date().toISOString();
    const subtotal = Number(session.subtotal || 0);
    const paid = Math.max(subtotal - Number(session.discountAmount || 0), 0);
    const paymentMethod = paymentMethods[session.request.id] || "cash";
    const transactionReference = (transactionRefs[session.request.id] || "").trim();

    if (paymentMethod !== "cash" && !transactionReference) {
      setMessage("سجل رقم العملية قبل إنهاء المحاسبة.");
      return;
    }

    const { error: requestError } = await supabase
      .from("bill_requests")
      .update({
        status: "done",
        table_session_id: session.session_id,
        subtotal_amount: subtotal,
        discount_amount: Number(session.discountAmount || 0),
        paid_amount: paid,
        paid_at: now,
        payment_method: paymentMethod,
        transaction_reference: paymentMethod === "cash" ? null : transactionReference,
      })
      .eq("id", session.request.id);

    if (requestError) {
      setMessage(requestError.message);
      return;
    }

    if (session.session_id) {
      const { error: sessionError } = await supabase
        .from("table_sessions")
        .update({
          status: "closed",
          bill_paid_at: now,
          cleaning_started_at: now,
          closed_at: now,
        })
        .eq("id", session.session_id);

      if (sessionError) {
        setMessage(sessionError.message);
        return;
      }
    }

    if (session.table_id) {
      const { error: tableError } = await supabase
        .from("tables")
        .update({
          status: "cleaning",
          current_session_id: null,
          last_activity_at: now,
        })
        .eq("id", session.table_id);

      if (tableError) {
        setMessage(tableError.message);
        return;
      }
    }

    setSessions((current) =>
      current.map((item) =>
        item.request.id === session.request.id
          ? {
              ...item,
              request: {
                ...item.request,
                status: "done",
                paid_at: now,
                payment_method: paymentMethod,
                transaction_reference: paymentMethod === "cash" ? null : transactionReference,
              },
              paidAt: now,
              paidAmount: paid,
              paymentMethod,
              transactionReference: paymentMethod === "cash" ? null : transactionReference,
            }
          : item
      )
    );

    setMessage("تمت المحاسبة وتحويل الطاولة إلى التنظيف.");
    await loadCashierSessions(false);
  }

  function setDiscountInput(requestId: string, value: string) {
    setDiscountInputs((current) => ({ ...current, [requestId]: value }));
  }

  function setPaymentMethod(requestId: string, value: PaymentMethod) {
    setPaymentMethods((current) => ({ ...current, [requestId]: value }));
  }

  function setTransactionRef(requestId: string, value: string) {
    setTransactionRefs((current) => ({ ...current, [requestId]: value }));
  }

  useEffect(() => {
    loadCashierSessions(true);

    const channel = supabase
      .channel(`cashier-bills-${branchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bill_requests", filter: `branch_id=eq.${branchId}` },
        () => loadCashierSessions(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `branch_id=eq.${branchId}` },
        () => loadCashierSessions(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables", filter: `branch_id=eq.${branchId}` },
        () => loadCashierSessions(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId, dateFrom, dateTo]);

  return {
    activeTab,
    setActiveTab,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    visibleSessions,
    pendingSessions,
    paidSessions,
    pendingAmount,
    paidAmount,
    discountAmount,
    discountInputs,
    paymentMethods,
    transactionRefs,
    message,
    loading,
    applyDiscount,
    removeDiscount,
    completePayment,
    setDiscountInput,
    setPaymentMethod,
    setTransactionRef,
  };
}

export function calculateDiscountAmount(subtotal: number, type: DiscountType, value: number) {
  if (type === "percent") return Math.min(subtotal * (Math.max(value, 0) / 100), subtotal);
  return Math.min(Math.max(value, 0), subtotal);
}

export function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDateRange(fromValue: string, toValue: string) {
  const startDate = new Date(`${fromValue}T00:00:00`);
  const endDate = new Date(`${toValue || fromValue}T00:00:00`);
  endDate.setDate(endDate.getDate() + 1);
  return { start: startDate.toISOString(), end: endDate.toISOString() };
}

export function getPaymentMethodLabel(method: PaymentMethod | null) {
  if (method === "mada") return "مدى";
  if (method === "visa") return "فيزا";
  if (method === "installments") return "أقساط";
  return "كاش";
}

export function formatMoney(value: number) {
  return `${Number(value || 0).toFixed(2)} ريال`;
}

export function formatTime(date: string | null) {
  if (!date) return "غير محدد";
  return new Date(date).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}
