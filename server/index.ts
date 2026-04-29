import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import db from "./db.ts";
import OpenAI from "openai";

const app = express();
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor backend en puerto ${PORT}`);
});
const RESET_PASSWORD = "sea123";
console.log("KEY:", process.env.OPENAI_API_KEY ? "OK" : "NO CARGADA");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
/* =========================================================
   HELPERS
========================================================= */

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || value.trim() === "") return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeTechRow(t: any) {
  return {
    name: t.name,
    status: t.status,
    blocked: !!t.blocked,
    currentJobId: t.currentJobId ?? null,
    competencies: safeJsonParse(t.competencies, {}),
    priorities: safeJsonParse(t.priorities, {}),
    avatar: t.avatar ?? null,
  };
}

function normalizeJobRow(job: any) {
  return {
    ...job,
    urgent: !!job.urgent,
    assignedNames: safeJsonParse(job.assignedNames, [] as string[]),
    startedAtMs: job.startedAtMs ?? null,
    closedAtMs: job.closedAtMs ?? null,
    template: job.template ?? null,
    quickEntryLabel: job.quickEntryLabel ?? null,
    quickEntryMode: job.quickEntryMode ?? null,
    actualMinutes: job.actualMinutes ?? null,
    workedAccumulatedMinutes: job.workedAccumulatedMinutes ?? 0,
    pausedAccumulatedMinutes: job.pausedAccumulatedMinutes ?? 0,
    pausedAtMs: job.pausedAtMs ?? null,
  };
}

function normalizeQuickTemplateRow(t: any) {
  return {
    ...t,
    allowedTechs: safeJsonParse(t.allowedTechs, [] as string[]),
    priorityOrder: safeJsonParse(t.priorityOrder, [] as string[]),
  };
}

/* =========================================================
   PATHS / UPLOADS
========================================================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

app.use("/uploads", express.static(uploadsDir));

/* =========================================================
   MULTER
========================================================= */

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const safeName = String(req.params.name)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${safeName}_${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

/* =========================================================
   BASIC
========================================================= */

app.get("/", (_req, res) => {
  res.send("Servidor SEA Tarragona funcionando");
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/ai-test", async (req, res) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Eres un asistente técnico." },
        { role: "user", content: "Dime una recomendación de tecnología para un mecánico" }
      ],
    });

    res.json({
      result: response.choices[0].message.content,
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error con OpenAI");
  }
});

/* =========================================================
   RESET
========================================================= */

app.post("/api/reset", (req, res) => {
  try {
    const { password } = req.body ?? {};

    if (password !== RESET_PASSWORD) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    db.prepare(`DELETE FROM jobs`).run();
    db.prepare(`DELETE FROM logs`).run();

    db.prepare(`
      UPDATE techs
      SET
        status = CASE WHEN name = 'Ramón' THEN 'supervisor' ELSE 'disponible' END,
        blocked = 0,
        currentJobId = NULL
    `).run();

    const techs = db
      .prepare(`
        SELECT name, status, blocked, currentJobId, competencies, priorities, avatar
        FROM techs
        ORDER BY id ASC
      `)
      .all() as any[];

    res.json({
      ok: true,
      message: "Sistema reiniciado correctamente",
      techs: techs.map(normalizeTechRow),
    });
  } catch (error) {
    console.error("POST /api/reset error:", error);
    res.status(500).json({ error: "Error reiniciando el sistema" });
  }
});
app.post("/api/ai/taller", async (req, res) => {
  try {
    const { jobs, techs, operationReport, techOperationStats } = req.body;

    const prompt = `
Eres un asistente de asignación para un taller.

Objetivo:
Recomendar el mejor técnico para cada trabajo en espera o activo.

Reglas obligatorias:
- No asignar técnicos bloqueados.
- No asignar técnicos ocupados como responsables.
- Respetar competencias por área y operación.
- Ramón solo como último recurso y con confirmación.
- Proteger técnicos de móvil si quedan pocos libres.
- En trabajos "1 técnico", no proponer apoyo.
- En camión normal, proponer responsable y apoyo si procede.

Datos actuales:
${JSON.stringify({
  waitingJobs: jobs.filter((j: any) => j.status === "espera"),
runningJobs: jobs.filter((j: any) => j.status === "activo"),
techs: techs.map((t: any) => ({
    name: t.name,
    status: t.status,
    blocked: t.blocked,
    currentJobId: t.currentJobId,
    competencies: t.competencies,
    priorities: t.priorities,
  })),
  operationReport,
  techOperationStats,
})}

Responde SOLO en JSON con este formato:
{
  "recommendations": [
    {
      "jobId": 1,
      "plate": "1234ABC",
      "responsable": "José",
      "apoyo": "Iván",
      "confidence": "alta",
      "reason": "Motivo breve"
    }
  ],
  "alerts": [
    "Alerta breve si existe"
  ],
  "summary": "Resumen general breve"
}

No inventes técnicos.
No propongas saltarte reglas.
Si no hay técnico válido, responsable debe ser null.
`;

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
    });

    res.json({
      text: response.output_text,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error IA" });
  }
});
/* =========================================================
   TECHS
========================================================= */

app.get("/api/techs", (_req, res) => {
  try {
    const rows = db
      .prepare(`
        SELECT name, status, blocked, currentJobId, competencies, priorities, avatar
        FROM techs
        ORDER BY id ASC
      `)
      .all() as any[];

    res.json(rows.map(normalizeTechRow));
  } catch (error) {
    console.error("GET /api/techs error:", error);
    res.status(500).json({ error: "Error obteniendo técnicos" });
  }
});

app.put("/api/techs/:name", (req, res) => {
  try {
    const name = String(req.params.name);
    const { status, blocked, currentJobId, competencies, priorities, avatar } =
      req.body ?? {};

    const exists = db.prepare(`SELECT 1 FROM techs WHERE name = ?`).get(name);

    if (!exists) {
      return res.status(404).json({ error: "Técnico no encontrado" });
    }

    db.prepare(`
      UPDATE techs
      SET status = ?, blocked = ?, currentJobId = ?, competencies = ?, priorities = ?, avatar = ?
      WHERE name = ?
    `).run(
      status ?? "disponible",
      blocked ? 1 : 0,
      currentJobId ?? null,
      JSON.stringify(competencies ?? {}),
      JSON.stringify(priorities ?? {}),
      avatar ?? null,
      name
    );

    const tech = db
      .prepare(`
        SELECT name, status, blocked, currentJobId, competencies, priorities, avatar
        FROM techs
        WHERE name = ?
      `)
      .get(name) as any;

    res.json(normalizeTechRow(tech));
  } catch (error) {
    console.error("PUT /api/techs/:name error:", error);
    res.status(500).json({ error: "Error actualizando técnico" });
  }
});

app.post("/api/techs/:name/avatar", upload.single("avatar"), (req, res) => {
  try {
    const name = String(req.params.name);

    if (!req.file) {
      return res.status(400).json({ error: "No se recibió archivo" });
    }

    const exists = db
      .prepare(`SELECT avatar FROM techs WHERE name = ?`)
      .get(name) as { avatar?: string | null } | undefined;

    if (!exists) {
      return res.status(404).json({ error: "Técnico no encontrado" });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    db.prepare(`
      UPDATE techs
      SET avatar = ?
      WHERE name = ?
    `).run(avatarUrl, name);

    const tech = db
      .prepare(`
        SELECT name, status, blocked, currentJobId, competencies, priorities, avatar
        FROM techs
        WHERE name = ?
      `)
      .get(name) as any;

    res.json(normalizeTechRow(tech));
  } catch (error) {
    console.error("POST /api/techs/:name/avatar error:", error);
    res.status(500).json({ error: "Error subiendo avatar" });
  }
});

/* =========================================================
   JOBS
========================================================= */

app.get("/api/jobs", (_req, res) => {
  try {
    const rows = db.prepare(`SELECT * FROM jobs ORDER BY id DESC`).all() as any[];
    res.json(rows.map(normalizeJobRow));
  } catch (error) {
    console.error("GET /api/jobs error:", error);
    res.status(500).json({ error: "Error obteniendo trabajos" });
  }
});

app.post("/api/jobs", (req, res) => {
  try {
    const job = req.body ?? {};

    db.prepare(`
      INSERT OR REPLACE INTO jobs (
        id,
        area,
        plate,
        urgent,
        status,
        assignedNames,
        reason,
        createdAtMs,
        startedAtMs,
        closedAtMs,
        template,
        quickEntryLabel,
        quickEntryMode,
        actualMinutes,
        workedAccumulatedMinutes,
        pausedAccumulatedMinutes,
        pausedAtMs
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      job.id,
      job.area,
      job.plate,
      job.urgent ? 1 : 0,
      job.status ?? "espera",
      JSON.stringify(Array.isArray(job.assignedNames) ? job.assignedNames : []),
      job.reason ?? "",
      job.createdAtMs ?? Date.now(),
      job.startedAtMs ?? null,
      job.closedAtMs ?? null,
      job.template ?? null,
      job.quickEntryLabel ?? null,
      job.quickEntryMode ?? null,
      job.actualMinutes ?? null,
      job.workedAccumulatedMinutes ?? 0,
      job.pausedAccumulatedMinutes ?? 0,
      job.pausedAtMs ?? null
    );

    const saved = db
      .prepare(`SELECT * FROM jobs WHERE id = ?`)
      .get(job.id) as any;

    res.json(normalizeJobRow(saved));
  } catch (error) {
    console.error("POST /api/jobs error:", error);
    res.status(500).json({ error: "Error guardando trabajo" });
  }
});

app.post("/api/jobs/:id/finish", (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      closedAtMs,
      actualMinutes,
      workedAccumulatedMinutes,
      pausedAccumulatedMinutes,
    } = req.body ?? {};

    db.prepare(`
      UPDATE jobs
      SET
        status = 'cerrado',
        closedAtMs = ?,
        actualMinutes = ?,
        workedAccumulatedMinutes = ?,
        pausedAccumulatedMinutes = ?,
        pausedAtMs = NULL
      WHERE id = ?
    `).run(
      closedAtMs ?? Date.now(),
      actualMinutes ?? null,
      workedAccumulatedMinutes ?? actualMinutes ?? 0,
      pausedAccumulatedMinutes ?? 0,
      id
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("POST /api/jobs/:id/finish error:", error);
    res.status(500).json({ error: "Error cerrando trabajo" });
  }
});

app.delete("/api/jobs/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    db.prepare(`DELETE FROM jobs WHERE id = ?`).run(id);

    res.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/jobs/:id error:", error);
    res.status(500).json({ error: "Error eliminando trabajo" });
  }
});

/* =========================================================
   LOGS
========================================================= */

app.get("/api/logs", (_req, res) => {
  try {
    const logs = db
      .prepare(`SELECT * FROM logs ORDER BY id DESC LIMIT 50`)
      .all();

    res.json(logs);
  } catch (error) {
    console.error("GET /api/logs error:", error);
    res.status(500).json({ error: "Error obteniendo logs" });
  }
});

app.post("/api/logs", (req, res) => {
  try {
    const log = req.body ?? {};

    db.prepare(`
      INSERT OR REPLACE INTO logs (id, time, text)
      VALUES (?, ?, ?)
    `).run(log.id, log.time, log.text);

    res.json({ ok: true });
  } catch (error) {
    console.error("POST /api/logs error:", error);
    res.status(500).json({ error: "Error guardando log" });
  }
});

/* =========================================================
   RULES
========================================================= */

app.get("/api/rules", (_req, res) => {
  try {
    const rules = db.prepare(`SELECT * FROM rules ORDER BY id ASC`).all();
    res.json(rules);
  } catch (error) {
    console.error("GET /api/rules error:", error);
    res.status(500).json({ error: "Error obteniendo reglas" });
  }
});

/* =========================================================
   QUICK TEMPLATES
========================================================= */

app.get("/api/quick-templates", (_req, res) => {
  try {
    const defaults = [
      {
        key: "alineacion_camion",
        label: "Alineación Camión",
        area: "camion",
        mode: "single",
        allowedTechs: JSON.stringify(["Anthoni", "Alejandro", "José"]),
        priorityOrder: JSON.stringify(["Anthoni", "Alejandro", "José"]),
      },
      {
        key: "pinchazo_camion",
        label: "Pinchazo camión",
        area: "camion",
        mode: "single",
        allowedTechs: JSON.stringify([
          "José",
          "Iván",
          "Alejandro",
          "Jesús",
          "Anthoni",
          "David",
        ]),
        priorityOrder: JSON.stringify([
          "José",
          "Iván",
          "Alejandro",
          "Jesús",
          "Anthoni",
          "David",
        ]),
      },
      {
        key: "cambio_4_neumaticos_camion",
        label: "Cambio de 4 neumáticos de camión",
        area: "camion",
        mode: "team",
        allowedTechs: JSON.stringify([
          "José",
          "Iván",
          "Alejandro",
          "Jesús",
          "Anthoni",
          "David",
        ]),
        priorityOrder: JSON.stringify([
          "José",
          "Iván",
          "Alejandro",
          "Jesús",
          "Anthoni",
          "David",
        ]),
      },
    ];

    const insert = db.prepare(`
      INSERT OR IGNORE INTO quick_templates
      (key, label, area, mode, allowedTechs, priorityOrder)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const item of defaults) {
      insert.run(
        item.key,
        item.label,
        item.area,
        item.mode,
        item.allowedTechs,
        item.priorityOrder
      );
    }

    const rows = db
      .prepare(`SELECT * FROM quick_templates ORDER BY id ASC`)
      .all() as any[];

    res.json(rows.map(normalizeQuickTemplateRow));
  } catch (error) {
    console.error("GET /api/quick-templates error:", error);
    res.status(500).json({ error: "Error obteniendo entradas rápidas" });
  }
});

app.post("/api/quick-templates", (req, res) => {
  try {
    const t = req.body ?? {};

    db.prepare(`
      INSERT INTO quick_templates
      (key, label, area, mode, allowedTechs, priorityOrder)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      t.key,
      t.label,
      t.area,
      t.mode,
      JSON.stringify(Array.isArray(t.allowedTechs) ? t.allowedTechs : []),
      JSON.stringify(Array.isArray(t.priorityOrder) ? t.priorityOrder : [])
    );

    const created = db
      .prepare(`SELECT * FROM quick_templates WHERE key = ?`)
      .get(t.key) as any;

    res.json(normalizeQuickTemplateRow(created));
  } catch (error) {
    console.error("POST /api/quick-templates error:", error);
    res.status(500).json({ error: "Error creando entrada rápida" });
  }
});

app.put("/api/quick-templates/:key", (req, res) => {
  try {
    const key = String(req.params.key);
    const { label, area, mode, allowedTechs, priorityOrder } = req.body ?? {};

    db.prepare(`
      UPDATE quick_templates
      SET label = ?, area = ?, mode = ?, allowedTechs = ?, priorityOrder = ?
      WHERE key = ?
    `).run(
      label,
      area,
      mode,
      JSON.stringify(Array.isArray(allowedTechs) ? allowedTechs : []),
      JSON.stringify(Array.isArray(priorityOrder) ? priorityOrder : []),
      key
    );

    const template = db
      .prepare(`SELECT * FROM quick_templates WHERE key = ?`)
      .get(key) as any;

    if (!template) {
      return res.status(404).json({ error: "Entrada rápida no encontrada" });
    }

    res.json(normalizeQuickTemplateRow(template));
  } catch (error) {
    console.error("PUT /api/quick-templates/:key error:", error);
    res.status(500).json({ error: "Error actualizando entrada rápida" });
  }
});

app.delete("/api/quick-templates/:key", (req, res) => {
  try {
    db.prepare(`DELETE FROM quick_templates WHERE key = ?`).run(req.params.key);
    res.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/quick-templates/:key error:", error);
    res.status(500).json({ error: "Error eliminando entrada rápida" });
  }
});

const scheduledJobsFile = path.join(
  process.cwd(),
  "server",
  "scheduled-jobs.json"
);

function readScheduledJobs() {
  try {
    if (!fs.existsSync(scheduledJobsFile)) {
      fs.writeFileSync(scheduledJobsFile, "[]", "utf-8");
      return [];
    }

    const raw = fs.readFileSync(scheduledJobsFile, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (error) {
    console.error("Error leyendo scheduled-jobs:", error);
    return [];
  }
}

function writeScheduledJobs(items: any[]) {
  try {
    fs.writeFileSync(
      scheduledJobsFile,
      JSON.stringify(items, null, 2),
      "utf-8"
    );
  } catch (error) {
    console.error("Error guardando scheduled-jobs:", error);
  }
}

app.get("/api/scheduled-jobs", (_req, res) => {
  res.json(readScheduledJobs());
});

app.put("/api/scheduled-jobs", (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [];
  writeScheduledJobs(items);
  res.json(items);
});

/* =========================================================
   404 / ERROR
========================================================= */

app.use((_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.use(
  (
    error: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled server error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
);

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {
  console.log(`Servidor backend en http://localhost:${PORT}`);
});