"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  formatYen,
  formatDate,
  validateExpenseForm,
  STATUS_LABELS,
  type ExpenseForm,
} from "@/lib/expense-utils";

// ---------- Types ----------

interface Applicant {
  id: string;
  name: string;
  email: string;
  department: string;
}

interface Category {
  id: string;
  code: string;
  name: string;
}

export interface SerializedExpense {
  id: string;
  applicantId: string;
  categoryId: string;
  title: string;
  description: string | null;
  amount: number;
  taxAmount: number;
  taxRate: number;
  date: string;
  vendor: string | null;
  receiptUrl: string | null;
  status: string;
  approverId: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  settledAt: string | null;
  fiscalYear: number;
  fiscalMonth: number;
  createdAt: string;
  updatedAt: string;
  applicant: Applicant;
  category: Category;
}

type SortKey = "title" | "date" | "category" | "amount" | "status" | "applicant";
type SortDirection = "asc" | "desc";

interface Props {
  expenses: SerializedExpense[];
  categories: Category[];
  summary: {
    todayTotal: number;
    monthlyTotal: number;
    yearlyTotal: number;
  };
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "title", label: "件名" },
  { key: "date", label: "利用日" },
  { key: "category", label: "カテゴリ" },
  { key: "amount", label: "金額" },
  { key: "status", label: "ステータス" },
  { key: "applicant", label: "申請者" },
];

const ITEMS_PER_PAGE = 10;

const initialForm: ExpenseForm = {
  date: "",
  item: "",
  type: "",
  details: "",
  transportation: "",
  route: "",
  tripType: "",
  amount: "",
  receipt: "",
  attachment: null,
};

// ---------- Toast Component ----------

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2" aria-live="polite" aria-label="通知">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-in ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="ml-2 hover:opacity-80 transition-opacity"
            aria-label="通知を閉じる"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------- Component ----------

export function ExpenseList({ expenses, categories, summary }: Props) {
  const { data: session } = useSession();
  const router = useRouter();

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((message: string, type: "success" | "error") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Modal state (新規登録 / 編集 共用)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<SerializedExpense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(initialForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ExpenseForm, string>>>({});
  const [submitError, setSubmitError] = useState("");

  // 削除確認ダイアログ state
  const [deleteTarget, setDeleteTarget] = useState<SerializedExpense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Refs for focus management
  const modalRef = useRef<HTMLDivElement>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // ---------- Keyboard handlers ----------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deleteTarget && !isDeleting) {
          setDeleteTarget(null);
        } else if (isModalOpen && !isSubmitting) {
          handleCloseModal();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, isSubmitting, deleteTarget, isDeleting]);

  // Focus trap: move focus into modal/dialog when opened
  useEffect(() => {
    if (isModalOpen && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector<HTMLElement>(
        'input, select, button, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (deleteTarget && deleteDialogRef.current) {
      const cancelBtn = deleteDialogRef.current.querySelector<HTMLElement>("button");
      cancelBtn?.focus();
    }
  }, [deleteTarget]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isModalOpen || deleteTarget) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isModalOpen, deleteTarget]);

  const handleFormChange = (field: keyof ExpenseForm, value: string | File | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setSubmitError("");
  };

  const validateForm = (): boolean => {
    const errors = validateExpenseForm(form);
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    if (!session?.user?.id) {
      setSubmitError("ログイン情報が取得できません。再ログインしてください。");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      let receiptUrl: string | null = null;
      if (form.attachment) {
        const uploadData = new FormData();
        uploadData.append("file", form.attachment);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadData,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          setSubmitError(err.error || "ファイルのアップロードに失敗しました");
          return;
        }
        const uploaded = await uploadRes.json();
        receiptUrl = uploaded.url;
      }

      const selectedCategory = categories.find((c) => c.id === form.item);
      const categoryName = selectedCategory?.name ?? "";
      const expenseDate = new Date(form.date);

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: "user-001",
          categoryId: form.item,
          title: `${categoryName} ${form.details}`.trim(),
          description: form.details || null,
          amount: Number(form.amount),
          date: form.date,
          vendor: form.route || null,
          receiptUrl,
          fiscalYear: expenseDate.getFullYear(),
          fiscalMonth: expenseDate.getMonth() + 1,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setSubmitError(err.error || "登録に失敗しました");
        return;
      }

      setIsModalOpen(false);
      setForm(initialForm);
      setFormErrors({});
      setSubmitError("");
      addToast("経費データを登録しました", "success");
      router.refresh();
    } catch {
      setSubmitError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
    setForm(initialForm);
    setFormErrors({});
    setSubmitError("");
    triggerRef.current?.focus();
  };

  const handleEdit = (expense: SerializedExpense) => {
    setEditingExpense(expense);
    setForm({
      date: expense.date.slice(0, 10),
      item: expense.categoryId,
      type: "",
      details: expense.description ?? "",
      transportation: "",
      route: expense.vendor ?? "",
      tripType: "",
      amount: String(expense.amount),
      receipt: expense.receiptUrl ? "あり" : "なし",
      attachment: null,
    });
    setFormErrors({});
    setSubmitError("");
    setIsModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!validateForm() || !editingExpense) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      let receiptUrl: string | null | undefined = undefined;
      if (form.attachment) {
        const uploadData = new FormData();
        uploadData.append("file", form.attachment);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadData,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          setSubmitError(err.error || "ファイルのアップロードに失敗しました");
          return;
        }
        const uploaded = await uploadRes.json();
        receiptUrl = uploaded.url;
      }

      const selectedCategory = categories.find((c) => c.id === form.item);
      const categoryName = selectedCategory?.name ?? "";
      const expenseDate = new Date(form.date);

      const body: Record<string, unknown> = {
        categoryId: form.item,
        title: `${categoryName} ${form.details}`.trim(),
        description: form.details || null,
        amount: Number(form.amount),
        date: form.date,
        vendor: form.route || null,
        fiscalYear: expenseDate.getFullYear(),
        fiscalMonth: expenseDate.getMonth() + 1,
      };
      if (receiptUrl !== undefined) body.receiptUrl = receiptUrl;

      const res = await fetch(`/api/expenses/${editingExpense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setSubmitError(err.error || "更新に失敗しました");
        return;
      }

      handleCloseModal();
      addToast("経費データを更新しました", "success");
      router.refresh();
    } catch {
      setSubmitError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/expenses/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        setDeleteError(err.error || "削除に失敗しました");
        return;
      }

      setDeleteTarget(null);
      addToast("経費データを削除しました", "success");
      router.refresh();
    } catch {
      setDeleteError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // ---------- Filter ----------

  const filteredData = useMemo(() => {
    let data = expenses;

    if (filterStatus) {
      data = data.filter((e) => e.status === filterStatus);
    }
    if (filterCategory) {
      data = data.filter((e) => e.categoryId === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description ?? "").toLowerCase().includes(q) ||
          (e.vendor ?? "").toLowerCase().includes(q) ||
          e.applicant.name.toLowerCase().includes(q) ||
          e.category.name.toLowerCase().includes(q) ||
          String(e.amount).includes(q)
      );
    }

    return data;
  }, [expenses, searchQuery, filterStatus, filterCategory]);

  // ---------- Sort ----------

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortKey) {
        case "title":
          aVal = a.title;
          bVal = b.title;
          break;
        case "date":
          aVal = a.date;
          bVal = b.date;
          break;
        case "category":
          aVal = a.category.name;
          bVal = b.category.name;
          break;
        case "amount":
          aVal = a.amount;
          bVal = b.amount;
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "applicant":
          aVal = a.applicant.name;
          bVal = b.applicant.name;
          break;
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal), "ja")
        : String(bVal).localeCompare(String(aVal), "ja");
    });
  }, [filteredData, sortKey, sortDirection]);

  // ---------- Pagination ----------

  const totalPages = Math.max(1, Math.ceil(sortedData.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = sortedData.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  const startItem = sortedData.length === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(safeCurrentPage * ITEMS_PER_PAGE, sortedData.length);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, safeCurrentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [safeCurrentPage, totalPages]);

  // ---------- Handlers ----------

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setFilterStatus("");
    setFilterCategory("");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || filterStatus || filterCategory;

  const getAriaSort = (key: SortKey): "ascending" | "descending" | "none" => {
    if (sortKey !== key) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  };

  // ---------- Render ----------

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 3h18v18H3z" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
              <h1 className="text-xl font-bold text-white tracking-wide">Bridge System</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white text-sm font-medium hidden sm:block">
                {session?.user?.name ?? "ユーザー"}
              </span>
              <div className="w-9 h-9 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white font-bold text-sm" aria-hidden="true">
                {session?.user?.name?.slice(0, 2) ?? "--"}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-white/80 hover:text-white text-sm font-medium bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary Cards */}
        <section aria-label="合計金額サマリー" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">当日合計</p>
                <p className="text-xl font-bold text-gray-900">{formatYen(summary.todayTotal)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">当月合計</p>
                <p className="text-xl font-bold text-gray-900">{formatYen(summary.monthlyTotal)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">当年合計</p>
                <p className="text-xl font-bold text-gray-900">{formatYen(summary.yearlyTotal)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Title + Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <h2 className="text-2xl font-bold text-gray-800">精算一覧</h2>
          <button
            ref={triggerRef}
            onClick={() => { setEditingExpense(null); setForm(initialForm); setFormErrors({}); setSubmitError(""); setIsModalOpen(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            新規登録
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4" role="search" aria-label="経費フィルター">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="search"
              aria-label="経費を検索"
              placeholder="件名・申請者・支払先で検索..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-sm"
            />
          </div>

          {/* Status filter */}
          <select
            aria-label="ステータスで絞り込み"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          >
            <option value="">全ステータス</option>
            {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* Category filter */}
          <select
            aria-label="カテゴリで絞り込み"
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          >
            <option value="">全カテゴリ</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Reset */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              クリア
            </button>
          )}
        </div>

        {/* Filtered count */}
        {hasActiveFilters && (
          <p className="text-sm text-gray-500 mb-3" aria-live="polite">
            {sortedData.length}件がヒット（全{expenses.length}件中）
          </p>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="経費一覧">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={getAriaSort(col.key)}
                      onClick={() => handleSort(col.key)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort(col.key); } }}
                      tabIndex={0}
                      role="columnheader"
                      className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap select-none"
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <span className="text-gray-400 text-xs" aria-hidden="true">
                          {sortKey === col.key
                            ? sortDirection === "asc"
                              ? "▲"
                              : "▼"
                            : "⇅"}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                    領収書
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length + 2} className="px-4 py-12 text-center text-gray-500">
                      データが見つかりません
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, idx) => {
                    const statusInfo = STATUS_LABELS[row.status] ?? { label: row.status, color: "bg-gray-100 text-gray-700" };
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-gray-100 hover:bg-emerald-50/50 transition-colors ${
                          idx % 2 === 1 ? "bg-gray-50/50" : "bg-white"
                        }`}
                      >
                        <td className="px-4 py-3 text-gray-900 font-medium max-w-[200px] truncate">
                          {row.title}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                          {formatDate(row.date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            {row.category.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-medium text-gray-900">
                          {formatYen(row.amount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                          {row.applicant.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.receiptUrl ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              あり
                            </span>
                          ) : (
                            <span className="text-gray-400">なし</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(row)}
                              aria-label={`${row.title} を編集`}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition-colors"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => { setDeleteTarget(row); setDeleteError(""); }}
                              aria-label={`${row.title} を削除`}
                              className="text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded transition-colors"
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <nav aria-label="ページネーション" className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 gap-3">
            <p className="text-sm text-gray-600" aria-live="polite">
              {sortedData.length}件中 {startItem}〜{endItem}件を表示
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                aria-label="前のページ"
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                前へ
              </button>
              {pageNumbers.map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  aria-label={`${page}ページ目`}
                  aria-current={safeCurrentPage === page ? "page" : undefined}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    safeCurrentPage === page
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "border-gray-300 bg-white hover:bg-gray-50"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                aria-label="次のページ"
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                次へ
              </button>
            </div>
          </nav>
        </div>
      </main>

      {/* Registration / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseModal} aria-hidden="true" />
          <div ref={modalRef} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl px-6 py-4 flex items-center justify-between">
              <h3 id="modal-title" className="text-lg font-bold text-white">{editingExpense ? "経費精算 編集" : "経費精算 新規登録"}</h3>
              <button
                onClick={handleCloseModal}
                aria-label="モーダルを閉じる"
                className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => { e.preventDefault(); if (editingExpense) { handleUpdate(); } else { handleRegister(); } }}
              className="px-6 py-5 space-y-5"
              noValidate
            >
              {/* 月日（必須） */}
              <div>
                <label htmlFor="field-date" className="block text-sm font-semibold text-gray-700 mb-1">
                  月日 <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="field-date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => handleFormChange("date", e.target.value)}
                  aria-invalid={!!formErrors.date}
                  aria-describedby={formErrors.date ? "error-date" : undefined}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${
                    formErrors.date ? "border-red-400 bg-red-50" : "border-gray-300"
                  }`}
                />
                {formErrors.date && <p id="error-date" className="mt-1 text-xs text-red-500" role="alert">{formErrors.date}</p>}
              </div>

              {/* 精算項目（必須） */}
              <div>
                <label htmlFor="field-item" className="block text-sm font-semibold text-gray-700 mb-1">
                  精算項目 <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <select
                  id="field-item"
                  required
                  value={form.item}
                  onChange={(e) => handleFormChange("item", e.target.value)}
                  aria-invalid={!!formErrors.item}
                  aria-describedby={formErrors.item ? "error-item" : undefined}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white ${
                    formErrors.item ? "border-red-400 bg-red-50" : "border-gray-300"
                  }`}
                >
                  <option value="">選択してください</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {formErrors.item && <p id="error-item" className="mt-1 text-xs text-red-500" role="alert">{formErrors.item}</p>}
              </div>

              {/* 種別 */}
              <div>
                <label htmlFor="field-type" className="block text-sm font-semibold text-gray-700 mb-1">種別</label>
                <input
                  id="field-type"
                  type="text"
                  value={form.type}
                  onChange={(e) => handleFormChange("type", e.target.value)}
                  placeholder="例: 経費"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* 詳細（必須） */}
              <div>
                <label htmlFor="field-details" className="block text-sm font-semibold text-gray-700 mb-1">
                  詳細 <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="field-details"
                  type="text"
                  required
                  value={form.details}
                  onChange={(e) => handleFormChange("details", e.target.value)}
                  placeholder="例: 客先訪問のため"
                  aria-invalid={!!formErrors.details}
                  aria-describedby={formErrors.details ? "error-details" : undefined}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${
                    formErrors.details ? "border-red-400 bg-red-50" : "border-gray-300"
                  }`}
                />
                {formErrors.details && <p id="error-details" className="mt-1 text-xs text-red-500" role="alert">{formErrors.details}</p>}
              </div>

              {/* 交通手段 */}
              <fieldset>
                <legend className="block text-sm font-semibold text-gray-700 mb-1">交通手段</legend>
                <div className="flex flex-wrap gap-4 mt-1">
                  {["電車", "バス", "その他", "作業車"].map((option) => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="transportation"
                        value={option}
                        checked={form.transportation === option}
                        onChange={(e) => handleFormChange("transportation", e.target.value)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* 経由 */}
              <div>
                <label htmlFor="field-route" className="block text-sm font-semibold text-gray-700 mb-1">経由</label>
                <input
                  id="field-route"
                  type="text"
                  value={form.route}
                  onChange={(e) => handleFormChange("route", e.target.value)}
                  placeholder="例: 東京→横浜"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* 片道/往復 */}
              <fieldset>
                <legend className="block text-sm font-semibold text-gray-700 mb-1">片道/往復</legend>
                <div className="flex gap-4 mt-1">
                  {["片道", "往復"].map((option) => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tripType"
                        value={option}
                        checked={form.tripType === option}
                        onChange={(e) => handleFormChange("tripType", e.target.value)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* 金額（必須） */}
              <div>
                <label htmlFor="field-amount" className="block text-sm font-semibold text-gray-700 mb-1">
                  金額 <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm" aria-hidden="true">¥</span>
                  <input
                    id="field-amount"
                    type="number"
                    required
                    value={form.amount}
                    onChange={(e) => handleFormChange("amount", e.target.value)}
                    placeholder="0"
                    min="1"
                    aria-invalid={!!formErrors.amount}
                    aria-describedby={formErrors.amount ? "error-amount" : undefined}
                    className={`w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${
                      formErrors.amount ? "border-red-400 bg-red-50" : "border-gray-300"
                    }`}
                  />
                </div>
                {formErrors.amount && <p id="error-amount" className="mt-1 text-xs text-red-500" role="alert">{formErrors.amount}</p>}
              </div>

              {/* 領収書 */}
              <fieldset>
                <legend className="block text-sm font-semibold text-gray-700 mb-1">領収書</legend>
                <div className="flex gap-4 mt-1">
                  {["あり", "なし"].map((option) => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="receipt"
                        value={option}
                        checked={form.receipt === option}
                        onChange={(e) => handleFormChange("receipt", e.target.value)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* 添付ファイル */}
              <div>
                <label htmlFor="field-attachment" className="block text-sm font-semibold text-gray-700 mb-1">添付ファイル</label>
                <input
                  id="field-attachment"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFormChange("attachment", e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 file:cursor-pointer"
                />
                <p className="mt-1 text-xs text-gray-400">jpg, png, pdf（5MBまで）</p>
              </div>

              {/* Submit Error */}
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2" role="alert">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              )}

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-gray-50 rounded-b-2xl -mx-6 -mb-5 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  戻る
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? (editingExpense ? "更新中..." : "登録中...")
                    : (editingExpense ? "更新" : "登録")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-desc">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isDeleting && setDeleteTarget(null)} aria-hidden="true" />
          <div ref={deleteDialogRef} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 id="delete-dialog-title" className="text-lg font-bold text-gray-900">経費データの削除</h3>
                  <p id="delete-dialog-desc" className="text-sm text-gray-500 mt-1">この操作は取り消せません。</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-gray-900">{deleteTarget.title}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(deleteTarget.date)} / {deleteTarget.category.name} / {formatYen(deleteTarget.amount)}
                </p>
              </div>
              {deleteError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2" role="alert">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-700">{deleteError}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 flex justify-end gap-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline animation style for toasts */}
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
