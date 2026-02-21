const express = require("express");
const { chromium } = require("playwright");
const { randomUUID } = require("crypto");
const { execFile } = require("child_process");
const { writeFile, rm } = require("fs/promises");
const path = require("path");
const os = require("os");

const PORT = Number(process.env.PORT || 8787);
const PRINTER_NAME = process.env.PRINT_PRINTER_NAME;
const LABEL_WIDTH_MM = 62;
const LABEL_HEIGHT_MM = 90;

const app = express();
app.use(express.json({ limit: "1mb" }));

const queue = [];
let isProcessing = false;
const jobStatus = new Map();

function validatePayload(body) {
  if (!body || typeof body !== "object") return "Ugyldig payload.";
  if (body.type !== "student" && body.type !== "company") return "Mangler type (student/company).";
  if (!body.fullName || typeof body.fullName !== "string") return "Mangler fullName.";
  if (body.type === "student" && !body.studyProgram) return "Mangler studyProgram.";
  if (body.type === "company" && !body.companyName) return "Mangler companyName.";
  return null;
}

function renderTemplate(payload) {
  const subline = payload.type === "student"
    ? `${payload.studyProgram || ""}${payload.university ? ` · ${payload.university}` : ""}`
    : `${payload.position || ""}${payload.companyName ? ` · ${payload.companyName}` : ""}`;
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm; margin: 0; }
        html, body {
          width: ${LABEL_WIDTH_MM}mm;
          height: ${LABEL_HEIGHT_MM}mm;
          margin: 0;
          padding: 0;
          font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
          background: #fff;
          color: #0f0a2a;
        }
        .label {
          width: 100%;
          height: 100%;
          padding: 10mm 8mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 6mm;
        }
        .name {
          font-size: 20pt;
          font-weight: 700;
          line-height: 1.1;
          word-break: break-word;
        }
        .subline {
          font-size: 12pt;
          font-weight: 500;
          color: #3a2d78;
          word-break: break-word;
        }
        .meta {
          font-size: 8pt;
          color: #7b6aa9;
        }
      </style>
    </head>
    <body>
      <div class="label">
        <div class="name">${payload.fullName}</div>
        <div class="subline">${subline || ""}</div>
      </div>
    </body>
  </html>`;
}

async function ensureBrowser() {
  if (!ensureBrowser.browser) {
    ensureBrowser.browser = await chromium.launch({ headless: true });
  }
  return ensureBrowser.browser;
}

async function renderPdf(payload) {
  const browser = await ensureBrowser();
  const page = await browser.newPage({ viewport: { width: 800, height: 1200 } });
  const html = renderTemplate(payload);
  await page.setContent(html, { waitUntil: "networkidle" });
  const pdfBuffer = await page.pdf({
    width: `${LABEL_WIDTH_MM}mm`,
    height: `${LABEL_HEIGHT_MM}mm`,
    printBackground: true,
    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
  });
  await page.close();
  const filePath = path.join(os.tmpdir(), `osh-label-${randomUUID()}.pdf`);
  await writeFile(filePath, pdfBuffer);
  return filePath;
}

function runLp(filePath) {
  return new Promise((resolve, reject) => {
    if (!PRINTER_NAME) {
      reject(new Error("PRINT_PRINTER_NAME er ikke satt."));
      return;
    }
    execFile("lp", ["-d", PRINTER_NAME, filePath], (error, stdout, stderr) => {
      if (error) {
        const message = stderr?.toString()?.trim() || error.message;
        reject(new Error(message));
        return;
      }
      resolve(stdout?.toString()?.trim() || "printed");
    });
  });
}

async function processJob(job) {
  jobStatus.set(job.id, { status: "rendering" });
  console.log(`[print-agent] render start ${job.id}`);
  let pdfPath;
  try {
    pdfPath = await renderPdf(job.payload);
  } catch (error) {
    console.error(`[print-agent] render failed ${job.id}`, error);
    jobStatus.set(job.id, { status: "failed", error: error.message });
    return;
  }

  jobStatus.set(job.id, { status: "printing" });
  console.log(`[print-agent] printing ${job.id}`);
  let attempt = 0;
  let printed = false;
  while (attempt < 3 && !printed) {
    try {
      attempt += 1;
      await runLp(pdfPath);
      printed = true;
      jobStatus.set(job.id, { status: "printed" });
      console.log(`[print-agent] printed ${job.id}`);
    } catch (error) {
      console.error(`[print-agent] print failed ${job.id} attempt ${attempt}`, error);
      if (attempt >= 3) {
        jobStatus.set(job.id, { status: "failed", error: error.message });
      }
    }
  }

  if (pdfPath) {
    await rm(pdfPath, { force: true });
  }
}

async function processQueue() {
  if (isProcessing) return;
  if (queue.length === 0) return;
  isProcessing = true;
  while (queue.length > 0) {
    const job = queue.shift();
    if (!job) continue;
    await processJob(job);
  }
  isProcessing = false;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/print", (req, res) => {
  const error = validatePayload(req.body);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const jobId = randomUUID();
  jobStatus.set(jobId, { status: "queued" });
  queue.push({ id: jobId, payload: req.body });
  console.log(`[print-agent] queued ${jobId}`);
  setImmediate(processQueue);
  res.json({ jobId, status: "queued" });
});

process.on("SIGINT", async () => {
  if (ensureBrowser.browser) {
    await ensureBrowser.browser.close();
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`[print-agent] listening on :${PORT}`);
});
