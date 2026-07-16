import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Layout from "@/components/app/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Upload } from "lucide-react";
import UploadContractDialog from "@/components/app/UploadContractDialog";

export default function Contracts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const res = await api.get("/contracts"); setItems(res.data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <Layout>
      <div className="p-8 lg:p-12 max-w-[1400px]">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="label-eyebrow text-neutral-500">Repository</div>
            <h1 className="font-display font-bold text-4xl md:text-5xl tracking-tight mt-1">Contracts</h1>
            <p className="text-neutral-600 mt-2">Every parsed contract, with the AI-extracted snapshot.</p>
          </div>
          <Button onClick={() => setOpen(true)} data-testid="upload-contract-btn"><Upload className="h-4 w-4" /> Upload contract</Button>
        </div>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : items.length === 0 ? (
          <Card className="mt-8 rounded-lg border-black/10 shadow-none"><CardContent className="p-10 text-center text-neutral-500" data-testid="contracts-empty">No contracts yet.</CardContent></Card>
        ) : (
          <div className="mt-8 grid md:grid-cols-2 gap-4" data-testid="contracts-grid">
            {items.map((c) => (
              <div key={c.id} className="border border-black/10 rounded-lg bg-white p-5">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-neutral-500" />
                  <div className="font-medium truncate">{c.filename}</div>
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                  <div className="label-eyebrow text-neutral-500">Service</div><div className="font-mono">{c.extracted?.service_name || "—"}</div>
                  <div className="label-eyebrow text-neutral-500">Provider</div><div className="font-mono">{c.extracted?.provider || "—"}</div>
                  <div className="label-eyebrow text-neutral-500">Price</div><div className="font-mono">{c.extracted?.currency || ""} {c.extracted?.price || "—"}</div>
                  <div className="label-eyebrow text-neutral-500">Renewal</div><div className="font-mono">{c.extracted?.renewal_date || "—"}</div>
                  <div className="label-eyebrow text-neutral-500">Notice</div><div className="font-mono">{c.extracted?.notice_period_days ? `${c.extracted.notice_period_days} days` : "—"}</div>
                </div>
                {c.extracted?.summary && (
                  <p className="mt-3 text-sm text-neutral-600 border-l-2 border-black/20 pl-3">{c.extracted.summary}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <UploadContractDialog open={open} onOpenChange={setOpen} onDone={load} />
    </Layout>
  );
}
