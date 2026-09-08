import Link from "next/link";
import { MiniGame } from "@/data/miniGames";
import {
  miniGameColorMap,
  miniGameFallbackColor,
  miniGameFallbackIcon,
  miniGameIconMap,
} from "@/components/games/miniGameTheme";

interface MiniGameCardProps {
  game: MiniGame;
}

export default function MiniGameCard({ game }: MiniGameCardProps) {
  const colors = miniGameColorMap[game.color] ?? miniGameFallbackColor;
  const IconComponent = miniGameIconMap[game.icon] ?? miniGameFallbackIcon;

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
