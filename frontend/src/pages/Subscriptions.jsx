import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Layout from "@/components/app/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RefreshCcw, Trash2, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["SaaS", "AI", "Internet", "Communications", "License", "Other"];
const CYCLES = ["monthly", "yearly", "quarterly"];

export default function Subscriptions() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(null);
  const [filter, setFilter] = useState("All");
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/subscriptions");
      setSubs(res.data);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const refreshMarket = async (id) => {
    setRefreshing(id);
    try {
      const res = await api.post(`/subscriptions/${id}/refresh-market`);
      setSubs((prev) => prev.map((s) => (s.id === id ? res.data : s)));
      toast.success("Market price updated");
    } catch { toast.error("Refresh failed"); }
    finally { setRefreshing(null); }
  };

  const remove = async (id) => {
    if (!confirm("Delete this subscription?")) return;
    try {
      await api.delete(`/subscriptions/${id}`);
      setSubs((prev) => prev.filter((s) => s.id !== id));
    } catch { toast.error("Delete failed"); }
  };

  const filtered = filter === "All" ? subs : subs.filter((s) => s.category === filter);
  const monthlyEq = (s) => {
    const p = Number(s.price || 0);
    if ((s.billing_cycle || "").toLowerCase() === "yearly") return p / 12;
    if ((s.billing_cycle || "").toLowerCase() === "quarterly") return p / 3;
    return p;
  };

  return (
    <Layout>
      <div className="p-8 lg:p-12 max-w-[1400px]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="label-eyebrow text-neutral-500">Manage</div>
            <h1 className="font-display font-bold text-4xl md:text-5xl tracking-tight mt-1">Subscriptions</h1>
            <p className="text-neutral-600 mt-2">Refresh market prices to unlock savings recommendations.</p>
          </div>
          <Button onClick={() => setOpen(true)} data-testid="add-sub-btn"><Plus className="h-4 w-4" /> Add subscription</Button>
        </div>

        <div className="mt-8 flex items-center gap-2 flex-wrap" data-testid="category-filters">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              data-testid={`filter-${c.toLowerCase()}`}
              className={`px-3 h-8 rounded-full border text-sm ${filter === c ? "bg-black text-white border-black" : "bg-white border-black/15 text-neutral-700 hover:bg-neutral-100"}`}
            >{c}</button>
          ))}
        </div>

        <Card className="mt-4 rounded-lg border-black/10 shadow-none">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 flex items-center gap-2 text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-neutral-500" data-testid="subs-empty">No subscriptions yet — upload a contract or add one manually.</div>
            ) : (
              <Table data-testid="subs-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead className="text-right">Monthly eq.</TableHead>
                    <TableHead className="text-right">Market</TableHead>
                    <TableHead>Renewal</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => {
                    const monthly = monthlyEq(s);
                    const gap = s.market_price != null ? monthly - s.market_price : null;
                    return (
                      <TableRow key={s.id} data-testid={`sub-row-${s.id}`}>
                        <TableCell>
                          <div className="font-medium">{s.service_name}</div>
                          <div className="text-xs text-neutral-500">{s.provider}</div>
                        </TableCell>
                        <TableCell><span className="text-xs border border-black/15 rounded-full px-2 py-0.5">{s.category}</span></TableCell>
                        <TableCell className="text-right font-mono">{s.currency} {Number(s.price).toFixed(2)}</TableCell>
                        <TableCell className="text-xs">{s.billing_cycle}</TableCell>
                        <TableCell className="text-right font-mono">${monthly.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {s.market_price != null ? (
                            <div>
                              <div className="font-mono">${Number(s.market_price).toFixed(2)}</div>
                              {gap != null && Math.abs(gap) > 0.01 && (
                                <div className={`text-xs font-mono flex items-center justify-end gap-1 ${gap > 0 ? "text-rose-500" : "text-emerald-600"}`}>
                                  {gap > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                  {gap > 0 ? "+" : ""}${gap.toFixed(2)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{s.renewal_date || "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => refreshMarket(s.id)} disabled={refreshing === s.id} data-testid={`refresh-market-${s.id}`} title="Refresh market price">
                              {refreshing === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => remove(s.id)} data-testid={`delete-sub-${s.id}`}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AddSubDialog open={open} onOpenChange={setOpen} onCreated={(s) => setSubs((prev) => [...prev, s])} />
    </Layout>
  );
}

function AddSubDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState({
    service_name: "", provider: "", category: "SaaS",
    price: "", currency: "USD", billing_cycle: "monthly",
    renewal_date: "", start_date: "", auto_renew: true, notes: "",
  });
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.service_name || !form.price) { toast.error("Service and price required"); return; }
    setBusy(true);
    try {
      const res = await api.post("/subscriptions", { ...form, price: Number(form.price) });
      onCreated(res.data);
      toast.success("Added");
      onOpenChange(false);
      setForm({ service_name: "", provider: "", category: "SaaS", price: "", currency: "USD", billing_cycle: "monthly", renewal_date: "", start_date: "", auto_renew: true, notes: "" });
    } catch { toast.error("Create failed"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="add-sub-dialog">
        <DialogHeader><DialogTitle className="font-display text-2xl tracking-tight">Add subscription</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Service"><Input value={form.service_name} onChange={(e) => set("service_name", e.target.value)} data-testid="input-service" /></Field>
          <Field label="Provider"><Input value={form.provider} onChange={(e) => set("provider", e.target.value)} data-testid="input-provider" /></Field>
          <Field label="Category">
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger data-testid="input-category"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Billing">
            <Select value={form.billing_cycle} onValueChange={(v) => set("billing_cycle", v)}>
              <SelectTrigger data-testid="input-cycle"><SelectValue /></SelectTrigger>
              <SelectContent>{CYCLES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Price"><Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} data-testid="input-price" /></Field>
          <Field label="Currency"><Input value={form.currency} onChange={(e) => set("currency", e.target.value)} data-testid="input-currency" /></Field>
          <Field label="Renewal date"><Input type="date" value={form.renewal_date} onChange={(e) => set("renewal_date", e.target.value)} data-testid="input-renewal" /></Field>
          <Field label="Start date"><Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} data-testid="input-start" /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="cancel-add-sub">Cancel</Button>
          <Button onClick={submit} disabled={busy} data-testid="submit-add-sub">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="label-eyebrow text-neutral-500">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
