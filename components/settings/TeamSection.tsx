"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchProfile } from "@/lib/authClient";
import {
  createTenant,
  createTenantInvite,
  fetchTenantDetail,
  fetchTenantInvites,
  removeTenantMember,
  revokeTenantInvite,
  switchTenant,
  updateTenantMemberRole,
} from "@/lib/tenantClient";
import type { TenantInvite, TenantMember } from "@/types/tenant";
import type { ProfileUser } from "@/types/user";
import { Check, Plus, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const inputClasses =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface TeamSectionProps {
  profile: ProfileUser;
  onChange: (profile: ProfileUser) => void;
}

function RoleBadge({ role }: { role: TenantMember["role"] }) {
  const styles: Record<TenantMember["role"], string> = {
    owner: "bg-warning/15 text-warning",
    admin: "bg-primary/10 text-primary",
    member: "bg-muted text-foreground",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[role]}`}
    >
      {role}
    </span>
  );
}

/**
 * Settings "Team" tab: workspace (tenant) switching/creation plus member
 * management for the current workspace. Data comes from /api/me and the
 * /api/tenants endpoints; every mutation re-syncs the profile.
 */
export function TeamSection({ profile, onChange }: TeamSectionProps) {
  const { toast } = useToast();
  const [members, setMembers] = useState<TenantMember[] | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviting, setInviting] = useState(false);
  const [invites, setInvites] = useState<TenantInvite[]>([]);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const currentTenant =
    profile.tenants.find((tenant) => tenant.id === profile.current_tenant_id) ??
    null;
  const isOwner = currentTenant?.role === "owner";
  const canManage = isOwner || currentTenant?.role === "admin";

  const refreshProfile = useCallback(async () => {
    const fresh = await fetchProfile();
    if (fresh) onChange(fresh);
  }, [onChange]);

  useEffect(() => {
    const tenantId = profile.current_tenant_id;
    let cancelled = false;
    // 同步清空/置 loading 属常规模式(set-state-in-effect 已降级为 warn)。
    setMembers(null);
    setMembersLoading(true);
    setInvites([]);
    void (async () => {
      const detail = tenantId ? await fetchTenantDetail(tenantId) : null;
      const pending = tenantId ? await fetchTenantInvites(tenantId) : null;
      if (cancelled) return;
      setMembers(detail?.members ?? null);
      setMembersLoading(false);
      setInvites(pending ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.current_tenant_id]);

  const handleSwitch = async (tenantId: string) => {
    setSwitchingId(tenantId);
    const ok = await switchTenant(tenantId);
    if (ok) {
      await refreshProfile();
      toast({ title: "Workspace switched" });
    } else {
      toast({ title: "Failed to switch workspace", variant: "destructive" });
    }
    setSwitchingId(null);
  };

  const handleCreate = async () => {
    const name = newTenantName.trim();
    if (!name) return;
    setCreating(true);
    const tenant = await createTenant(name);
    if (tenant) {
      setNewTenantName("");
      await refreshProfile();
      toast({ title: `Workspace "${tenant.name}" created` });
    } else {
      toast({ title: "Failed to create workspace", variant: "destructive" });
    }
    setCreating(false);
  };

  const handleInvite = async () => {
    if (!currentTenant) return;
    const email = inviteEmail.trim();
    if (!email) return;
    setInviting(true);
    const result = await createTenantInvite(currentTenant.id, email, inviteRole);
    if (result.invite) {
      setInviteEmail("");
      setInviteRole("member");
      setInvites((prev) => [
        result.invite as TenantInvite,
        ...prev.filter((invite) => invite.email !== result.invite?.email),
      ]);
      toast({
        title: result.email_sent
          ? "Invitation sent"
          : "Invitation created (email delivery is not configured)",
      });
    } else {
      toast({
        title: result.error ?? "Failed to send invitation",
        variant: "destructive",
      });
    }
    setInviting(false);
  };

  const handleRevokeInvite = async (invite: TenantInvite) => {
    if (!currentTenant) return;
    const ok = await revokeTenantInvite(currentTenant.id, invite.id);
    if (ok) {
      setInvites((prev) => prev.filter((item) => item.id !== invite.id));
      toast({ title: "Invitation revoked" });
    } else {
      toast({ title: "Failed to revoke invitation", variant: "destructive" });
    }
  };

  const handleRoleChange = async (userId: string, role: "admin" | "member") => {
    if (!currentTenant) return;
    setBusyMemberId(userId);
    const ok = await updateTenantMemberRole(currentTenant.id, userId, role);
    if (ok) {
      const detail = await fetchTenantDetail(currentTenant.id);
      if (detail) setMembers(detail.members);
      toast({ title: "Member role updated" });
    } else {
      toast({ title: "Failed to update role", variant: "destructive" });
    }
    setBusyMemberId(null);
  };

  const handleRemove = async (member: TenantMember) => {
    if (!currentTenant) return;
    const isSelf = member.id === profile.id;
    setBusyMemberId(member.id);
    const ok = await removeTenantMember(currentTenant.id, member.id);
    if (ok) {
      if (isSelf) {
        // 退出了当前租户：刷新资料让 UI 切到剩余租户视图。
        setMembers(null);
        await refreshProfile();
        toast({ title: "You left the workspace" });
      } else {
        const detail = await fetchTenantDetail(currentTenant.id);
        if (detail) setMembers(detail.members);
        await refreshProfile();
        toast({ title: "Member removed" });
      }
    } else {
      toast({ title: "Failed to remove member", variant: "destructive" });
    }
    setBusyMemberId(null);
  };

  return (
    <div className="space-y-6">
      {/* 工作区列表与切换 */}
      <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">Your workspaces</p>
          <p className="text-xs text-muted-foreground">
            Every account gets a personal workspace. Create more to collaborate
            with other registered users.
          </p>
        </div>

        {profile.tenants.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No workspaces yet. Create one below.
          </p>
        ) : (
          <ul className="divide-y">
            {profile.tenants.map((tenant) => {
              const isCurrent = tenant.id === profile.current_tenant_id;
              return (
                <li
                  key={tenant.id}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {tenant.name}
                      {tenant.is_personal && (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                          Personal
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="capitalize">{tenant.role}</span> ·{" "}
                      {tenant.member_count}{" "}
                      {tenant.member_count === 1 ? "member" : "members"} ·{" "}
                      {tenant.slug}
                    </p>
                  </div>
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                      <Check className="h-3.5 w-3.5" /> Current
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={switchingId !== null}
                      onClick={() => void handleSwitch(tenant.id)}
                    >
                      {switchingId === tenant.id ? "Switching…" : "Switch"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex gap-2 pt-1">
          <input
            className={inputClasses}
            placeholder="New workspace name"
            value={newTenantName}
            maxLength={50}
            onChange={(event) => setNewTenantName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleCreate();
            }}
          />
          <Button
            onClick={() => void handleCreate()}
            disabled={creating || !newTenantName.trim()}
          >
            <Plus className="h-4 w-4" />
            {creating ? "Creating…" : "Create"}
          </Button>
        </div>
      </div>

      {/* 当前工作区成员管理 */}
      {currentTenant && (
        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Members of “{currentTenant.name}”
            </p>
            <p className="text-xs text-muted-foreground">
              {canManage
                ? "Invite teammates by email — they don't need an account yet. Only the owner can grant admin roles."
                : "Ask a workspace owner or admin to invite new members."}
            </p>
          </div>

          {membersLoading ? (
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          ) : members === null ? (
            <p className="text-sm text-muted-foreground">
              Failed to load members.
            </p>
          ) : (
            <ul className="divide-y">
              {members.map((member) => {
                const isSelf = member.id === profile.id;
                const removable =
                  member.role !== "owner" && (canManage || isSelf);
                return (
                  <li
                    key={member.id}
                    className="flex flex-wrap items-center gap-3 py-3"
                  >
                    {member.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.avatar_url}
                        alt={member.name}
                        className="h-8 w-8 rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
                        {(member.name || member.email).slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {member.name || member.email}
                        {isSelf && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.email} · joined{" "}
                        {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                    <RoleBadge role={member.role} />
                    {isOwner && member.role !== "owner" && (
                      <select
                        className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                        value={member.role}
                        disabled={busyMemberId === member.id}
                        onChange={(event) =>
                          void handleRoleChange(
                            member.id,
                            event.target.value as "admin" | "member"
                          )
                        }
                      >
                        <option value="admin">admin</option>
                        <option value="member">member</option>
                      </select>
                    )}
                    {removable && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyMemberId === member.id}
                        onClick={() => void handleRemove(member)}
                      >
                        {isSelf ? "Leave" : "Remove"}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {canManage && (
            <div className="flex flex-wrap gap-2 pt-1">
              <input
                className={`${inputClasses} max-w-xs`}
                type="email"
                placeholder="Invite by email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleInvite();
                }}
              />
              {isOwner && (
                <select
                  className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                  value={inviteRole}
                  onChange={(event) =>
                    setInviteRole(event.target.value as "member" | "admin")
                  }
                >
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
              )}
              <Button
                variant="outline"
                onClick={() => void handleInvite()}
                disabled={inviting || !inviteEmail.trim()}
              >
                <UserPlus className="h-4 w-4" />
                {inviting ? "Sending…" : "Send invite"}
              </Button>
            </div>
          )}

          {canManage && invites.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Pending invitations
              </p>
              <ul className="divide-y rounded-md border">
                {invites.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex flex-wrap items-center gap-3 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        invited as {invite.role} · expires{" "}
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                      pending
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Revoke invitation"
                      onClick={() => void handleRevokeInvite(invite)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
