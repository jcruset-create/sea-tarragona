import { useState } from "react";

type AreaKey = "camion" | "movil" | "tacografo" | "turismo" | "mecanica";

type ScheduledJobStatus =
  | "programado"
  | "en_cola"
  | "activo"
  | "cerrado"
  | "cancelado";

type QuickTemplate = {
  key: string;
  label: string;
  area: AreaKey;
  mode: "single" | "team";
  allowedTechs: string[];
  priorityOrder: string[];
};

export type ScheduledJob = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  templateKey: string;
  area: AreaKey;
  plate: string;
  customerName: string;
  customerPhone: string;
  urgent: boolean;
  assignedTech?: string | null;
  status: ScheduledJobStatus;
  arrivedAtMs?: number | null;
  jobId?: number | null;
  googleEventId?: string | null;
};

type Props = {
  scheduledJobs: ScheduledJob[];
  setScheduledJobs: React.Dispatch<React.SetStateAction<ScheduledJob[]>>;
  quickTemplates: QuickTemplate[];
  AREA_META: any;
  onBack: () => void;
  appendLog: (text: string) => void;
  confirmScheduledArrival: (scheduled: ScheduledJob) => void;
  cancelScheduledJob: (id: number) => void;
};

const SLOT_MINUTES = 15;
const SLOT_HEIGHT = 36;

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekDays(weekOffset = 0) {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  const diff = day === 0 ? -6 : 1 - day;

  monday.setDate(today.getDate() + diff + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    return {
      index,
      date: formatLocalDate(date),
      label: date.toLocaleDateString("es-ES", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      }),
    };
  });
}

function getDayStart(dayIndex: number) {
  return dayIndex === 5 ? 9 * 60 : 8 * 60 + 30;
}

function getDayEnd(dayIndex: number) {
  return dayIndex === 5 ? 13 * 60 : 19 * 60;
}

function isWorkingTime(dayIndex: number, time: string) {
  const minutes = timeToMinutes(time);

  if (dayIndex === 5) {
    return minutes >= 9 * 60 && minutes < 13 * 60;
  }

  const morning = minutes >= 8 * 60 + 30 && minutes < 13 * 60;
  const afternoon = minutes >= 15 * 60 && minutes < 19 * 60;

  return morning || afternoon;
}

function getTimeSlotsForDay(dayIndex: number) {
  const start = dayIndex === 5 ? 8 * 60 + 30 : getDayStart(dayIndex);
  const end = 19 * 60;
  const slots: string[] = [];

  for (let t = start; t < end; t += SLOT_MINUTES) {
    slots.push(minutesToTime(t));
  }

  return slots;
}
function addMinutesToTime(time: string, minutes: number) {
  return minutesToTime(timeToMinutes(time) + minutes);
}

function getTodayKey() {
  return formatLocalDate(new Date());
}

function isPastDate(date: string) {
  return date < getTodayKey();
}

function isPastDateTime(date: string, time: string) {
  const today = getTodayKey();

  if (date < today) return true;
  if (date > today) return false;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return timeToMinutes(time) <= nowMinutes;
}

function getValidSlotsForDate(
  date: string,
  dayIndex: number
) {
  return getTimeSlotsForDay(dayIndex).filter(
    (slot) =>
      isWorkingTime(dayIndex, slot) &&
      !isPastDateTime(date, slot)
  );
}

function getFirstAvailableSlotInWeek(
  days: { index: number; date: string; label: string }[]
) {
  const today = getTodayKey();

  for (const day of days) {
    if (day.date < today) continue;

    const validSlots = getValidSlotsForDate(day.date, day.index);

    if (validSlots.length > 0) {
      return {
        date: day.date,
        startTime: validSlots[0],
      };
    }
  }

  return null;
}

function getScheduledDate(job: any): string {
  if (job.date) return job.date;

  if (job.start) {
    return String(job.start).slice(0, 10);
  }

  return "";
}

function getScheduledStartTime(job: any): string {
  if (job.startTime) return job.startTime;

  if (job.start) {
    return String(job.start).slice(11, 16);
  }

  return "08:30";
}

function getScheduledEndTime(job: any): string {
  if (job.endTime) return job.endTime;

  if (job.end) {
    return String(job.end).slice(11, 16);
  }

  return addMinutesToTime(getScheduledStartTime(job), 45);
}

function getSolidAreaClass(area: AreaKey) {
  if (area === "camion") return "bg-red-600 text-white border-red-700";
  if (area === "movil") return "bg-amber-400 text-white border-amber-500";
  if (area === "tacografo") return "bg-violet-500 text-white border-violet-600";
  if (area === "turismo") return "bg-sky-500 text-white border-sky-600";
  return "bg-emerald-500 text-white border-emerald-600";
}

function layoutOverlappingJobs(jobs: ScheduledJob[]) {
  const sorted = [...jobs].sort(
    (a, b) =>
      timeToMinutes(getScheduledStartTime(a)) -
      timeToMinutes(getScheduledStartTime(b))
  );

  const result: {
    job: ScheduledJob;
    column: number;
    columns: number;
  }[] = [];

  let cluster: ScheduledJob[] = [];
  let clusterEnd = -1;

  const flushCluster = () => {
    if (cluster.length === 0) return;

    const columnsEnd: number[] = [];
    const local: { job: ScheduledJob; column: number }[] = [];

    for (const job of cluster) {
      const start = timeToMinutes(getScheduledStartTime(job));
      const end = timeToMinutes(getScheduledEndTime(job));

      let column = columnsEnd.findIndex((colEnd) => colEnd <= start);

      if (column === -1) {
        column = columnsEnd.length;
        columnsEnd.push(end);
      } else {
        columnsEnd[column] = end;
      }

      local.push({ job, column });
    }

    const totalColumns = Math.max(1, columnsEnd.length);

    for (const item of local) {
      result.push({
        job: item.job,
        column: item.column,
        columns: totalColumns,
      });
    }

    cluster = [];
    clusterEnd = -1;
  };

  for (const job of sorted) {
    const start = timeToMinutes(getScheduledStartTime(job));
    const end = timeToMinutes(getScheduledEndTime(job));

    if (cluster.length === 0) {
      cluster.push(job);
      clusterEnd = end;
      continue;
    }

    if (start < clusterEnd) {
      cluster.push(job);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      flushCluster();
      cluster.push(job);
      clusterEnd = end;
    }
  }

  flushCluster();

  return result;
}

export default function AgendaView({
  scheduledJobs,
  setScheduledJobs,
  quickTemplates,
  onBack,
  appendLog,
   cancelScheduledJob,
}: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<{
    date: string;
    startTime: string;
  } | null>(null);

  const [draft, setDraft] = useState({
    templateKey: quickTemplates[0]?.key ?? "",
    plate: "",
    customerName: "",
    customerPhone: "",
    urgent: false,
    estimatedMinutes: 45,
  });

  const days = getWeekDays(weekOffset);
  const todayKey = formatLocalDate(new Date());
  const cancelledJobs: ScheduledJob[] = scheduledJobs.filter(
  (job: ScheduledJob) => job.status === "cancelado"
);
function openNewAppointment(date: string, startTime: string) {
  const day = days.find((item) => item.date === date);

  if (!day) return;

  if (isPastDateTime(date, startTime)) {
    alert("No se pueden crear citas en días u horas ya pasadas.");
    return;
  }

  const firstTemplateKey = quickTemplates[0]?.key ?? "";

  setEditingJobId(null);

  setSelectedSlot({ date, startTime });

  setDraft({
    templateKey: firstTemplateKey,
    plate: "",
    customerName: "",
    customerPhone: "",
    urgent: false,
    estimatedMinutes: 45,
  });

  setModalOpen(true);
}

function openNewAppointmentFromHeader() {
  const currentWeekDays = getWeekDays(0);
  const firstAvailable = getFirstAvailableSlotInWeek(currentWeekDays);

  if (!firstAvailable) {
    alert("No quedan horas disponibles esta semana.");
    return;
  }

  setWeekOffset(0);

  setEditingJobId(null);

  setSelectedSlot({
    date: firstAvailable.date,
    startTime: firstAvailable.startTime,
  });

  setDraft({
    templateKey: quickTemplates[0]?.key ?? "",
    plate: "",
    customerName: "",
    customerPhone: "",
    urgent: false,
    estimatedMinutes: 45,
  });

  setModalOpen(true);
}

  function openEditAppointment(job: ScheduledJob) {
  setEditingJobId(job.id);

  setSelectedSlot({
    date: job.date,
    startTime: job.startTime,
  });

  setDraft({
    templateKey: job.templateKey,
    plate: job.plate,
    customerName: job.customerName,
    customerPhone: job.customerPhone,
    urgent: job.urgent,
    estimatedMinutes: Math.max(
      15,
      timeToMinutes(job.endTime) - timeToMinutes(job.startTime)
    ),
  });

  setModalOpen(true);
}

 function createScheduledJob() {
  if (!selectedSlot || !draft.templateKey || !draft.plate.trim()) return;
if (isPastDateTime(selectedSlot.date, selectedSlot.startTime)) {
  alert("No se puede guardar una cita en una fecha u hora pasada.");
  return;
}

  const template = quickTemplates.find((t) => t.key === draft.templateKey);
  if (!template) return;

  const nextData = {
    date: selectedSlot.date,
    startTime: selectedSlot.startTime,
    endTime: addMinutesToTime(selectedSlot.startTime, draft.estimatedMinutes),
    templateKey: template.key,
    area: template.area,
    plate: draft.plate.trim().toUpperCase(),
    customerName: draft.customerName.trim(),
    customerPhone: draft.customerPhone.trim(),
    urgent: draft.urgent,
  };

  if (editingJobId != null) {
    setScheduledJobs((prev) =>
      prev.map((item) =>
        item.id === editingJobId
          ? {
              ...item,
              ...nextData,
            }
          : item
      )
    );

    appendLog(`Cita editada: ${nextData.plate} · ${template.label}.`);
  } else {
    const scheduled: ScheduledJob = {
      id: Date.now(),
      ...nextData,
      status: "programado",
      assignedTech: null,
    };

    setScheduledJobs((prev) => [...prev, scheduled]);
    appendLog(`Cita programada: ${scheduled.plate} · ${template.label}.`);
  }

  setDraft({
    templateKey: quickTemplates[0]?.key ?? "",
    plate: "",
    customerName: "",
    customerPhone: "",
    urgent: false,
    estimatedMinutes: 45,
  });

  setEditingJobId(null);
  setModalOpen(false);
  setSelectedSlot(null);
}

  return (
    <div className="min-h-screen bg-slate-50 p-3 text-slate-900">
  <div className="w-full space-y-4">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Agenda semanal</h1>
            <p className="text-sm text-slate-500">
              Vista tipo Calendar · lunes a sábado
            </p>
          </div>

          <div className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
  Citas cargadas: {scheduledJobs.length} · Semana: {days[0]?.date} a{" "}
  {days[5]?.date}
</div>

          <div className="flex flex-wrap gap-2">
          <button
  type="button"
  onClick={openNewAppointmentFromHeader}
  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
>
  + Nueva cita
</button>

            <button
              type="button"
              onClick={() => setWeekOffset((v) => v - 1)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium"
            >
              ← Semana anterior
            </button>

            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium"
            >
              Hoy
            </button>

           <button
  type="button"
  onClick={() => setWeekOffset((v) => v + 1)}
  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium"
>
  Semana siguiente →
</button>

            <button
              type="button"
              onClick={onBack}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium"
            >
              Volver a operativo
            </button>
          </div>
        </div>

<div className="w-full overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid min-w-[1250px] grid-cols-[80px_repeat(6,1fr)] border-b border-slate-200">
            <div className="p-3 text-xs font-medium text-slate-500">Hora</div>

            {days.map((day) => (
              <div
                key={day.date}
                className="border-l border-slate-200 p-3 text-sm font-semibold capitalize"
              >
                {day.label}
              </div>
            ))}
          </div>

          <div className="grid min-w-[1250px] grid-cols-[80px_repeat(6,1fr)]">
            <div>
              {getTimeSlotsForDay(0).map((slot) => (
                <div
                  key={slot}
                  style={{ height: SLOT_HEIGHT }}
                  className="border-b border-slate-100 p-2 text-xs text-slate-400"
                >
                  {slot}
                </div>
              ))}
            </div>

            {days.map((day) => {
              const slots = getTimeSlotsForDay(day.index);
              const dayStart = getDayStart(day.index);
              const dayHeight = slots.length * SLOT_HEIGHT;

const dayJobs = scheduledJobs
  .filter((job) => job.status !== "cancelado")
  .filter((job) => {
    const jobDate = getScheduledDate(job);
    return jobDate === day.date;
  })
  .map((job) => ({
    ...job,
    startTime: getScheduledStartTime(job),
    endTime: getScheduledEndTime(job),
  }));

              const laidOutJobs = layoutOverlappingJobs(dayJobs);

              const now = new Date();
              const nowMinutes = now.getHours() * 60 + now.getMinutes();
              const showNowLine =
                day.date === todayKey &&
                nowMinutes >= getDayStart(day.index) &&
                nowMinutes <= getDayEnd(day.index);

              return (
                <div
                  key={day.date}
                  className="relative border-l border-slate-200"
                  style={{ height: dayHeight }}
                >
{slots.map((slot) => {
  const working = isWorkingTime(day.index, slot);
  const past = isPastDateTime(day.date, slot);
  const disabled = !working || past;

  let cellClass = "bg-slate-200/70";

  if (working && !past) {
    cellClass = "cursor-pointer bg-emerald-50 hover:bg-emerald-100";
  }

  if (working && past) {
    cellClass = "bg-red-50";
  }

  return (
    <div
      key={`${day.date}-${slot}`}
      style={{ height: SLOT_HEIGHT }}
      onClick={() => {
        if (disabled) return;
        openNewAppointment(day.date, slot);
      }}
      className={`border-b border-slate-100 ${cellClass}`}
    />
  );
})}

                  {showNowLine && (
                    <div
                      className="absolute left-0 right-0 z-30 h-[2px] bg-red-500"
                      style={{
                        top:
                          ((nowMinutes - dayStart) / SLOT_MINUTES) *
                          SLOT_HEIGHT,
                      }}
                    >
                      <div className="absolute -left-2 -top-[5px] h-3 w-3 rounded-full bg-red-500" />
                    </div>
                  )}

                 {laidOutJobs.map(({ job, column, columns }) => {
  const template = quickTemplates.find(
    (t) => t.key === job.templateKey
  );

  const jobStartTime = getScheduledStartTime(job);
  const jobEndTime = getScheduledEndTime(job);

  const start = timeToMinutes(jobStartTime);
  const end = timeToMinutes(jobEndTime);

  const safeStart = Math.max(start, dayStart);
  const safeEnd = Math.min(end, getDayEnd(day.index));

  const top =
    ((safeStart - dayStart) / SLOT_MINUTES) * SLOT_HEIGHT;

  const height = Math.max(
    50,
    ((safeEnd - safeStart) / SLOT_MINUTES) * SLOT_HEIGHT - 6
  );

  const width = 100 / columns;
  const left = column * width;

  return (
    <div
      key={job.id}
      onClick={(e) => {
        e.stopPropagation();
        openEditAppointment(job);
      }}
      className={`absolute z-40 cursor-pointer overflow-hidden rounded-xl border-2 p-2 text-sm font-semibold shadow-md ${getSolidAreaClass(
        job.area
      )}`}
      style={{
        top,
        height,
        left: `calc(${left}% + 4px)`,
        width: `calc(${width}% - 8px)`,
      }}
    >
      <div className="truncate uppercase">
        {template?.label ?? "Operación"}
      </div>

      <div className="truncate">
        {job.plate}
      </div>

      <div className="text-xs font-normal">
        {jobStartTime} – {jobEndTime}
      </div>

      {job.customerName && (
        <div className="truncate text-xs font-normal opacity-90">
          {job.customerName}
        </div>
      )}

    {job.status === "programado" && (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      cancelScheduledJob(job.id);
    }}
    className="absolute bottom-1 left-1 right-1 rounded-md bg-white/95 px-1 py-0.5 text-[9px] font-semibold text-red-600 shadow-sm"
  >
    Cancelar
  </button>
)}
    </div>
  );
})}
                </div>
              );
            })}
          </div>
        </div>

{cancelledJobs.length > 0 && (
  <div className="rounded-3xl border border-red-200 bg-red-50 p-4 shadow-sm">
    <div className="mb-3 text-sm font-semibold text-red-800">
      Historial de citas canceladas
    </div>

    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {cancelledJobs
        .slice()
        .sort((a: ScheduledJob, b: ScheduledJob) => {
          const dateA = `${a.date} ${a.startTime}`;
          const dateB = `${b.date} ${b.startTime}`;
          return dateB.localeCompare(dateA);
        })
        .map((job: ScheduledJob) => {
          const template = quickTemplates.find(
            (item) => item.key === job.templateKey
          );

          return (
            <div
              key={`cancelled-${job.id}`}
              className="rounded-2xl border border-red-200 bg-white p-3 text-sm"
            >
              <div className="font-semibold text-red-800">
                {job.plate} · {job.date} · {job.startTime}
              </div>

              <div className="mt-1 text-xs text-slate-600">
                {template?.label ?? "Operación"}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {job.customerName || "Cliente sin nombre"}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {job.customerPhone || "Sin teléfono"}
              </div>
            </div>
          );
        })}
    </div>
  </div>
)}

        {modalOpen && selectedSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-4">
<h3 className="text-xl font-semibold">
  {editingJobId != null ? "Editar cita" : "Nueva cita"}
</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Día
                    </label>

                    <select
                      value={selectedSlot.date}
                      onChange={(e) => {
  const nextDate = e.target.value;
  const day = days.find((d) => d.date === nextDate);

  if (!day) return;

  const validSlots = getValidSlotsForDate(nextDate, day.index);

  if (validSlots.length === 0) {
    alert("Este día no tiene horas disponibles.");
    return;
  }

  setSelectedSlot({
    date: nextDate,
    startTime: validSlots[0],
  });
}}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      {days.map((day) => (
  <option
    key={day.date}
    value={day.date}
    disabled={isPastDate(day.date)}
  >
    {day.label}
  </option>
))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      Hora
                    </label>

                    <select
                      value={selectedSlot.startTime}
                      onChange={(e) =>
                        setSelectedSlot((prev) =>
                          prev ? { ...prev, startTime: e.target.value } : prev
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
{(() => {
  const selectedDay = days.find((d) => d.date === selectedSlot.date);
  const slots = selectedDay
    ? getValidSlotsForDate(selectedSlot.date, selectedDay.index)
    : [];

  return slots.map((slot) => (
    <option key={slot} value={slot}>
      {slot}
    </option>
  ));
})()}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <select
  value={draft.templateKey || quickTemplates[0]?.key || ""}
  onChange={(e) =>
    setDraft((prev) => ({
      ...prev,
      templateKey: e.target.value,
    }))
  }
  className="w-full rounded-2xl border border-slate-200 px-3 py-3"
>
  {quickTemplates.length === 0 ? (
    <option value="">No hay entradas rápidas</option>
  ) : (
    quickTemplates.map((template) => (
      <option key={template.key} value={template.key}>
        {template.label}
      </option>
    ))
  )}
</select>

                <input
                  value={draft.plate}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, plate: e.target.value }))
                  }
                  placeholder="Matrícula"
                  className="w-full rounded-2xl border border-slate-200 px-3 py-3 uppercase"
                />

                <input
                  value={draft.customerName}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      customerName: e.target.value,
                    }))
                  }
                  placeholder="Nombre cliente"
                  className="w-full rounded-2xl border border-slate-200 px-3 py-3"
                />

                <input
                  value={draft.customerPhone}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      customerPhone: e.target.value,
                    }))
                  }
                  placeholder="Teléfono móvil"
                  className="w-full rounded-2xl border border-slate-200 px-3 py-3"
                />

                <input
                  type="number"
                  min={15}
                  step={15}
                  value={draft.estimatedMinutes}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      estimatedMinutes: Number(e.target.value) || 45,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-3 py-3"
                  placeholder="Duración prevista en minutos"
                />

                <div className="rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-500">
                  Fin previsto:{" "}
                  <span className="font-medium text-slate-900">
                    {addMinutesToTime(
                      selectedSlot.startTime,
                      draft.estimatedMinutes
                    )}
                  </span>
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={draft.urgent}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        urgent: e.target.checked,
                      }))
                    }
                  />
                  <span className="text-sm font-medium">Urgente</span>
                </label>
              </div>

              <div className="mt-6 flex gap-3">
              <button
  onClick={() => {
    setModalOpen(false);
    setEditingJobId(null);
    setSelectedSlot(null);
    setDraft({
      templateKey: quickTemplates[0]?.key ?? "",
      plate: "",
      customerName: "",
      customerPhone: "",
      urgent: false,
      estimatedMinutes: 45,
    });
  }}
  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium"
>
  Cancelar
</button>

<button
  onClick={createScheduledJob}
  disabled={
    !draft.plate.trim() ||
    quickTemplates.length === 0 ||
    !selectedSlot ||
    isPastDateTime(selectedSlot.date, selectedSlot.startTime)
  }
  className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
>
  {editingJobId != null ? "Guardar cambios" : "Guardar cita"}
</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}