/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";

interface ServerSheetStore {
  [id: string]: any;
}

const isVercel = process.env.VERCEL === "1" || !!process.env.NOW_BUILDER;
const dbPath = isVercel
  ? path.join("/tmp", "sheets.json")
  : path.join(process.cwd(), "sheets.json");

// ---------------------------------------------------------------------------
// Storage helpers — uses Vercel KV (persistent Redis) when available,
// falls back to local JSON file for development.
// ---------------------------------------------------------------------------

async function getRedis() {
  // Vercel Upstash integration auto-injects these env vars (KV_REST_API_URL or UPSTASH_REDIS_REST_URL)
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (isVercel && url && token) {
    try {
      const { Redis } = await import("@upstash/redis");
      return new Redis({ url, token });
    } catch {
      return null;
    }
  }
  return null;
}

// Load a single sheet by id
async function loadSheet(id: string): Promise<any | null> {
  const redis = await getRedis();
  if (redis) {
    return redis.get(`sheet:${id}`);
  }
  // File fallback
  const sheets = loadSheetsFromFile();
  return sheets[id] || null;
}

// Save a single sheet
async function saveSheet(id: string, sheet: any): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    await redis.set(`sheet:${id}`, JSON.stringify(sheet));
    return;
  }
  // File fallback
  const sheets = loadSheetsFromFile();
  sheets[id] = sheet;
  saveSheetsToFile(sheets);
}

// File-based helpers (local dev only)
function loadSheetsFromFile(): ServerSheetStore {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Erro ao carregar banco de dados sheets.json:", err);
  }
  return {};
}

function saveSheetsToFile(sheets: ServerSheetStore) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(sheets, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao salvar banco de dados sheets.json:", err);
  }
}

// ---------------------------------------------------------------------------
// Express app & API routes
// ---------------------------------------------------------------------------

export const app = express();
app.use(express.json({ limit: "10mb" }));

// Create a sheet
app.post("/api/sheets", async (req, res) => {
  try {
    const id = "sheet_" + Math.random().toString(36).substring(2, 11);
    const editToken = "edit_" + Math.random().toString(36).substring(2, 15);

    const newSheet = {
      ...req.body,
      id,
      editToken,
      lastUpdated: Date.now(),
    };

    await saveSheet(id, newSheet);

    res.status(201).json({ id, editToken, sheet: newSheet });
  } catch (error) {
    console.error("Erro ao criar ficha:", error);
    res.status(500).json({ error: "Erro interno ao criar ficha." });
  }
});

// Get a sheet
app.get("/api/sheets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    const sheet = await loadSheet(id);
    if (!sheet) {
      res.status(404).json({ error: "Ficha não encontrada." });
      return;
    }

    const isEditable = token === sheet.editToken;

    // Strip editToken for privacy when returning sheet to read-only viewers
    const responseSheet = { ...sheet };
    if (!isEditable) {
      delete responseSheet.editToken;
    }

    res.json({ sheet: responseSheet, isEditable });
  } catch (error) {
    console.error("Erro ao carregar ficha:", error);
    res.status(500).json({ error: "Erro ao carregar a ficha." });
  }
});

// Update a sheet
app.put("/api/sheets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { editToken } = req.body;

    const sheet = await loadSheet(id);
    if (!sheet) {
      res.status(404).json({ error: "Ficha não encontrada." });
      return;
    }

    if (!editToken || sheet.editToken !== editToken) {
      res.status(403).json({ error: "Acesso negado. Token de edição inválido." });
      return;
    }

    // Update sheet data
    const updatedSheet = {
      ...req.body,
      id,
      editToken: sheet.editToken, // ensure editToken never changes
      lastUpdated: Date.now(),
    };

    await saveSheet(id, updatedSheet);

    res.json({ success: true, sheet: updatedSheet });
  } catch (error) {
    console.error("Erro ao salvar ficha:", error);
    res.status(500).json({ error: "Erro ao salvar alterações da ficha." });
  }
});

// Duplicate a sheet
app.post("/api/sheets/:id/duplicate", async (req, res) => {
  try {
    const { id } = req.params;

    const source = await loadSheet(id);
    if (!source) {
      res.status(404).json({ error: "Ficha de origem não encontrada." });
      return;
    }

    const newId = "sheet_" + Math.random().toString(36).substring(2, 11);
    const newEditToken = "edit_" + Math.random().toString(36).substring(2, 15);

    const duplicatedSheet = {
      ...source,
      id: newId,
      editToken: newEditToken,
      nomePersonagem: `${source.nomePersonagem} (Cópia)`,
      lastUpdated: Date.now(),
    };

    await saveSheet(newId, duplicatedSheet);

    res.status(201).json({ id: newId, editToken: newEditToken, sheet: duplicatedSheet });
  } catch (error) {
    console.error("Erro ao duplicar ficha:", error);
    res.status(500).json({ error: "Erro ao duplicar a ficha." });
  }
});

// Debug endpoint — helps diagnose Vercel routing issues
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    isVercel,
    hasRedis: !!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL),
    timestamp: Date.now(),
  });
});

// ---------------------------------------------------------------------------
// Local development server (Vite + listen) — skipped on Vercel
// ---------------------------------------------------------------------------
async function startServer() {
  if (isVercel) {
    return;
  }
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

  // Vite Integration for Assets and Client Rendering
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
