import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { useSettings, useSmsNotifications } from "../../hooks/useApi";
import { api } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

export function SettingsPage() {
  const { user } = useAuth();
  const { data: settings, isLoading, error } = useSettings();
  const [draft, setDraft] = useState(null);
  const [message, setMessage] = useState("");
  const qc = useQueryClient();
  const smsHistory = useSmsNotifications({ limit: 50 });
  const resendSms = useMutation({
    mutationFn: (id) => api.resendSmsNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sms-notifications"] })
  });

  useEffect(() => {
    if (settings) {
      setDraft({
        ...settings,
        commission: settings.commission || { driver: 80, dispatcher: 10, platform: 10 },
        rolePermissions: settings.rolePermissions || {}
      });
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      const next = {
        general: draft.general || {},
        notifications: draft.notifications || {},
        commission: draft.commission || {
          driver: 80,
          dispatcher: 10,
          platform: 10
        }
      };
      await api.updateSettings("general", next.general);
      await api.updateSettings("notifications", next.notifications);
      await api.updateSettings("commission", next.commission);
      if (user.isSuperAdmin) {
        await api.updateRolePermissions(draft.rolePermissions || {});
        next.rolePermissions = draft.rolePermissions || {};
      }
      return next;
    },
    onSuccess: (saved) => {
      qc.setQueryData(["settings"], (current) => ({ ...current, ...saved }));
      qc.invalidateQueries({ queryKey: ["settings"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["earnings"] });
      qc.invalidateQueries({ queryKey: ["permissions"] });
      setDraft(saved);
      setMessage("Settings saved and applied.");
    },
    onError: (err) => setMessage(err.message)
  });

  if (isLoading || !draft) {
    return <p className="text-sm text-on-surface-variant">Loading settings…</p>;
  }

  if (error) {
    return <p className="text-sm text-error">{error.message}</p>;
  }

  return (
    <div className="space-y-8">
      <PageHeader title="System Settings" subtitle="Company profile, role permissions, commissions, and notification preferences." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
          <h2 className="mb-4 text-xl font-semibold text-primary-container">General</h2>
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-on-surface-variant">Company name</span>
              <input
                className="stitch-input"
                value={draft.general?.companyName || ""}
                onChange={(e) =>
                  setDraft((s) => ({ ...s, general: { ...s.general, companyName: e.target.value } }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-on-surface-variant">Support email</span>
              <input
                className="stitch-input"
                value={draft.general?.supportEmail || ""}
                onChange={(e) =>
                  setDraft((s) => ({ ...s, general: { ...s.general, supportEmail: e.target.value } }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-on-surface-variant">Currency</span>
              <input
                className="stitch-input"
                value={draft.general?.currency || ""}
                onChange={(e) =>
                  setDraft((s) => ({ ...s, general: { ...s.general, currency: e.target.value } }))
                }
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
          <h2 className="mb-4 text-xl font-semibold text-primary-container">Notifications</h2>
          {["email", "sms", "push"].map((key) => (
            <label
              key={key}
              className="mb-3 flex items-center justify-between rounded-lg border border-outline-variant px-4 py-3"
            >
              <span className="capitalize text-sm font-medium">{key}</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-secondary-container"
                checked={Boolean(draft.notifications?.[key])}
                onChange={(e) =>
                  setDraft((s) => ({
                    ...s,
                    notifications: { ...s.notifications, [key]: e.target.checked }
                  }))
                }
              />
            </label>
          ))}
        </section>

        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold text-primary-container">Commission split (%)</h2>
          <p className="mb-4 text-sm text-on-surface-variant">
            When a customer pays, the amount is split automatically between driver, dispatcher, and platform.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { key: "driver", label: "Driver" },
              { key: "dispatcher", label: "Dispatcher" },
              { key: "platform", label: "Platform (admin)" }
            ].map(({ key, label }) => (
              <label key={key} className="block text-sm">
                <span className="mb-1.5 block font-medium text-on-surface-variant">{label}</span>
                <input
                  className="stitch-input w-full"
                  type="number"
                  min="0"
                  max="100"
                  value={draft.commission?.[key] ?? ""}
                  onChange={(e) =>
                    setDraft((s) => ({
                      ...s,
                      commission: { ...s.commission, [key]: Number(e.target.value) }
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </section>

        {user.isSuperAdmin && (
          <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)] lg:col-span-2">
            <div className="border-b border-outline-variant px-6 py-5">
              <h2 className="text-xl font-semibold text-primary-container">Role Permissions</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Allow or deny each role access to system modules. Super Admin always retains full access.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-surface-container-low text-on-surface-variant">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Permission</th>
                    {["admin", "dispatcher", "driver", "customer"].map((role) => (
                      <th key={role} className="px-4 py-3 text-center font-semibold capitalize">{role}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(settings.permissionCatalog || []).map((permission) => (
                    <tr key={permission.key} className="border-t border-outline-variant/60">
                      <td className="px-5 py-3">
                        <p className="font-medium text-primary-container">{permission.label}</p>
                        <p className="text-xs text-on-surface-variant">{permission.key}</p>
                      </td>
                      {["admin", "dispatcher", "driver", "customer"].map((role) => {
                        const supported = permission.roles?.includes(role) !== false;
                        const checked = Boolean(draft.rolePermissions?.[role]?.[permission.key]);
                        return (
                          <td key={role} className="px-4 py-3 text-center">
                            <label className="inline-flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                className="h-5 w-5 accent-secondary-container"
                                checked={checked}
                                disabled={!supported}
                                onChange={(event) =>
                                  setDraft((current) => ({
                                    ...current,
                                    rolePermissions: {
                                      ...current.rolePermissions,
                                      [role]: {
                                        ...current.rolePermissions?.[role],
                                        [permission.key]: event.target.checked
                                      }
                                    }
                                  }))
                                }
                              />
                              <span className={`text-xs font-semibold ${!supported ? "text-on-surface-variant" : checked ? "text-emerald-600" : "text-error"}`}>
                                {!supported ? "N/A" : checked ? "Allow" : "Deny"}
                              </span>
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)] lg:col-span-2">
          <div className="border-b border-outline-variant px-6 py-5">
            <h2 className="text-xl font-semibold text-primary-container">SMS Notification History</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Backend delivery attempts are recorded here. Failed messages can be resent safely.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-surface-container-low text-on-surface-variant"><tr>
                <th className="px-4 py-3">Date</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Status</th><th className="px-4 py-3">Attempts</th><th className="px-4 py-3">Failure reason</th><th className="px-4 py-3">Action</th>
              </tr></thead>
              <tbody>
                {(smsHistory.data?.data || []).map((sms) => <tr key={sms.id} className="border-t border-outline-variant/60">
                  <td className="px-4 py-3">{new Date(sms.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{sms.event}</td>
                  <td className="px-4 py-3"><p className="font-semibold">{sms.recipientName || "—"}</p><p className="text-xs text-on-surface-variant">{sms.recipientPhone}</p></td>
                  <td className="px-4 py-3 font-semibold">{sms.status}</td><td className="px-4 py-3">{sms.attempts}</td>
                  <td className="max-w-xs px-4 py-3 text-xs text-error">{sms.failureReason || "—"}</td>
                  <td className="px-4 py-3"><Button variant="outline" disabled={resendSms.isPending || sms.status === "Sent"} onClick={() => resendSms.mutate(sms.id)}>Resend</Button></td>
                </tr>)}
              </tbody>
            </table>
            {!smsHistory.isLoading && !(smsHistory.data?.data || []).length && <p className="p-6 text-center text-on-surface-variant">No SMS attempts recorded yet.</p>}
          </div>
        </section>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save settings"}
        </Button>
        {message && <p className="text-sm text-on-surface-variant">{message}</p>}
      </div>
    </div>
  );
}
