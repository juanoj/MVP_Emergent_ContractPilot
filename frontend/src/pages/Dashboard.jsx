import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Layout from "@/components/app/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileUp, TrendingDown, CalendarClock, Wallet, Loader2, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Link } from "react-router-dom";
import UploadContractDialog from "@/components/app/UploadContractDialog";

const COLORS = ["#0A0A0B", "#F97316", "#10B981", "#3B82F6", "#EAB308", "#EC4899"];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openUpload, setOpenUpload] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/dashboard/stats");
      setStats(res.data);
    } catch (e) {
      toast.error("Could not load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const importCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    toast.promise(
      api.post("/imports/accounting-csv", fd).then((res) => { load(); return res.data; }),
      {
        loading: "Importing CSV…",
        success: (d) => `Imported ${d.created} subscriptions`,
        error: "Import failed",
      }
    );
    e.target.value = "";
  };

  return (
    <Layout>
      <div className="p-8 lg:p-12 max-w-[1400px]">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="label-eyebrow text-neutral-500">Overview</div>
            <h1 className="font-display font-bold text-4xl md:text-5xl tracking-tight mt-1">Your subscription health</h1>
            <p className="text-neutral-600 mt-2 max-w-xl">Every contract, licence and service in one lens — with market-price context.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 border border-black/15 rounded-md h-9 px-3 text-sm cursor-pointer hover:bg-neutral-100" data-testid="import-csv-btn">
              <FileUp className="h-4 w-4" />
              Import CSV
              <input type="file" accept=".csv" className="hidden" onChange={importCsv} data-testid="import-csv-input" />
            </label>
            <Button onClick={() => setOpenUpload(true)} className="rounded-md" data-testid="upload-contract-btn">
              <Upload className="h-4 w-4" /> Upload contract
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="mt-12 flex items-center gap-2 text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : stats && (
          <>
            {/* KPI grid */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-black/10 rounded-lg bg-white overflow-hidden" data-testid="kpi-grid">
              <Kpi label="Active subs" value={stats.total_subs} icon={Wallet} />
              <Kpi label="Monthly spend" value={`$${stats.monthly_spend.toLocaleString()}`} icon={Wallet} border />
              <Kpi label="Annual run-rate" value={`$${stats.annual_spend.toLocaleString()}`} icon={ArrowUpRight} border />
              <Kpi label="Potential savings / mo" value={`$${stats.potential_monthly_savings.toLocaleString()}`} icon={TrendingDown} border tone="savings" />
            </div>

            {/* Two-column: renewals + category pie */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 rounded-lg border-black/10 shadow-none">
                <CardContent className="p-6">
                  <div className="flex items-baseline justify-between mb-4">
                    <div>
                      <div className="label-eyebrow text-neutral-500">Next 60 days</div>
                      <h2 className="font-display text-2xl font-semibold tracking-tight">Upcoming renewals</h2>
                    </div>
                    <Link to="/renewals" className="text-sm underline underline-offset-4">View all</Link>
                  </div>
                  {stats.upcoming_renewals.length === 0 ? (
                    <div className="text-sm text-neutral-500 py-8 text-center border border-dashed border-black/10 rounded-md">
                      No renewals in the next 60 days.
                    </div>
                  ) : (
                    <div className="space-y-2" data-testid="upcoming-renewals-list">
                      {stats.upcoming_renewals.slice(0, 6).map((r) => (
                        <div key={r.id} className="flex items-center justify-between border border-black/10 rounded-md px-4 py-3 hover:bg-neutral-50">
                          <div className="flex items-center gap-3">
                            <CalendarClock className={`h-4 w-4 ${r.days < 14 ? "text-rose-500" : "text-neutral-500"}`} />
                            <div>
                              <div className="text-sm font-medium">{r.service_name}</div>
                              <div className="text-xs text-neutral-500">{r.renewal_date} · in {r.days} days</div>
                            </div>
                          </div>
                          <div className="font-mono text-sm">${Number(r.price || 0).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-lg border-black/10 shadow-none">
                <CardContent className="p-6">
                  <div className="label-eyebrow text-neutral-500">Split</div>
                  <h2 className="font-display text-2xl font-semibold tracking-tight mb-2">By category</h2>
                  {stats.by_category.length === 0 ? (
                    <div className="text-sm text-neutral-500 py-8 text-center">No data yet.</div>
                  ) : (
                    <>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={stats.by_category} dataKey="amount" nameKey="category" innerRadius={45} outerRadius={80} strokeWidth={1} stroke="#fff">
                              {stats.by_category.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                            </Pie>
                            <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-1 mt-2">
                        {stats.by_category.map((c, i) => (
                          <div key={c.category} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                              <span>{c.category}</span>
                            </div>
                            <span className="font-mono text-neutral-700">${c.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Savings suggestions */}
            <div className="mt-6">
              <Card className="rounded-lg border-black/10 shadow-none">
                <CardContent className="p-6">
                  <div className="flex items-baseline justify-between mb-4">
                    <div>
                      <div className="label-eyebrow text-neutral-500">Market gap</div>
                      <h2 className="font-display text-2xl font-semibold tracking-tight">Overpaying vs. market</h2>
                    </div>
                    <Link to="/subscriptions" className="text-sm underline underline-offset-4">Review subs</Link>
                  </div>
                  {stats.savings_items.length === 0 ? (
                    <div className="text-sm text-neutral-500 py-8 text-center border border-dashed border-black/10 rounded-md" data-testid="no-savings-empty">
                      Refresh market prices from the Subscriptions page to see gaps.
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3" data-testid="savings-list">
                      {stats.savings_items.slice(0, 6).map((s) => (
                        <div key={s.id} className="border border-black/10 rounded-md p-4">
                          <div className="flex items-baseline justify-between">
                            <div className="font-medium">{s.service_name}</div>
                            <div className="font-mono text-emerald-600 font-semibold">−${s.monthly_saving}/mo</div>
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">
                            You pay <span className="font-mono">${s.current}</span> · market <span className="font-mono">${s.market}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      <UploadContractDialog open={openUpload} onOpenChange={setOpenUpload} onDone={load} />
    </Layout>
  );
}

function Kpi({ label, value, icon: Icon, border, tone }) {
  return (
    <div className={`p-6 ${border ? "md:border-l border-black/10" : ""} bg-white`}>
      <div className="flex items-center justify-between">
        <div className="label-eyebrow text-neutral-500">{label}</div>
        <Icon className="h-4 w-4 text-neutral-400" />
      </div>
      <div className={`mt-3 font-display text-3xl font-bold tracking-tight ${tone === "savings" ? "text-emerald-600" : ""}`}>{value}</div>
    </div>
  );
}
