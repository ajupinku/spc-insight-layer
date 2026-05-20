import { createFileRoute } from "@tanstack/react-router";
import { GitCommit, Rocket, CheckCircle2, Github, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { appVersions, currentVersion, mesStatus } from "@/lib/mock-data";

export const Route = createFileRoute("/versions")({
  head: () => ({ meta: [{ title: "Version & Deployment — AKSPC" }] }),
  component: VersionsPage,
});

const validationColor: Record<string, string> = {
  draft: "border-muted text-muted-foreground",
  "in-validation": "border-warning/40 bg-warning/10 text-warning",
  validated: "border-primary/40 bg-primary/10 text-primary",
  deployed: "border-success/40 bg-success/10 text-success",
};

function VersionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Version & Deployment"
        subtitle="App version, database schema version, change log, and deployment guide."
        actions={
          <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/5 text-primary">
            <GitCommit className="h-3 w-3" /> AKSPC {currentVersion.version}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Current App Version" value={currentVersion.version} />
        <Stat label="DB Schema Version" value="akspc_ro v1" />
        <Stat label="Environment" value={mesStatus.mode} />
        <Stat label="Last Deployment" value={new Date(currentVersion.date).toLocaleDateString()} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Release Timeline</CardTitle></CardHeader>
        <CardContent>
          <ol className="relative space-y-5 border-l-2 border-border pl-6">
            {appVersions.map((v, i) => (
              <li key={v.version} className="relative">
                <span className={`absolute -left-[34px] flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                  v.validation === "deployed" ? "bg-success text-success-foreground" :
                  v.validation === "validated" ? "bg-primary text-primary-foreground" :
                  v.validation === "in-validation" ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground"
                }`}>{i + 1}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-semibold text-foreground">{v.version}</span>
                  <span className="text-xs text-muted-foreground">{new Date(v.date).toLocaleDateString()}</span>
                  <Badge variant="outline" className={validationColor[v.validation]}>{v.validation}</Badge>
                  <span className="text-xs text-muted-foreground">· deployed by {v.deployedBy}</span>
                </div>
                <div className="mt-1 text-sm font-medium">{v.summary}</div>
                <div className="mt-1 grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
                  <div><span className="font-semibold text-foreground">DB:</span> {v.dbChanges}</div>
                  <div><span className="font-semibold text-foreground">UI:</span> {v.uiChanges}</div>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Change Log</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>{["Version","Date","Summary","DB Changes","UI Changes","Validation","Deployed By"].map(h =>
                  <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}</tr>
              </thead>
              <tbody>
                {appVersions.slice().reverse().map(v => (
                  <tr key={v.version} className="border-t border-border align-top">
                    <td className="px-2 py-1.5 font-mono font-semibold">{v.version}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{v.date}</td>
                    <td className="px-2 py-1.5">{v.summary}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{v.dbChanges}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{v.uiChanges}</td>
                    <td className="px-2 py-1.5"><Badge variant="outline" className={validationColor[v.validation]}>{v.validation}</Badge></td>
                    <td className="px-2 py-1.5">{v.deployedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Rocket className="h-4 w-4 text-primary" /> Deployment Guide</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-2 text-xs">
              {[
                "Clone GitHub repo.",
                "Install dependencies: bun install.",
                "Configure environment variables (Supabase URL, anon key).",
                "Connect Supabase via Database Configuration page.",
                "Run local development: bun run dev.",
                "Build production: bun run build.",
                "Deploy to Vercel, Netlify, or Cloudflare.",
                "Validate read-only database access (no INSERT/UPDATE allowed).",
                "Run test lots through Lot Journey.",
                "Freeze version and record release notes here.",
              ].map((step, i) => (
                <li key={i} className="flex gap-2"><span className="font-mono font-semibold text-primary shrink-0">{i + 1}.</span>{step}</li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> External Links</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <a href="#" className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 hover:bg-muted">
              <Github className="h-4 w-4" /> <span>github.com/your-org/akspc</span>
            </a>
            <a href={mesStatus.supabaseUrl} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 hover:bg-muted">
              <Database className="h-4 w-4" /> <span className="truncate">{mesStatus.supabaseUrl}</span>
            </a>
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
              <strong>Validation rule:</strong> AKSPC must never execute INSERT, UPDATE, or DELETE against MES production tables. All write attempts must be revoked at the database role level.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold tabular-nums">{value}</div>
    </CardContent></Card>
  );
}
