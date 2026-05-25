import { useRef, type ReactNode, type RefObject } from "react";
import { Download, FileImage, FileType, FileDown, Image as ImageIcon } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  exportNodePng, exportNodeJpeg, exportNodeSvg, exportNodePdf, exportCsv,
} from "@/lib/export-utils";

interface ExportMenuProps {
  targetRef: RefObject<HTMLElement | null>;
  name: string;
  title?: string;
  csvRows?: Record<string, unknown>[];
}

export function ExportMenu({ targetRef, name, title, csvRows }: ExportMenuProps) {
  const run = (fn: (n: HTMLElement) => Promise<void> | void) => () => {
    const n = targetRef.current;
    if (!n) return;
    void fn(n);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="export-skip h-7 gap-1 px-2 text-[11px]">
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">{title ?? name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={run(n => exportNodePng(n, name))}>
          <ImageIcon className="mr-2 h-3.5 w-3.5" /> PNG image
        </DropdownMenuItem>
        <DropdownMenuItem onClick={run(n => exportNodeJpeg(n, name))}>
          <FileImage className="mr-2 h-3.5 w-3.5" /> JPEG image
        </DropdownMenuItem>
        <DropdownMenuItem onClick={run(n => exportNodeSvg(n, name))}>
          <FileType className="mr-2 h-3.5 w-3.5" /> SVG vector
        </DropdownMenuItem>
        <DropdownMenuItem onClick={run(n => exportNodePdf(n, name, title))}>
          <FileDown className="mr-2 h-3.5 w-3.5" /> PDF report
        </DropdownMenuItem>
        {csvRows && csvRows.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => exportCsv(csvRows, name)}>
              <Download className="mr-2 h-3.5 w-3.5" /> CSV data
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Wraps any block in a ref'd div so its contents can be exported. */
export function Exportable({ children, innerRef }: { children: ReactNode; innerRef: RefObject<HTMLDivElement | null> }) {
  return <div ref={innerRef}>{children}</div>;
}

export function useExportRef() {
  return useRef<HTMLDivElement | null>(null);
}
