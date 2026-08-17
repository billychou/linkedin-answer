"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchSession } from "@/lib/authClient";
import {
  adminListTenants,
  adminListUsers,
  adminUpdateTenant,
  adminUpdateUser,
} from "@/lib/tenantClient";
import { useUserStore } from "@/stores/userStore";
import type { AdminTenantRow, AdminUserRow } from "@/types/tenant";
import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Tab = "users" | "tenants";

const TABS: { id: Tab; label: string }[] = [
  { id: "users", label: "Users" },
  { id: "tenants", label: "Tenants" },
];

const inputClasses =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function formatDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-success/15 text-success",
    disabled: "bg-destructive/15 text-destructive",
    deleted: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? styles.deleted
        }`}
    >
      {status}
    </span>
  );
}

/**
 * Admin console: site-wide user and tenant management.
 * Requires a session plus users.role === 'admin' (verified server-side on
 * every /api/admin/* call; the client guard below only drives redirects).
 */
export default function AdminClient() {
  const { toast } = useToast();
  const sessionUser = useUserStore((state) => state.user);
  const [status, setStatus] = useState<"loading" | "ready" | "forbidden">(
    "loading"
  );
  const [tab, setTab] = useState<Tab>("users");

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [tenants, setTenants] = useState<AdminTenantRow[]>([]);
  const [tenantSearch, setTenantSearch] = useState("");
  const [dataLoading, setDataLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadUsers = useCallback(async (search: string) => {
    setDataLoading(true);
    const data = await adminListUsers(search);
    setUsers(data?.users ?? []);
    setDataLoading(false);
  }, []);

  const loadTenants = useCallback(async (search: string) => {
    setDataLoading(true);
    const data = await adminListTenants(search);
    setTenants(data?.tenants ?? []);
    setDataLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchSession().then((user) => {
      if (cancelled) return;
      if (!user) {
        window.location.replace(
          `/login?next=${encodeURIComponent(window.location.pathname)}`
        );
        return;
      }
      if (user.role !== "admin") {
        setStatus("forbidden");
        return;
      }
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    void loadUsers("");
    void loadTenants("");
  }, [status, loadUsers, loadTenants]);

  if (status === "loading") {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-12 space-y-6">
        <div className="h-8 w-52 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-16 text-center space-y-3">
        <h1 className="text-xl font-semibold">Admin Console</h1>
        <p className="text-sm text-muted-foreground">
          You need an administrator account to access this page.
        </p>
      </div>
    );
  }

  const handleToggleUserRole = async (row: AdminUserRow) => {
    setBusyId(row.id);
    const ok = await adminUpdateUser(row.id, {
      role: row.role === "admin" ? "user" : "admin",
    });
    if (ok) {
      toast({ title: "User role updated" });
      await loadUsers(userSearch);
    } else {
      toast({ title: "Failed to update user", variant: "destructive" });
    }
    setBusyId(null);
  };

  const handleToggleUserStatus = async (row: AdminUserRow) => {
    setBusyId(row.id);
    const ok = await adminUpdateUser(row.id, {
      status: row.status === "active" ? "disabled" : "active",
    });
    if (ok) {
      toast({ title: "User status updated" });
      await loadUsers(userSearch);
    } else {
      toast({ title: "Failed to update user", variant: "destructive" });
    }
    setBusyId(null);
  };

  const handleToggleTenantStatus = async (row: AdminTenantRow) => {
    setBusyId(row.id);
    const ok = await adminUpdateTenant(row.id, {
      status: row.status === "active" ? "disabled" : "active",
    });
    if (ok) {
      toast({ title: "Tenant status updated" });
      await loadTenants(tenantSearch);
    } else {
      toast({ title: "Failed to update tenant", variant: "destructive" });
    }
    setBusyId(null);
  };

  const handleTenantPlan = async (row: AdminTenantRow, plan: "free" | "pro") => {
    setBusyId(row.id);
    const ok = await adminUpdateTenant(row.id, { plan });
    if (ok) {
      toast({ title: "Tenant plan updated" });
      await loadTenants(tenantSearch);
    } else {
      toast({ title: "Failed to update tenant", variant: "destructive" });
    }
    setBusyId(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Admin Console
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage all users and tenants on this site.
        </p>
      </div>

      <div
        className="flex gap-1 border-b"
        role="tablist"
        aria-label="Admin sections"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px rounded-t-md px-3 py-2 text-sm font-medium transition-colors ${tab === id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="space-y-4">
          <form
            className="flex max-w-sm gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void loadUsers(userSearch);
            }}
          >
            <input
              className={inputClasses}
              placeholder="Search by name or email"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
            />
            <Button type="submit" variant="outline" size="icon" aria-label="Search users">
              <Search className="h-4 w-4" />
            </Button>
          </form>

          <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Current tenant</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Last login</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dataLoading && users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((row) => {
                    const isSelf = row.id === sessionUser?.id;
                    return (
                      <tr key={row.id}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {row.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={row.avatar_url}
                                alt={row.name}
                                className="h-7 w-7 rounded-full"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
                                {(row.name || row.email).slice(0, 1)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {row.name || "—"}
                                {isSelf && (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    (you)
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {row.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize">{row.role}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="truncate">{row.tenant_name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.tenant_count}{" "}
                            {row.tenant_count === 1 ? "tenant" : "tenants"}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatDate(row.created_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatDate(row.last_login_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isSelf || busyId === row.id}
                              onClick={() => void handleToggleUserRole(row)}
                            >
                              {row.role === "admin" ? "Make user" : "Make admin"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isSelf || busyId === row.id}
                              onClick={() => void handleToggleUserStatus(row)}
                            >
                              {row.status === "active" ? "Disable" : "Enable"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "tenants" && (
        <div className="space-y-4">
          <form
            className="flex max-w-sm gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void loadTenants(tenantSearch);
            }}
          >
            <input
              className={inputClasses}
              placeholder="Search by name, slug or owner email"
              value={tenantSearch}
              onChange={(event) => setTenantSearch(event.target.value)}
            />
            <Button type="submit" variant="outline" size="icon" aria-label="Search tenants">
              <Search className="h-4 w-4" />
            </Button>
          </form>

          <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Tenant</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Members</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dataLoading && tenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No tenants found.
                    </td>
                  </tr>
                ) : (
                  tenants.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <p className="truncate font-medium">
                          {row.name}
                          {row.is_personal && (
                            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                              Personal
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.slug}
                        </p>
                      </td>
                      <td className="px-4 py-3 truncate">{row.owner_email}</td>
                      <td className="px-4 py-3">{row.member_count}</td>
                      <td className="px-4 py-3">
                        <select
                          className="h-8 rounded-md border border-input bg-transparent px-2 text-xs capitalize"
                          value={row.plan}
                          disabled={busyId === row.id}
                          onChange={(event) =>
                            void handleTenantPlan(
                              row,
                              event.target.value as "free" | "pro"
                            )
                          }
                        >
                          <option value="free">free</option>
                          <option value="pro">pro</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId === row.id}
                            onClick={() => void handleToggleTenantStatus(row)}
                          >
                            {row.status === "active" ? "Disable" : "Enable"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
