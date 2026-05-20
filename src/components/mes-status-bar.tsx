import { Database, Lock, RefreshCw, Activity } from "lucide-react";
import { mesStatus, currentVersion } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";

export function MesStatusBar() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Badge variant="outline" className="gap-1.5 border-success/40 bg-success/10 text-success">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
        </span>
        DB Connected · {mesStatus.mode}
      </Badge>
      <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/5 text-primary">
        <Lock className="h-3 w-3" /> Read-only
      </Badge>
      <Badge variant="outline" className="gap-1 font-mono">
        <Database className="h-3 w-3" /> {mesStatus.schema}
      </Badge>
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <RefreshCw className="h-3 w-3" /> Sync {new Date(mesStatus.lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </Badge>
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Activity className="h-3 w-3" /> AKSPC {currentVersion.version}
      </Badge>
    </div>
  );
}
