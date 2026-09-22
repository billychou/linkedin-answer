import { Layers, Grid3x3, Palette, Hash, Target, Gamepad2 } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export type MiniGameColors = {
  bg: string;
  text: string;
  border: string;
  hover: string;
};

export const miniGameColorMap: Record<string, MiniGameColors> = {
  purple: {
    bg: "from-purple-500/10 to-purple-600/5",
    text: "text-purple-500",
    border: "border-purple-500/20",
    hover: "hover:border-purple-500/40",
  },
  orange: {
    bg: "from-orange-500/10 to-orange-600/5",
    text: "text-orange-500",
    border: "border-orange-500/20",
    hover: "hover:border-orange-500/40",
  },
  teal: {
    bg: "from-teal-500/10 to-teal-600/5",
    text: "text-teal-500",
    border: "border-teal-500/20",
    hover: "hover:border-teal-500/40",
  },
  rose: {
    bg: "from-rose-500/10 to-rose-600/5",
    text: "text-rose-500",
    border: "border-rose-500/20",
    hover: "hover:border-rose-500/40",
  },
  blue: {
    bg: "from-blue-500/10 to-blue-600/5",
    text: "text-blue-500",
    border: "border-blue-500/20",
    hover: "hover:border-blue-500/40",
  },
};

export const miniGameIconMap: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  Layers,
  Grid3x3,
  Palette,
  Hash,
  Target,
};

export const miniGameFallbackColor: MiniGameColors = miniGameColorMap.purple;

export const miniGameFallbackIcon: ComponentType<SVGProps<SVGSVGElement>> = Gamepad2;
