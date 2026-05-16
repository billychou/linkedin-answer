export type MiniGameId = "memory-match" | "2048" | "simon-says" | "tic-tac-toe";

export type MiniGame = {
  id: MiniGameId;
  name: string;
  description: string;
  icon: string;
  color: string;
  howToPlay: string[];
  tips?: string[];
};

export const miniGames: MiniGame[] = [
  {
    id: "memory-match",
    name: "Memory Match",
    description:
      "A classic card-matching game. Flip cards to find all matching pairs and test your memory!",
    icon: "Layers",
    color: "purple",
    howToPlay: [
      "A grid of face-down cards is laid out. Each card hides an emoji, and every emoji has exactly one matching pair.",
      "Tap (or click) any card to flip it over and reveal the emoji underneath.",
      "Then flip a second card. If the two emojis match, both cards stay face-up and are locked in.",
      "If they don't match, both cards flip back over after a short delay.",
      "Keep flipping pairs until all 6 matching pairs are found.",
      "Your goal is to complete the board in as few moves as possible — fewer moves means a better score!",
    ],
    tips: [
      "Try to remember the position of cards you've already seen — even mismatched ones.",
      "Start from the corners and work your way inward to build a mental map.",
    ],
  },
  {
    id: "2048",
    name: "2048",
    description:
      "The addictive number-sliding puzzle. Merge matching tiles by swiping or using arrow keys to reach 2048!",
    icon: "Grid3x3",
    color: "orange",
    howToPlay: [
      "The game is played on a 4×4 grid. Two tiles start on the board, each showing either 2 or 4.",
      "Swipe in any direction (or press an arrow key) to slide all tiles as far as possible in that direction.",
      "When two tiles with the same number collide, they merge into a single tile showing their sum (e.g., 2 + 2 = 4).",
      "After each move, a new tile (2 or 4) appears on a random empty spot.",
      "Keep merging tiles to build larger and larger numbers.",
      "Reach the 2048 tile to win! You can keep playing after that to push for an even higher score.",
      "The game ends when no more moves are possible (the grid is full and no adjacent tiles can merge).",
    ],
    tips: [
      "Keep your highest-value tile in one corner and build around it.",
      "Avoid swiping in the opposite direction of your corner strategy — it can break your build.",
      "Plan 2–3 moves ahead to avoid filling up the grid.",
    ],
  },
  {
    id: "simon-says",
    name: "Simon Says",
    description:
      "A classic memory game. Watch the growing color sequence and repeat it from memory. How far can you go?",
    icon: "Palette",
    color: "teal",
    howToPlay: [
      "Press 'Start Game' to begin. The game has four colored buttons: red, green, blue, and yellow.",
      "The game will flash one colored button to start the sequence. Watch carefully!",
      "After the sequence finishes, it's your turn. Tap the colored buttons to repeat the sequence in the exact same order.",
      "If you get it right, the game adds one more color to the sequence and plays it back for you.",
      "Each round the sequence grows longer by one step.",
      "Make a mistake and the game ends — your final level tells you how far you got.",
      "Try to beat your own record and reach the highest level!",
    ],
    tips: [
      "Watch for patterns or groupings in the sequence rather than memorizing each step individually.",
      "Repeat the sequence in your head as it plays — verbal rehearsal helps.",
      "Stay calm and focused as the sequence gets longer.",
    ],
  },
  {
    id: "tic-tac-toe",
    name: "Tic-Tac-Toe",
    description:
      "The classic paper-and-pencil game. Take turns placing X and O — get three in a row to win!",
    icon: "Hash",
    color: "rose",
    howToPlay: [
      "The game is played on a 3×3 grid.",
      "You play as X and go first. Click any empty cell to place your mark.",
      "The computer plays as O and responds automatically after your move.",
      "Take turns placing marks until one player gets three in a row — horizontally, vertically, or diagonally.",
      "If all 9 cells are filled with no three-in-a-row, the game is a draw.",
    ],
    tips: [
      "Start in the center or a corner for the best chance to win.",
      "Watch for forks — situations where the opponent can create two winning lines at once.",
      "Block your opponent's two-in-a-row before building your own.",
    ],
  },
];
