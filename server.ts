/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "dotenv/config";
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

// Delete a single sheet
async function deleteSheet(id: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    await redis.del(`sheet:${id}`);
    return;
  }
  // File fallback
  const sheets = loadSheetsFromFile();
  delete sheets[id];
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

// Delete a sheet
app.delete("/api/sheets/:id", async (req, res) => {
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

    await deleteSheet(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir ficha:", error);
    res.status(500).json({ error: "Erro ao excluir a ficha." });
  }
});

// Parse a character sheet PDF using Gemini AI
app.post("/api/sheets/parse-pdf", async (req, res) => {
  try {
    const { pdfBase64 } = req.body;
    if (!pdfBase64) {
      res.status(400).json({ error: "Nenhum arquivo PDF fornecido." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(400).json({ 
        error: "A chave da API do Gemini (GEMINI_API_KEY) não está configurada no servidor. Por favor, crie um arquivo .env na raiz do projeto e configure GEMINI_API_KEY=sua_chave para habilitar a importação por IA." 
      });
      return;
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    // Clean up base64 prefix if present
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");

    const prompt = `Você é um assistente especializado no sistema de RPG Savage Worlds (Edição Aventura / SWADE).
Sua tarefa é analisar o arquivo PDF de ficha de personagem enviado e extrair todas as informações dele de forma estruturada.
A saída deve obrigatoriamente estar em formato JSON e seguir exatamente a estrutura especificada.

Atenção especial às regras de mapeamento:
1. Identifique o Nome do Personagem (nomePersonagem), Raça (raca), Jogador (jogador), Campanha (campanha), Conceito (conceito), Aparência (aparencia) e Histórico (historia).
2. Identifique os atributos (Agilidade, Astúcia, Espírito, Força, Vigor). Mapeie cada um deles em um objeto contendo o tipo de dado (d4, d6, d8, d10, d12) e o modificador numérico (ex: se for d6+1, o dado é "d6" e o mod é 1. Se for d8, o dado é "d8" e o mod é 0).
3. Identifique as perícias. Para cada perícia encontrada, determine o nome dela, o atributo associado correto seguindo as regras do Savage Worlds (ex: Lutar -> Agilidade, Perceber -> Astúcia, Persuadir -> Espírito, etc.), se possui (true), o tipo de dado (d4 a d12) e o modificador numérico (mod).
4. Identifique as vantagens (vantagens) e complicações (complicacoes). Agrupe-as em texto corrido ou listas formatadas em português.
5. Identifique as armas. Para cada arma, obtenha o nome, dano, alcance, cdt (taxa de tiro), pa (penetração de armadura), peso e observações.
6. Identifique os poderes (se houver). Mapeie nome, estágio, custo, distância, duração e efeito.
7. Identifique os valores de Bênes (benes), Ferimentos (ferimentos), Fadiga (fadiga), XP (xp) e XP Track (xpTrack, estágio como Novato, Experiente, Veterano, etc.) se estiverem preenchidos no PDF.

Retorne os dados traduzidos ou mapeados fielmente ao que está no PDF.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: "application/pdf",
          },
        },
        prompt,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            nomePersonagem: { type: "STRING" },
            jogador: { type: "STRING" },
            campanha: { type: "STRING" },
            raca: { type: "STRING" },
            conceito: { type: "STRING" },
            aparencia: { type: "STRING" },
            historia: { type: "STRING" },
            equipamentoGeral: { type: "STRING" },
            pesoCarregado: { type: "STRING" },
            pesoLimite: { type: "STRING" },
            benes: { type: "INTEGER" },
            ferimentos: { type: "INTEGER" },
            fadiga: { type: "INTEGER" },
            xp: { type: "INTEGER" },
            xpTrack: { type: "STRING" },
            atributos: {
              type: "OBJECT",
              properties: {
                Agilidade: {
                  type: "OBJECT",
                  properties: {
                    dado: { type: "STRING", enum: ["d4", "d6", "d8", "d10", "d12"] },
                    mod: { type: "INTEGER" }
                  },
                  required: ["dado", "mod"]
                },
                Astúcia: {
                  type: "OBJECT",
                  properties: {
                    dado: { type: "STRING", enum: ["d4", "d6", "d8", "d10", "d12"] },
                    mod: { type: "INTEGER" }
                  },
                  required: ["dado", "mod"]
                },
                Espírito: {
                  type: "OBJECT",
                  properties: {
                    dado: { type: "STRING", enum: ["d4", "d6", "d8", "d10", "d12"] },
                    mod: { type: "INTEGER" }
                  },
                  required: ["dado", "mod"]
                },
                Força: {
                  type: "OBJECT",
                  properties: {
                    dado: { type: "STRING", enum: ["d4", "d6", "d8", "d10", "d12"] },
                    mod: { type: "INTEGER" }
                  },
                  required: ["dado", "mod"]
                },
                Vigor: {
                  type: "OBJECT",
                  properties: {
                    dado: { type: "STRING", enum: ["d4", "d6", "d8", "d10", "d12"] },
                    mod: { type: "INTEGER" }
                  },
                  required: ["dado", "mod"]
                }
              },
              required: ["Agilidade", "Astúcia", "Espírito", "Força", "Vigor"]
            },
            pericias: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  nome: { type: "STRING" },
                  atributoAssociado: { type: "STRING", enum: ["Agilidade", "Astúcia", "Espírito", "Força", "Vigor"] },
                  possui: { type: "BOOLEAN" },
                  dado: { type: "STRING", enum: ["d4", "d6", "d8", "d10", "d12"] },
                  mod: { type: "INTEGER" }
                },
                required: ["nome", "atributoAssociado", "possui", "dado", "mod"]
              }
            },
            vantagens: { type: "STRING" },
            complicacoes: { type: "STRING" },
            poderes: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  nome: { type: "STRING" },
                  estagio: { type: "STRING" },
                  custo: { type: "STRING" },
                  distancia: { type: "STRING" },
                  duracao: { type: "STRING" },
                  efeito: { type: "STRING" }
                },
                required: ["nome", "efeito"]
              }
            },
            armas: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  nome: { type: "STRING" },
                  dano: { type: "STRING" },
                  alcance: { type: "STRING" },
                  cdt: { type: "STRING" },
                  pa: { type: "STRING" },
                  peso: { type: "STRING" },
                  observacoes: { type: "STRING" }
                },
                required: ["nome", "dano"]
              }
            },
            apararMod: { type: "INTEGER" },
            resistenciaMod: { type: "INTEGER" }
          },
          required: ["nomePersonagem", "atributos", "pericias"]
        }
      }
    });

    const parsedJsonText = response.text;
    if (!parsedJsonText) {
      throw new Error("O Gemini retornou uma resposta vazia.");
    }

    const characterData = JSON.parse(parsedJsonText);
    res.json(characterData);
  } catch (error: any) {
    console.error("Erro no processamento do PDF:", error);
    res.status(500).json({ error: `Erro ao processar o PDF com IA: ${error.message || error}` });
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
