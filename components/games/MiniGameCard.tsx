import Link from "next/link";
import { MiniGame } from "@/data/miniGames";
import { Layers, Grid3x3, Palette, Gamepad2 } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

interface MiniGameCardProps {
  game: MiniGame;
}

const colorMap: Record<string, { bg: string; text: string; border: string; hover: string }> = {
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
};

const iconMap: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  Layers,
  Grid3x3,
  Palette,
};

export default function MiniGameCard({ game }: MiniGameCardProps) {
  const colors = colorMap[game.color] || colorMap.purple;
  const IconComponent = iconMap[game.icon] || Gamepad2;

  return (
    <Link
      href={`/games/play/${game.id}`}
      className={`block rounded-xl border ${colors.border} ${colors.hover} bg-gradient-to-br p-6 transition-all hover:shadow-lg`}
    >
      <div className="flex items-start gap-4">
        <div className={`rounded-lg bg-gradient-to-br ${colors.bg} p-3`}>
          <IconComponent className={`h-6 w-6 ${colors.text}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{game.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{game.description}</p>
          <span className={`inline-block mt-3 text-sm font-medium ${colors.text}`}>Play &rarr;</span>
        </div>
      </div>
    </Link>
  );
}
