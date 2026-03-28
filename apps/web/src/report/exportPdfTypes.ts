import type { RunDetail } from "../api/client";

export interface ExportPdfParams {
  plan: { name: string; fileName: string };
  run: RunDetail;
  planId: string;
}
