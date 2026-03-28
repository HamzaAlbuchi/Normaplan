import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const renderScript = resolve(apiRoot, "pdf_report", "render_report.py");

/**
 * Render PDF via ReportLab subprocess. Requires Python 3 + `pip install -r pdf_report/requirements.txt`.
 */
export async function renderPlanReportPdfFromPayload(payload: Record<string, unknown>): Promise<Buffer> {
  const python = config.pdfReportPython;
  const json = JSON.stringify(payload);

  return new Promise((resolvePromise, reject) => {
    const child = spawn(python, [renderScript], {
      cwd: apiRoot,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    const stderr: Buffer[] = [];
    const stdout: Buffer[] = [];

    child.stdout.on("data", (c: Buffer) => stdout.push(c));
    child.stderr.on("data", (c: Buffer) => stderr.push(c));

    child.on("error", (err) => {
      reject(
        new Error(
          `PDF engine failed to start (${python}). Install Python 3 and ReportLab: pip install -r apps/api/pdf_report/requirements.txt. ${err.message}`
        )
      );
    });

    child.on("close", (code) => {
      if (code !== 0) {
        const msg = Buffer.concat(stderr).toString("utf-8") || `exit ${code}`;
        reject(new Error(`PDF rendering failed: ${msg}`));
        return;
      }
      resolvePromise(Buffer.concat(stdout));
    });

    child.stdin.write(json, "utf-8");
    child.stdin.end();
  });
}
