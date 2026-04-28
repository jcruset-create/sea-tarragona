import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock3,
  Monitor,
  ShieldAlert,
  Zap,
  TimerReset,
  PauseCircle,
} from "lucide-react";

type Job = {
  id: number;
  plate: string;
  area: string;
  status: string;
  urgent?: boolean;
  assignedNames?: string[];
  reason?: string;
  quickEntryLabel?: string | null;
  template?: string | null;
  startedAtMs?: number | null;
  createdAtMs?: number | null;
  actualMinutes?: number | null;
};

type Tech = {
  name: string;
  status: string;
  currentJobId?: number | null;
};

export default function WorkshopWallScreen({
  jobs = [],
  techs = [],
  onBack,
}: {
  jobs?: Job[];
  techs?: Tech[];
  onBack: () => void;
}) {
  const active = jobs.filter(
    (j) => j.status === "activo" || j.status === "en_proceso"
  );

  const waiting = jobs.filter(
    (j) => j.status === "espera" || j.status === "pendiente"
  );

  const paused = jobs.filter((j) => j.status === "parado");

  const libres = techs.filter((t) => t.status === "disponible").length;
  const responsables = techs.filter((t) => t.status === "ocupado").length;
  const refuerzos = techs.filter((t) => t.status === "refuerzo").length;
  const urgentes = jobs.filter((j) => j.urgent && j.status !== "cerrado").length;

  const bloqueoTaller = waiting.length >= 3 && libres === 0;

  const alertItems = [
    ...(bloqueoTaller
      ? [
          {
            id: "bloqueo",
            level: "danger" as const,
            text: "Bloqueo de taller: cola alta y sin técnicos libres.",
          },
        ]
      : []),
    ...(urgentes > 0
      ? [
          {
            id: "urgentes",
            level: "warning" as const,
            text: `Hay ${urgentes} trabajo(s) urgente(s) abiertos.`,
          },
        ]
      : []),
    ...(paused.length > 0
      ? [
          {
            id: "parados",
            level: "warning" as const,
            text: `Hay ${paused.length} trabajo(s) parado(s) pendiente(s) de reactivar.`,
          },
        ]
      : []),
    ...(!bloqueoTaller && urgentes === 0 && paused.length === 0
      ? [
          {
            id: "ok",
            level: "info" as const,
            text: "Operativa estable. Sin alertas críticas.",
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a,#020617_55%)] text-white">
      <div className="mx-auto grid min-h-screen max-w-[1900px] grid-cols-12 gap-3 px-4 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-12 overflow-hidden rounded-b-[28px] rounded-t-none border border-white/10 bg-white/5 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="flex items-center gap-4">
              <div className="rounded-3xl bg-white/10 p-4 shadow-lg">
                <Monitor className="h-9 w-9" />
              </div>

              <div>
                <h1 className="text-4xl font-semibold tracking-tight">
                  Pantalla TV · Taller SEA Tarragona
                </h1>
                <p className="mt-1 text-base text-slate-300">
                  Dashboard operativo en tiempo real
                </p>

                {bloqueoTaller && (
                  <div className="mt-2 inline-flex rounded-full border border-red-400/40 bg-red-500/20 px-4 py-1 text-sm font-semibold text-red-100">
                    BLOQUEO DE TALLER
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
              >
                ← Volver
              </button>

              <div className="rounded-3xl border border-white/10 bg-black/20 px-6 py-3 text-right">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Hora actual
                </div>
                <LiveClock />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 border-t border-white/10">
            <MiniKpi title="Libres" value={libres} tone="emerald" />
            <MiniKpi title="Responsables" value={responsables} tone="red" />
            <MiniKpi title="Refuerzos" value={refuerzos} tone="amber" />
            <MiniKpi title="Urgentes" value={urgentes} tone="violet" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-12 min-h-[470px] rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur xl:col-span-9"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Clock3 className="h-5 w-5" />
              Trabajos activos
            </div>

            <div className="rounded-full border border-white/10 bg-white/10 px-4 py-1 text-sm text-slate-200">
              {active.length} en marcha
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {active.length === 0 ? (
              <div className="col-span-full rounded-[24px] border border-dashed border-white/10 p-12 text-center text-slate-300">
                Sin trabajos activos.
              </div>
            ) : (
              active.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={`rounded-[24px] border p-4 ${getJobCardClass(job)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-3xl font-bold">{job.plate}</div>
                      <div className="mt-1 text-sm uppercase text-slate-300">
                        {job.quickEntryLabel || job.area}
                      </div>
                    </div>

                    {job.urgent && (
                      <motion.div
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white"
                      >
                        URGENTE
                      </motion.div>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-widest text-slate-400">
                        Actual
                      </div>
                      <div className="mt-1 text-xl font-bold">
                        {formatMinutes(
                          getElapsedMinutes(job.startedAtMs || job.createdAtMs)
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-widest text-slate-400">
                        Estado
                      </div>
                      <div className="mt-1 text-sm font-semibold uppercase">
                        {job.status}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-widest text-slate-400">
                      Motivo
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      {job.reason ||
                        job.quickEntryLabel ||
                        "Motivo no especificado"}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-2 text-[10px] uppercase tracking-widest text-slate-400">
                      Asignados
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(job.assignedNames ?? []).length === 0 ? (
                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-300">
                          Sin asignar
                        </span>
                      ) : (
                        (job.assignedNames ?? []).map((name, idx) => (
                          <span
                            key={`${job.id}-${name}`}
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              idx === 0
                                ? "bg-white text-slate-900"
                                : "border border-amber-300/30 bg-amber-500/20 text-amber-100"
                            }`}
                          >
                            {idx === 0 ? `Resp. ${name}` : `Apoyo ${name}`}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        <div className="col-span-12 space-y-3 xl:col-span-3">
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="min-h-[250px] rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <TimerReset className="h-5 w-5" />
                Cola de espera
              </div>

              <div className="rounded-full border border-amber-400/20 bg-amber-500/15 px-3 py-1 text-sm text-amber-100">
                {waiting.length}
              </div>
            </div>

            <div className="space-y-3">
              {waiting.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/10 p-8 text-center text-slate-300">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
                  <div className="mt-3 font-semibold">Sin espera</div>
                  <div className="mt-1 text-sm text-slate-400">
                    No hay trabajos pendientes.
                  </div>
                </div>
              ) : (
                waiting.slice(0, 8).map((job, index) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className={`rounded-2xl border p-3 ${getWaitingCardClass(job)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold">{job.plate}</div>
                        <div className="text-xs opacity-80">
                          {job.quickEntryLabel || job.area}
                        </div>
                      </div>

                      {job.urgent && (
                        <div className="rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold">
                          URGENTE
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-xs opacity-80">
                      {job.reason ||
                        job.quickEntryLabel ||
                        "Pendiente de asignación"}
                    </div>
                  </motion.div>
                ))
              )}

              {waiting.length > 8 && (
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center text-sm text-slate-300">
                  + {waiting.length - 8} trabajos más en cola
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="min-h-[220px] rounded-[28px] border border-amber-400/20 bg-amber-500/10 p-4 shadow-xl backdrop-blur"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-semibold text-amber-100">
                <PauseCircle className="h-5 w-5" />
                Trabajos parados
              </div>

              <div className="rounded-full border border-amber-400/20 bg-amber-500/20 px-3 py-1 text-sm text-amber-100">
                {paused.length}
              </div>
            </div>

            <div className="space-y-3">
              {paused.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-amber-300/20 p-6 text-center text-amber-100/80">
                  Sin trabajos parados.
                </div>
              ) : (
                paused.slice(0, 6).map((job, index) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className={`rounded-2xl border p-3 ${getJobCardClass(job)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold">{job.plate}</div>
                        <div className="text-xs opacity-80">
                          {job.quickEntryLabel || job.area}
                        </div>
                      </div>

                      <div className="rounded-full bg-amber-500 px-2 py-1 text-[10px] font-bold text-white">
                        PARADO
                      </div>
                    </div>

                    <div className="mt-2 text-xs opacity-80">
                      {job.reason || "Trabajo parado temporalmente."}
                    </div>
                  </motion.div>
                ))
              )}

              {paused.length > 6 && (
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center text-sm text-slate-300">
                  + {paused.length - 6} trabajos parados más
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur"
          >
            <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <ShieldAlert className="h-5 w-5" />
              Alertas
            </div>

            <div className="space-y-3">
              {alertItems.map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: alert.level === "danger" ? [1, 1.02, 1] : 1,
                  }}
                  transition={{
                    delay: index * 0.05,
                    duration: 0.35,
                    repeat: alert.level === "danger" ? Infinity : 0,
                    repeatDelay: 1.2,
                  }}
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                    alert.level === "danger"
                      ? "border-red-400/40 bg-red-500/20 text-red-100"
                      : alert.level === "warning"
                      ? "border-amber-400/40 bg-amber-500/20 text-amber-100"
                      : "border-sky-400/30 bg-sky-500/15 text-sky-100"
                  }`}
                >
                  {alert.text}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-12 rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Zap className="h-5 w-5" />
              Estado del equipo
            </div>

            <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-slate-200">
              {techs.length} técnicos visibles
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            {techs.map((tech, index) => (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${getTechCardClass(
                  tech.status
                )}`}
              >
                <div>
                  <div className="font-semibold">{tech.name}</div>
                  <div className="text-xs text-slate-300">
                    {tech.currentJobId != null
                      ? `Trabajo ${tech.currentJobId}`
                      : "Sin trabajo activo"}
                  </div>
                </div>

                <div
                  className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${getStatusPill(
                    tech.status
                  )}`}
                >
                  {tech.status}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mt-1 text-4xl font-semibold tabular-nums">
      {now.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </div>
  );
}

function MiniKpi({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "emerald" | "red" | "amber" | "violet";
}) {
  const tones = {
    emerald: "text-emerald-300 border-emerald-400/20 bg-emerald-500/10",
    red: "text-red-300 border-red-400/20 bg-red-500/10",
    amber: "text-amber-300 border-amber-400/20 bg-amber-500/10",
    violet: "text-violet-300 border-violet-400/20 bg-violet-500/10",
  };

  return (
    <motion.div
      animate={
        title === "Urgentes" && value > 0
          ? { scale: [1, 1.03, 1] }
          : { scale: 1 }
      }
      transition={
        title === "Urgentes" && value > 0
          ? { repeat: Infinity, duration: 1.2 }
          : { duration: 0.2 }
      }
      className={`flex items-center justify-between border-r border-white/10 px-6 py-4 ${tones[tone]}`}
    >
      <div className="text-xs uppercase tracking-[0.3em]">{title}</div>
      <div className="text-3xl font-bold">{value}</div>
    </motion.div>
  );
}

function getElapsedMinutes(ms?: number | null) {
  if (!ms) return null;
  return Math.max(0, Math.round((Date.now() - ms) / 60000));
}

function formatMinutes(minutes?: number | null) {
  if (minutes == null || Number.isNaN(minutes)) return "-";
  const rounded = Math.round(minutes);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

function getJobCardClass(job: Job) {
  const area = job.area?.toLowerCase() ?? "";

  if (job.urgent) return "border-red-400/50 bg-red-500/25 text-red-50";
  if (area.includes("camion")) return "border-red-300/50 bg-red-500/15 text-red-50";
  if (area.includes("movil")) return "border-amber-300/50 bg-amber-500/15 text-amber-50";
  if (area.includes("tacografo")) return "border-violet-300/50 bg-violet-500/15 text-violet-50";
  if (area.includes("turismo")) return "border-sky-300/50 bg-sky-500/15 text-sky-50";
  if (area.includes("mecanica")) return "border-emerald-300/50 bg-emerald-500/15 text-emerald-50";

  return "border-slate-300/30 bg-slate-500/10 text-slate-50";
}

function getWaitingCardClass(job: Job) {
  return getJobCardClass(job);
}

function getTechCardClass(status: string) {
  if (status === "disponible") return "border-emerald-400/20 bg-emerald-500/15";
  if (status === "ocupado") return "border-red-400/20 bg-red-500/20";
  if (status === "refuerzo") return "border-amber-400/20 bg-amber-500/15";
  if (status === "supervisor") return "border-violet-400/20 bg-violet-500/15";
  return "border-slate-400/20 bg-slate-500/10";
}

function getStatusPill(status: string) {
  if (status === "disponible") {
    return "border-emerald-400/30 bg-emerald-500/20 text-emerald-100";
  }
  if (status === "ocupado") {
    return "border-red-400/30 bg-red-500/20 text-red-100";
  }
  if (status === "refuerzo") {
    return "border-amber-400/30 bg-amber-500/20 text-amber-100";
  }
  if (status === "supervisor") {
    return "border-violet-400/30 bg-violet-500/20 text-violet-100";
  }
  return "border-slate-400/20 bg-slate-500/10 text-slate-200";
}