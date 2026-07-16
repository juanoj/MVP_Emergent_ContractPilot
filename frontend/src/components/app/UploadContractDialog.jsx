import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { UploadCloud, Loader2, CheckCircle2, FileText } from "lucide-react";

export default function UploadContractDialog({ open, onOpenChange, onDone }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/contracts/upload", fd);
      setResult(res.data);
      toast.success("Contract analysed");
      onDone && onDone();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-lg" data-testid="upload-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight">Upload contract</DialogTitle>
          <DialogDescription>
            PDF contracts, invoices or SaaS agreements. Claude will extract renewal date, price and key terms.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <label className="border border-dashed border-black/20 rounded-md p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-50" data-testid="upload-drop">
              <UploadCloud className="h-8 w-8 text-neutral-500" />
              <div className="mt-2 text-sm">{file ? file.name : "Click to select a PDF"}</div>
              <input type="file" accept=".pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0])} data-testid="upload-file-input" />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="upload-cancel-btn">Cancel</Button>
              <Button onClick={submit} disabled={!file || busy} data-testid="upload-submit-btn">
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing…</> : <>Analyse</>}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4" data-testid="extraction-result">
            <div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Analysis complete</div>
            <div className="border border-black/10 rounded-md divide-y divide-black/10 text-sm">
              <Row k="Service" v={result.extracted?.service_name} />
              <Row k="Provider" v={result.extracted?.provider} />
              <Row k="Category" v={result.extracted?.category} />
              <Row k="Price" v={result.extracted?.price ? `${result.extracted.currency || "USD"} ${result.extracted.price}` : "—"} />
              <Row k="Billing" v={result.extracted?.billing_cycle} />
              <Row k="Renewal" v={result.extracted?.renewal_date || "—"} />
              <Row k="Auto-renew" v={result.extracted?.auto_renew ? "Yes" : "No"} />
              <Row k="Notice period" v={result.extracted?.notice_period_days ? `${result.extracted.notice_period_days} days` : "—"} />
            </div>
            {result.extracted?.summary && (
              <div className="text-sm text-neutral-600 border-l-2 border-black/20 pl-3">{result.extracted.summary}</div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset} data-testid="upload-another-btn"><FileText className="h-4 w-4" /> Upload another</Button>
              <Button onClick={() => onOpenChange(false)} data-testid="upload-done-btn">Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="label-eyebrow text-neutral-500">{k}</span>
      <span className="font-mono">{v || "—"}</span>
    </div>
  );
}
