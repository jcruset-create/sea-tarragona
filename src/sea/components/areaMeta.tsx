import React from "react";
import { Car, Gauge, Truck, Wrench } from "lucide-react";
import type { AreaKey } from "../types/sea.types";

export const BASE_AREA_ORDER: Record<AreaKey, string[]> = {
  camion: [
    "José",
    "Iván",
    "Alejandro",
    "Jesús",
    "Anthoni",
    "David",
    "Andrés",
    "Albert",
  ],
  movil: ["Anthoni", "David", "Jesús", "Iván", "Alejandro"],
  tacografo: ["José", "Andrés"],
  turismo: ["Andrés", "Anthoni", "Alejandro", "José", "Iván", "David", "Jesús"],
  mecanica: [
    "Andrés",
    "Alejandro",
    "Anthoni",
    "José",
    "Iván",
    "David",
    "Jesús",
    "Albert",
  ],
};

export const AREA_META: Record<
  AreaKey,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    priority: number;
    order: string[];
  }
> = {
  camion: {
    label: "Camión",
    icon: Truck,
    color: "bg-red-50 text-red-700 border-red-200",
    priority: 1,
    order: [...BASE_AREA_ORDER.camion, "Ramón"],
  },
  movil: {
    label: "Móvil",
    icon: Wrench,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    priority: 2,
    order: [...BASE_AREA_ORDER.movil, "Ramón"],
  },
  tacografo: {
    label: "Tacógrafo",
    icon: Gauge,
    color: "bg-orange-50 text-orange-700 border-orange-200",
    priority: 0,
    order: [...BASE_AREA_ORDER.tacografo, "Ramón"],
  },
  turismo: {
    label: "Turismo",
    icon: Car,
    color: "bg-sky-50 text-sky-700 border-sky-200",
    priority: 3,
    order: [...BASE_AREA_ORDER.turismo, "Ramón"],
  },
  mecanica: {
    label: "Mecánica",
    icon: Wrench,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    priority: 4,
    order: [...BASE_AREA_ORDER.mecanica, "Ramón"],
  },
};