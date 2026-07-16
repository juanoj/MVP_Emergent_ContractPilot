import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Layout from "@/components/app/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock, Loader2, AlertTriangle } from "lucide-react";

export default function Renewals() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const res = await api.get("/subscriptions"); setSubs(res.data); }
      finally { setLoading(false); }
    })();
  }, []);

  const withDates = subs
    .filter((s) => !!s.renewal_date)
    .map((s) => {
      const d = new Date(s.renewal_date);
      const days = Math.round((d - new Date()) / (1000 * 60 * 60 * 24));
      return { ...s, _days: days, _date: d };
    })
    .sort((a, b) => a._days - b._days);

  const buckets = [
    { label: "Overdue / today", filter: (d) => d <= 0 },
    { label: "This week", filter: (d) => d > 0 && d <= 7 },
    { label: "This month", filter: (d) => d > 7 && d <= 30 },
    { label: "Next 60 days", filter: (d) => d > 30 && d <= 60 },
    { label: "Later", filter: (d) => d > 60 },
  ];

  return (
    <Layout>
      <div className="p-8 lg:p-12 max-w-[1200px]">
        <div className="label-eyebrow text-neutral-500">Timeline</div>
        <h1 className="font-display font-bold text-4xl md:text-5xl tracking-tight mt-1">Renewals</h1>
        <p className="text-neutral-600 mt-2">A chronological view of every upcoming contract event.</p>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : withDates.length === 0 ? (
          <Card className="mt-8 rounded-lg border-black/10 shadow-none"><CardContent className="p-10 text-center text-neutral-500" data-testid="renewals-empty">No renewal dates set. Upload contracts or edit subscriptions to add them.</CardContent></Card>
        ) : (
          <div className="mt-8 space-y-8" data-testid="renewals-timeline">
            {buckets.map((b) => {
              const items = withDates.filter((s) => b.filter(s._days));
              if (items.length === 0) return null;
              return (
                <section key={b.label}>
                  <div className="label-eyebrow text-neutral-500 mb-3">{b.label}</div>
                  <div className="border border-black/10 rounded-lg bg-white divide-y divide-black/10">
                    {items.map((s) => {
                      const urgent = s._days <= 14;
                      return (
                        <div key={s.id} className="flex items-center justify-between px-5 py-4">
                          <div className="flex items-center gap-3">
                            {urgent ? <AlertTriangle className="h-4 w-4 text-rose-500" /> : <CalendarClock className="h-4 w-4 text-neutral-500" />}
                            <div>
                              <div className="font-medium">{s.service_name}</div>
                              <div className="text-xs text-neutral-500">{s.provider} · {s.category}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm">{s.renewal_date}</div>
                            <div className={`text-xs ${urgent ? "text-rose-500" : "text-neutral-500"}`}>
                              {s._days < 0 ? `${-s._days} days ago` : `in ${s._days} days`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
