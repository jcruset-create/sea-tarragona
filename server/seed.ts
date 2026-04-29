import db, { initDb } from "./db.ts";

async function seed() {
  await initDb();

  const techs = [
    {
      name: "Ramón",
      status: "supervisor",
      blocked: false,
      competencies: {},
      priorities: {},
    },
    {
      name: "José",
      status: "disponible",
      blocked: false,
      competencies: {},
      priorities: {},
    },
    {
      name: "Iván",
      status: "disponible",
      blocked: false,
      competencies: {},
      priorities: {},
    },
    {
      name: "Alejandro",
      status: "disponible",
      blocked: false,
      competencies: {},
      priorities: {},
    },
    {
      name: "Jesús",
      status: "disponible",
      blocked: false,
      competencies: {},
      priorities: {},
    },
    {
      name: "Anthoni",
      status: "disponible",
      blocked: false,
      competencies: {},
      priorities: {},
    },
    {
      name: "David",
      status: "disponible",
      blocked: false,
      competencies: {},
      priorities: {},
    },
  ];

  for (const tech of techs) {
    await db.query(
      `
        INSERT INTO techs
        (name, status, blocked, "currentJobId", competencies, priorities, avatar)
        VALUES ($1, $2, $3, NULL, $4, $5, NULL)
        ON CONFLICT (name) DO UPDATE SET
          status = EXCLUDED.status,
          blocked = EXCLUDED.blocked,
          competencies = EXCLUDED.competencies,
          priorities = EXCLUDED.priorities
      `,
      [
        tech.name,
        tech.status,
        tech.blocked,
        JSON.stringify(tech.competencies),
        JSON.stringify(tech.priorities),
      ]
    );
  }

  const rules = [
    "No asignar técnicos bloqueados.",
    "No asignar técnicos ocupados como responsables.",
    "Ramón solo como supervisor o último recurso.",
    "Priorizar técnicos disponibles según competencias.",
  ];

  for (const text of rules) {
    await db.query(
      `
        INSERT INTO rules (text)
        SELECT $1
        WHERE NOT EXISTS (
          SELECT 1 FROM rules WHERE text = $1
        )
      `,
      [text]
    );
  }

  const quickTemplates = [
    {
      key: "alineacion_camion",
      label: "Alineación Camión",
      area: "camion",
      mode: "single",
      allowedTechs: ["Anthoni", "Alejandro", "José"],
      priorityOrder: ["Anthoni", "Alejandro", "José"],
    },
    {
      key: "pinchazo_camion",
      label: "Pinchazo camión",
      area: "camion",
      mode: "single",
      allowedTechs: ["José", "Iván", "Alejandro", "Jesús", "Anthoni", "David"],
      priorityOrder: ["José", "Iván", "Alejandro", "Jesús", "Anthoni", "David"],
    },
    {
      key: "cambio_4_neumaticos_camion",
      label: "Cambio de 4 neumáticos de camión",
      area: "camion",
      mode: "team",
      allowedTechs: ["José", "Iván", "Alejandro", "Jesús", "Anthoni", "David"],
      priorityOrder: ["José", "Iván", "Alejandro", "Jesús", "Anthoni", "David"],
    },
  ];

  for (const item of quickTemplates) {
    await db.query(
      `
        INSERT INTO quick_templates
        (key, label, area, mode, "allowedTechs", "priorityOrder")
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (key) DO UPDATE SET
          label = EXCLUDED.label,
          area = EXCLUDED.area,
          mode = EXCLUDED.mode,
          "allowedTechs" = EXCLUDED."allowedTechs",
          "priorityOrder" = EXCLUDED."priorityOrder"
      `,
      [
        item.key,
        item.label,
        item.area,
        item.mode,
        JSON.stringify(item.allowedTechs),
        JSON.stringify(item.priorityOrder),
      ]
    );
  }

  console.log("Seed completado correctamente");
  await db.end();
}

seed().catch(async (error) => {
  console.error("Error ejecutando seed:", error);
  await db.end();
  process.exit(1);
});