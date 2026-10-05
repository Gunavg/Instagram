"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import useAuthStore from "@/store/authStore";
import {
  Shield,
  Users,
  FileText,
  Clock,
  RefreshCw,
  Trash2,
  CheckCircle,
  Ban,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  posts: number;
  stories: number;
  subscriptions: number;
  reportedContent: number;
  scheduledPosts: number;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
  };
};

type Pagination = {
  page: number;
  pages: number;
  total: number;
};

type Filters = {
  search: string;
  from: string;
  to: string;
  status: string;
  plan: string;
  verified: string;
  visibility: string;
};

type AdminItem = {
  _id: string;
  username?: string;
  fullName?: string;
  email?: string;
  caption?: string;
  action?: string;
  entityType?: string;
  plan?: string;
  status?: string;
  scheduleStatus?: string;
  role?: string;
  privacy?: string;
  isVerified?: boolean;
  createdAt?: string;
  scheduledAt?: string;
  user?: {
    username?: string;
    email?: string;
  };
};

type TabId =
  | "users"
  | "posts"
  | "stories"
  | "subscriptions"
  | "scheduled-posts"
  | "audit-logs";

type Tab = [TabId, string];

const tabs: Tab[] = [
  ["users", "Users"],
  ["posts", "Posts"],
  ["stories", "Stories"],
  ["subscriptions", "Subscriptions"],
  ["scheduled-posts", "Scheduled Posts"],
  ["audit-logs", "Audit Logs"],
];

const initialFilters: Filters = {
  search: "",
  from: "",
  to: "",
  status: "",
  plan: "",
  verified: "",
  visibility: "",
};

const AdminPage = () => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tab, setTab] = useState<TabId>("users");
  const [items, setItems] = useState<AdminItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== "administrator") {
      router.replace("/");
    }
  }, [user, router]);

  const load = async (page = 1) => {
    setLoading(true);

    try {
      const statsResponse = await axiosInstance.get("/api/admin/dashboard");
      setStats(statsResponse.data.stats as DashboardStats);

      const params = new URLSearchParams({
        page: String(page),
        limit: "12",
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });

      const response = await axiosInstance.get(
        `/api/admin/${tab}?${params.toString()}`,
      );

      setItems((response.data.items || []) as AdminItem[]);
      setPagination(
        (response.data.pagination as Pagination) || {
          page: 1,
          pages: 1,
          total: 0,
        },
      );
    } catch (error) {
      console.error("Admin dashboard loading failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "administrator") {
      void load(1);
    }
    // The filters have their own debounced effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user?.role]);

  useEffect(() => {
    if (user?.role !== "administrator") return;

    const timer = window.setTimeout(() => {
      void load(1);
    }, 350);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.search,
    filters.from,
    filters.to,
    filters.status,
    filters.plan,
    filters.verified,
    filters.visibility,
    user?.role,
  ]);

  const mutate = async (
    path: string,
    method: "patch" | "delete" = "patch",
    data: Record<string, unknown> = {},
  ) => {
    try {
      await axiosInstance({ url: path, method, data });
      await load(pagination.page);
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data
          ? String(error.response.data.message)
          : "Action failed";

      window.alert(message);
    }
  };

  if (user?.role !== "administrator") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Administrator access required.
      </div>
    );
  }

  const statCards: Array<[string, number, LucideIcon]> = [
    ["Users", stats?.totalUsers ?? 0, Users],
    ["Active", stats?.activeUsers ?? 0, CheckCircle],
    ["Posts", stats?.posts ?? 0, FileText],
    ["Stories", stats?.stories ?? 0, Clock],
    ["Subscriptions", stats?.subscriptions ?? 0, Shield],
    ["Reported", stats?.reportedContent ?? 0, Ban],
    ["Scheduled", stats?.scheduledPosts ?? 0, Clock],
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-7">
          <div>
            <div className="flex gap-2 items-center">
              <Shield className="text-blue-600" />
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            </div>
            <p className="text-sm text-zinc-500 mt-1">
              Complete platform management, scheduling monitoring and accountability.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load(pagination.page)}
            className="p-2 rounded-lg border bg-white"
            aria-label="Refresh dashboard"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 mb-6">
          {statCards.map(([label, value, Icon]) => (
            <div className="bg-white border rounded-xl p-4" key={label}>
              <Icon size={16} className="text-zinc-400 mb-2" />
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border rounded-xl p-2 flex gap-1 overflow-auto mb-4">
          {tabs.map(([id, label]) => (
            <button
              type="button"
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
                tab === id ? "bg-black text-white" : "hover:bg-zinc-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-2 md:grid-cols-6 gap-2">
          <input
            placeholder="Search keyword"
            value={filters.search}
            onChange={(event) =>
              setFilters({ ...filters, search: event.target.value })
            }
            className="col-span-2 border rounded-lg px-3 py-2 text-sm"
          />

          <input
            type="date"
            value={filters.from}
            onChange={(event) =>
              setFilters({ ...filters, from: event.target.value })
            }
            className="border rounded-lg px-3 py-2 text-sm"
          />

          <input
            type="date"
            value={filters.to}
            onChange={(event) =>
              setFilters({ ...filters, to: event.target.value })
            }
            className="border rounded-lg px-3 py-2 text-sm"
          />

          {tab === "users" && (
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters({ ...filters, status: event.target.value })
              }
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>
          )}

          {(tab === "subscriptions" || tab === "users") && (
            <select
              value={filters.plan}
              onChange={(event) =>
                setFilters({ ...filters, plan: event.target.value })
              }
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Plan</option>
              <option value="free">Free</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
            </select>
          )}

          {tab === "scheduled-posts" && (
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters({ ...filters, status: event.target.value })
              }
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All scheduling states</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
              <option value="failed">Failed</option>
            </select>
          )}
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b">
                <tr>
                  <th className="text-left p-3">Record</th>
                  <th className="text-left p-3">Status / Type</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-zinc-500">
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-zinc-500">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item._id} className="border-b last:border-0">
                      <td className="p-3">
                        <div className="font-semibold">
                          {item.username ||
                            item.caption?.slice(0, 60) ||
                            item.user?.username ||
                            item.action ||
                            "Record"}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {item.email ||
                            item.user?.email ||
                            item.entityType ||
                            item.plan ||
                            ""}
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-1 rounded-full bg-zinc-100 text-xs">
                          {item.status ||
                            item.scheduleStatus ||
                            item.role ||
                            item.privacy ||
                            "—"}
                        </span>
                      </td>

                      <td className="p-3 text-zinc-500">
                        {new Date(
                          item.createdAt || item.scheduledAt || Date.now(),
                        ).toLocaleString("en-IN")}
                      </td>

                      <td className="p-3 text-right space-x-2">
                        {tab === "users" && (
                          <>
                            <button
                              type="button"
                              title="Verify / unverify"
                              onClick={() =>
                                void mutate(`/api/admin/users/${item._id}`, "patch", {
                                  isVerified: !item.isVerified,
                                })
                              }
                              className="p-2 border rounded-lg"
                            >
                              <CheckCircle size={15} />
                            </button>

                            <button
                              type="button"
                              title="Suspend / activate"
                              onClick={() =>
                                void mutate(`/api/admin/users/${item._id}`, "patch", {
                                  status:
                                    item.status === "active"
                                      ? "suspended"
                                      : "active",
                                })
                              }
                              className="p-2 border rounded-lg"
                            >
                              <Ban size={15} />
                            </button>

                            <button
                              type="button"
                              title="Delete user"
                              onClick={() =>
                                void mutate(`/api/admin/users/${item._id}`, "delete")
                              }
                              className="p-2 border rounded-lg text-red-600"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}

                        {tab === "posts" && (
                          <button
                            type="button"
                            title="Delete post"
                            onClick={() =>
                              void mutate(`/api/admin/posts/${item._id}`, "delete")
                            }
                            className="p-2 border rounded-lg text-red-600"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}

                        {tab === "stories" && (
                          <button
                            type="button"
                            title="Delete story"
                            onClick={() =>
                              void mutate(`/api/admin/stories/${item._id}`, "delete")
                            }
                            className="p-2 border rounded-lg text-red-600"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between p-3 border-t">
            <span className="text-xs text-zinc-500">
              Page {pagination.page} of {pagination.pages} · {pagination.total} records
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => void load(pagination.page - 1)}
                className="p-2 border rounded-lg disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                disabled={pagination.page >= pagination.pages}
                onClick={() => void load(pagination.page + 1)}
                className="p-2 border rounded-lg disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
