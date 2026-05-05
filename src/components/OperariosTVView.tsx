type AreaKey = "camion" | "movil" | "tacografo" | "turismo" | "mecanica";
type TemplateKey = "alineacion_camion" | "pinchazo_camion";

type JobForOperarios = {
  id: number;
  plate: string;
  status: string;
  area: AreaKey;
  assignedNames?: string[];
  template?: TemplateKey | null;
  quickEntryLabel?: string | null;
};

type TechForOperarios = {
  name: string;
  status: string;
  currentJobId?: number | null;
  avatar?: string | null;
};

type Props = {
  jobs: JobForOperarios[];
  techs: TechForOperarios[];
  finishJob: (jobId: number) => void;
  moveJobToStandBy: (jobId: number) => void;
  getOperationLabel: (job: any) => string;
  onBack: () => void;
};

function normalizeTechStatus(status?: string) {
  return (status || "").toLowerCase().trim();
}

function isSupportStatus(status?: string) {
  return normalizeTechStatus(status) === "refuerzo";
}

function isAvailableStatus(status?: string) {
  const normalized = normalizeTechStatus(status);

  return normalized === "disponible" || normalized === "supervisor";
}

function isBusyStatus(status?: string) {
  return normalizeTechStatus(status) === "ocupado";
}

function isUnavailableStatus(status?: string) {
  const normalized = normalizeTechStatus(status);

  return (
    normalized === "nodisponible" ||
    normalized === "no_disponible" ||
    normalized === "vacaciones" ||
    normalized === "baja" ||
    normalized === "permiso" ||
    normalized === "otro_taller" ||
    normalized === "en_otro_taller"
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getTechStatusLabel(status: string) {
  const normalized = normalizeTechStatus(status);

  if (normalized === "otro_taller") return "en otro taller";
  if (normalized === "en_otro_taller") return "en otro taller";
  if (normalized === "nodisponible") return "no disponible";
  if (normalized === "no_disponible") return "no disponible";
  if (normalized === "disponible") return "disponible";
  if (normalized === "ocupado") return "ocupado";
  if (normalized === "vacaciones") return "vacaciones";
  if (normalized === "baja") return "baja";
  if (normalized === "permiso") return "permiso";
  if (normalized === "supervisor") return "supervisor";
  if (normalized === "refuerzo") return "refuerzo";

  return status || "-";
}

function getTechCardClass(status: string) {
  if (isSupportStatus(status)) {
    return "border-amber-400 bg-amber-200 text-amber-950";
  }

  if (isAvailableStatus(status)) {
    return "border-green-400 bg-green-200 text-green-950";
  }

  if (isBusyStatus(status)) {
    return "border-red-400 bg-red-200 text-red-950";
  }

  if (isUnavailableStatus(status)) {
    return "border-slate-400 bg-slate-200 text-slate-950";
  }

  return "border-slate-400 bg-slate-200 text-slate-950";
}

function getTechNameClass(status: string) {
  if (isSupportStatus(status)) {
    return "text-amber-950";
  }

  if (isAvailableStatus(status)) {
    return "text-green-950";
  }

  if (isBusyStatus(status)) {
    return "text-red-950";
  }

  return "text-slate-950";
}

function getTechSubtextClass(status: string) {
  if (isSupportStatus(status)) {
    return "text-amber-900";
  }

  if (isAvailableStatus(status)) {
    return "text-green-900";
  }

  if (isBusyStatus(status)) {
    return "text-red-900";
  }

  return "text-slate-700";
}

function getTechBadgeClass(status: string) {
  if (isSupportStatus(status)) {
    return "border-amber-600 bg-amber-50 text-amber-900";
  }

  if (isAvailableStatus(status)) {
    return "border-green-600 bg-green-50 text-green-900";
  }

  if (isBusyStatus(status)) {
    return "border-red-600 bg-red-50 text-red-900";
  }

  return "border-slate-600 bg-white text-slate-800";
}

function getAreaClass(area: AreaKey) {
  if (area === "camion") return "bg-red-100 text-red-700";
  if (area === "movil") return "bg-amber-100 text-amber-700";
  if (area === "tacografo") return "bg-orange-100 text-orange-700";
  if (area === "turismo") return "bg-sky-100 text-sky-700";
  if (area === "mecanica") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}

function getJobCardClass(job: JobForOperarios) {
  if (job.status === "activo") {
    return "border-slate-200 bg-slate-50";
  }

  if (
    job.status === "parado" ||
    job.status === "standby" ||
    job.status === "stand_by"
  ) {
    return "border-amber-200 bg-amber-50";
  }

  if (job.status === "espera" || job.status === "en_cola") {
    return "border-sky-200 bg-sky-50";
  }

  return "border-slate-200 bg-slate-50";
}

function SmallJobCard({
  job,
  getOperationLabel,
}: {
  job: JobForOperarios;
  getOperationLabel: (job: any) => string;
}) {
  return (
    <div className={`rounded-2xl border p-3 ${getJobCardClass(job)}`}>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${getAreaClass(
            job.area
          )}`}
        >
          {job.area}
        </span>

        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
          #{job.id}
        </span>
      </div>

      <div className="text-xl font-black text-slate-900">{job.plate}</div>

      <div className="mt-1 truncate text-sm font-semibold text-slate-700">
        {getOperationLabel(job)}
      </div>

      {(job.assignedNames || []).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {(job.assignedNames || []).map((name) => (
            <span
              key={name}
              className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700"
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OperariosTVView({
  jobs,
  techs,
  finishJob,
  moveJobToStandBy,
  getOperationLabel,
  onBack,
}: Props) {
  const activeJobs = jobs.filter((job) => job.status === "activo");

  const standByJobs = jobs.filter(
    (job) =>
      job.status === "parado" ||
      job.status === "standby" ||
      job.status === "stand_by"
  );

  const waitingJobs = jobs.filter(
    (job) => job.status === "espera" || job.status === "en_cola"
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900">
      <div className="mb-4 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pantalla técnicos</h1>
          <p className="text-sm text-slate-500">
            Vista simple para TV / técnicos
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium"
        >
          Volver a operativo
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_0.85fr_0.7fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Trabajos asignados</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
              {activeJobs.length}
            </span>
          </div>

          {activeJobs.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              No hay trabajos activos.
            </div>
          ) : (
            <div className="grid gap-3 2xl:grid-cols-2">
              {activeJobs.map((job) => {
                const assignedTechs = (job.assignedNames || []).map((name) => {
                  const tech = techs.find((item) => item.name === name);

                  return {
                    name,
                    avatar: tech?.avatar ?? null,
                  };
                });

                return (
                  <div
                    key={job.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${getAreaClass(
                              job.area
                            )}`}
                          >
                            {job.area}
                          </span>

                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                            #{job.id}
                          </span>
                        </div>

                        <div className="mb-2 flex flex-wrap gap-2">
                          {assignedTechs.length > 0 ? (
                            assignedTechs.map((tech) => (
                              <div
                                key={tech.name}
                                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                              >
                                {tech.avatar ? (
                                  <img
                                    src={tech.avatar}
                                    alt={tech.name}
                                    className="h-10 w-10 shrink-0 rounded-full border-2 border-white object-cover shadow-sm"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-sm font-bold text-slate-800 shadow-sm">
                                    {getInitials(tech.name)}
                                  </div>
                                )}

                                <div className="text-base font-black text-slate-950">
                                  {tech.name}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-400">
                              Sin técnicos
                            </div>
                          )}
                        </div>

                        <div className="flex min-w-0 items-baseline gap-3">
                          <div className="shrink-0 text-3xl font-black tracking-wide text-slate-950">
                            {job.plate}
                          </div>

                          <div className="truncate text-lg font-bold text-slate-700">
                            {getOperationLabel(job)}
                          </div>
                        </div>
                      </div>

                      <div className="flex w-[145px] shrink-0 flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => finishJob(job.id)}
                          className="rounded-xl bg-slate-900 px-3 py-3 text-base font-bold text-white"
                        >
                          Finalizar
                        </button>

                        <button
                          type="button"
                          onClick={() => moveJobToStandBy(job.id)}
                          className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-base font-bold text-amber-700"
                        >
                          Stand by
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="space-y-4">
          <section className="rounded-3xl border border-amber-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold text-amber-900">
                Trabajos en Stand by
              </h2>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                {standByJobs.length}
              </span>
            </div>

            {standByJobs.length === 0 ? (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-center text-sm text-amber-700">
                Sin trabajos en stand by.
              </div>
            ) : (
              <div className="space-y-2">
                {standByJobs.map((job) => (
                  <SmallJobCard
                    key={job.id}
                    job={job}
                    getOperationLabel={getOperationLabel}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-sky-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold text-sky-900">
                Cola de trabajo
              </h2>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700">
                {waitingJobs.length}
              </span>
            </div>

            {waitingJobs.length === 0 ? (
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-center text-sm text-sky-700">
                Sin trabajos en cola.
              </div>
            ) : (
              <div className="space-y-2">
                {waitingJobs.map((job) => (
                  <SmallJobCard
                    key={job.id}
                    job={job}
                    getOperationLabel={getOperationLabel}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">Estado técnicos</h2>
            <span className="text-xs text-slate-500">No editable</span>
          </div>

          <div className="space-y-2">
            {techs.map((tech) => {
              const techStatus = normalizeTechStatus(tech.status);

              const canShowAssignedJob =
                techStatus === "ocupado" ||
                techStatus === "refuerzo" ||
                techStatus === "supervisor";

              const currentJob = canShowAssignedJob
                ? tech.currentJobId != null
                  ? jobs.find((job) => job.id === tech.currentJobId)
                  : jobs.find(
                      (job) =>
                        job.status === "activo" &&
                        Array.isArray(job.assignedNames) &&
                        job.assignedNames.includes(tech.name)
                    )
                : null;

              return (
                <div
                  key={tech.name}
                  className={`rounded-2xl border p-3 shadow-sm ${getTechCardClass(
                    tech.status
                  )}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      {tech.avatar ? (
                        <img
                          src={tech.avatar}
                          alt={tech.name}
                          className="h-11 w-11 shrink-0 rounded-full border-2 border-white object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white bg-white/70 text-base font-bold shadow-sm">
                          {getInitials(tech.name)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div
                          className={`truncate text-xl font-black ${getTechNameClass(
                            tech.status
                          )}`}
                        >
                          {tech.name}
                        </div>

                        <div
                          className={`mt-0.5 truncate text-xs font-semibold ${getTechSubtextClass(
                            tech.status
                          )}`}
                        >
                          {currentJob
                            ? `${currentJob.plate} · ${getOperationLabel(
                                currentJob
                              )}`
                            : "Sin trabajo asignado"}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${getTechBadgeClass(
                        tech.status
                      )}`}
                    >
                      {getTechStatusLabel(tech.status)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}