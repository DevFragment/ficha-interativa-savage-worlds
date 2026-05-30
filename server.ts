/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface ServerSheetStore {
  [id: string]: any;
}

const isVercel = process.env.VERCEL === "1" || !!process.env.NOW_BUILDER;
const dbPath = isVercel
  ? path.join("/tmp", "sheets.json")
  : path.join(process.cwd(), "sheets.json");

// Helper to load sheets
function loadSheets(): ServerSheetStore {
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

// Helper to save sheets
function saveSheets(sheets: ServerSheetStore) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(sheets, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao salvar banco de dados sheets.json:", err);
  }
}

export const app = express();
app.use(express.json({ limit: "10mb" }));

async function startServer() {
  if (isVercel) {
    return;
  }
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

  // API Routes
  
  // Create a sheet
  app.post("/api/sheets", (req, res) => {
    try {
      const sheets = loadSheets();
      const id = "sheet_" + Math.random().toString(36).substring(2, 11);
      const editToken = "edit_" + Math.random().toString(36).substring(2, 15);
      
      const newSheet = {
        ...req.body,
        id,
        editToken,
        lastUpdated: Date.now(),
      };
      
      sheets[id] = newSheet;
      saveSheets(sheets);
      
      res.status(201).json({ id, editToken, sheet: newSheet });
    } catch (error) {
      res.status(500).json({ error: "Erro interno ao criar ficha." });
    }
  });

  // Get a sheet
  app.get("/api/sheets/:id", (req, res) => {
    try {
      const sheets = loadSheets();
      const { id } = req.params;
      const { token } = req.query;
      
      const sheet = sheets[id];
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
      res.status(500).json({ error: "Erro ao carregar a ficha." });
    }
  });

  // Update a sheet
  app.put("/api/sheets/:id", (req, res) => {
    try {
      const sheets = loadSheets();
      const { id } = req.params;
      const { editToken } = req.body;
      
      const sheet = sheets[id];
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
      
      sheets[id] = updatedSheet;
      saveSheets(sheets);
      
      res.json({ success: true, sheet: updatedSheet });
    } catch (error) {
      res.status(500).json({ error: "Erro ao salvar alterações da ficha." });
    }
  });

  // Duplicate a sheet
  app.post("/api/sheets/:id/duplicate", (req, res) => {
    try {
      const sheets = loadSheets();
      const { id } = req.params;
      
      const source = sheets[id];
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
      
      sheets[newId] = duplicatedSheet;
      saveSheets(sheets);
      
      res.status(201).json({ id: newId, editToken: newEditToken, sheet: duplicatedSheet });
    } catch (error) {
      res.status(500).json({ error: "Erro ao duplicar a ficha." });
    }
  });

  // Vite Integration for Assets and Client Rendering
  if (process.env.NODE_ENV !== "production") {
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
