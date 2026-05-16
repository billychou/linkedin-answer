export type MiniGameId = "memory-match" | "2048" | "simon-says";

export type MiniGame = {
  id: MiniGameId;
  name: string;
  description: string;
  icon: string;
  color: string;
};

export const miniGames: MiniGame[] = [
  {
    id: "memory-match",
    name: "Memory Match",
    description: "Flip cards to find matching pairs. Test your memory!",
    icon: "Layers",
    color: "purple",
  },
  {
    id: "2048",
    name: "2048",
    description: "Slide tiles to merge numbers. Reach 2048 to win!",
    icon: "Grid3x3",
    color: "orange",
  },
  {
    id: "simon-says",
    name: "Simon Says",
    description: "Watch the sequence, then repeat it. How far can you go?",
    icon: "Palette",
    color: "teal",
  },
];
