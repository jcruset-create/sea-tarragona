export type LinkedJobStatus =
  | "espera"
  | "activo"
  | "parado"
  | "cerrado"
  | "bloqueado";

export type LinkedJobBase = {
  id: number;
  area: any;
  plate: string;
  urgent: boolean;
  status: LinkedJobStatus | string;
  assignedNames: string[];
  reason: string;
  createdAtMs: number;
  startedAtMs: number | null;
  template?: any;
  quickEntryLabel?: string | null;
  quickEntryMode?: "single" | "team" | null;
  linkedGroupId?: string | null;
  dependsOnJobId?: number | null;
  blockedReason?: string | null;
};

type CreateLinkedJobGroupParams = {
  nextJobId: number;
  plate: string;
  urgent?: boolean;
  createdAtMs: number;

  firstArea: any;
  secondArea: any;

  firstLabel: string;
  secondLabel: string;

  firstTemplate?: any;
  secondTemplate?: any;

  firstMode?: "single" | "team";
  secondMode?: "single" | "team";
};

export function createLinkedJobGroup({
  nextJobId,
  plate,
  urgent = false,
  createdAtMs,
  firstArea,
  secondArea,
  firstLabel,
  secondLabel,
  firstTemplate = null,
  secondTemplate = null,
  firstMode = "single",
  secondMode = "single",
}: CreateLinkedJobGroupParams): LinkedJobBase[] {
  const linkedGroupId = `linked-${plate}-${createdAtMs}`;

  const firstJob: LinkedJobBase = {
    id: nextJobId,
    area: firstArea,
    plate,
    urgent,
    status: "espera",
    assignedNames: [],
    reason: `Trabajo vinculado 1/2: ${firstLabel}`,
    createdAtMs,
    startedAtMs: null,
    template: firstTemplate,
    quickEntryLabel: firstLabel,
    quickEntryMode: firstMode,
    linkedGroupId,
    dependsOnJobId: null,
    blockedReason: null,
  };

  const secondJob: LinkedJobBase = {
    id: nextJobId + 1,
    area: secondArea,
    plate,
    urgent,
    status: "bloqueado",
    assignedNames: [],
    reason: `Bloqueado hasta finalizar: ${firstLabel}`,
    createdAtMs,
    startedAtMs: null,
    template: secondTemplate,
    quickEntryLabel: secondLabel,
    quickEntryMode: secondMode,
    linkedGroupId,
    dependsOnJobId: firstJob.id,
    blockedReason: `Pendiente de finalizar: ${firstLabel}`,
  };

  return [firstJob, secondJob];
}

export function unlockDependentJobs<TJob extends LinkedJobBase>(
  finishedJobId: number,
  jobs: TJob[]
): {
  jobs: TJob[];
  unlockedJobs: TJob[];
} {
  const unlockedJobs: TJob[] = [];

  const updatedJobs = jobs.map((job) => {
    if (job.status !== "bloqueado") return job;
    if (job.dependsOnJobId !== finishedJobId) return job;

    const unlockedJob = {
      ...job,
      status: "espera",
      reason: "Trabajo desbloqueado automáticamente. Pendiente de asignación.",
      blockedReason: null,
      dependsOnJobId: null,
    } as TJob;

    unlockedJobs.push(unlockedJob);
    return unlockedJob;
  });

  return {
    jobs: updatedJobs,
    unlockedJobs,
  };
}

export function getBlockedLinkedJobs<TJob extends LinkedJobBase>(
  jobs: TJob[]
): TJob[] {
  return jobs.filter((job) => job.status === "bloqueado");
}