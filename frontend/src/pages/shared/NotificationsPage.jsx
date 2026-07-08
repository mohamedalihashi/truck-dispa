import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { useNotifications } from "../../hooks/useApi";
import { api } from "../../services/api";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "../../components/ui/EmptyState";

export function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const qc = useQueryClient();

  async function markRead(id) {
    await api.markNotificationRead(id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function markAllRead() {
    const unread = (data?.data || []).filter((item) => !item.read);
    await Promise.all(unread.map((item) => api.markNotificationRead(item.id)));
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notifications"
        subtitle="Order created, assignment, acceptance, arrival, and delivery events."
        actions={
          (data?.data || []).some((item) => !item.read) ? (
            <Button variant="secondary" onClick={markAllRead}>
              Mark all read
            </Button>
          ) : null
        }
      />
      <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
        <div className="border-b border-outline-variant px-6 py-5">
          <h2 className="text-xl font-semibold text-primary-container">Inbox</h2>
        </div>
        <div className="space-y-0 divide-y divide-outline-variant">
          {isLoading && <p className="px-6 py-10 text-center text-sm text-on-surface-variant">Loading…</p>}
          {!isLoading && !(data?.data || []).length && (
            <div className="p-6">
              <EmptyState title="Inbox clear" text="No notifications yet. Marketplace events will appear here." />
            </div>
          )}
          {(data?.data || []).map((item) => (
            <article
              key={item.id}
              className={`flex items-center justify-between gap-4 px-6 py-4 ${
                item.read ? "bg-surface-container-lowest" : "bg-secondary-fixed/40"
              }`}
            >
              <div>
                <p className="font-semibold text-primary-container">{item.message}</p>
                <p className="text-xs text-on-surface-variant">
                  {item.type} · {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                </p>
              </div>
              {!item.read && (
                <Button variant="secondary" onClick={() => markRead(item.id)}>
                  Mark read
                </Button>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
