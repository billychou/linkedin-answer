import { GameSlug } from "@/types/game";

export interface HowToPlaySection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
  /** true = 有序步骤（Step-by-step），false/缺省 = 无序要点（Tips） */
  ordered?: boolean;
  faq?: { question: string; answer: string }[];
}

/**
 * 每个游戏的 How to Play 内容。
 * 用于 /games/<slug>/how-to-play 页面，提供真实可读的规则、步骤与技巧，
 * 避免页面内容过薄（SEO thin content）。
 */
export const howToPlayContent: Record<GameSlug, HowToPlaySection[]> = {
  pinpoint: [
    {
      heading: "How Pinpoint works",
      paragraphs: [
        "Pinpoint shows you five clue tiles. Your goal is to guess the single category or theme that connects all five clues. The first clue is usually broad and ambiguous; the clues get more specific as you reveal them, so the connection becomes easier to spot the more clues you see.",
        "The earlier you identify the connection, the better your result — solving Pinpoint using only one or two clues is the ultimate goal.",
      ],
    },
    {
      heading: "Step-by-step",

      ordered: true,      list: [
        "Read all five clue tiles before making your first guess.",
        "Ask yourself what single everyday category, phrase, or theme could link every clue.",
        "Look for wordplay, synonyms, brand names, people, or common expressions hiding in the clues.",
        "Reveal an extra clue when you are stuck — each one rules out wrong theories.",
        "Submit your guess once you are confident the category fits all five clues.",
      ],
    },
    {
      heading: "Tips & strategies",
      list: [
        "Do not lock onto the first clue — the answer usually only makes sense once several clues are combined.",
        "Try reading the clues out loud; the connection is often a spoken phrase.",
        "Think about categories like food, famous people, apps, animals, holidays, or everyday objects.",
        "Check the archive pages for past answers to see the kinds of categories Pinpoint tends to use.",
      ],
    },
    {
      heading: "Pinpoint FAQ",
      faq: [
        {
          question: "Is Pinpoint free to play?",
          answer:
            "Yes. Pinpoint is one of LinkedIn's free daily games, available inside LinkedIn Games.",
        },
        {
          question: "When does the daily Pinpoint puzzle reset?",
          answer:
            "LinkedIn publishes a new Pinpoint puzzle every day. You can find each day's answer here, with hints and a full walkthrough.",
        },
        {
          question: "Where can I find older Pinpoint answers?",
          answer:
            "Browse the Pinpoint archives for every past answer, organized by date.",
        },
      ],
    },
  ],
  patches: [
    {
      heading: "How Patches works",
      paragraphs: [
        "Patches is a picture puzzle, similar to a jigsaw. A blank grid board shows the outline of a hidden image, and the pieces — patches — are scattered around the board. Your job is to drag every patch onto the board where it belongs.",
        "Each patch looks like a small square of the final picture. When you place a patch in the correct slot, the picture starts to come together. Patches fit by matching edges and colors, and the full image only appears once every piece is placed.",
      ],
    },
    {
      heading: "Step-by-step",

      ordered: true,      list: [
        "Survey the blank board and note the visible color or pattern hints.",
        "Pick up a patch and compare it with the surrounding board colors.",
        "Drag the patch onto the board slot where its edges and colors line up.",
        "Move to the next patch, working from the brightest or most distinctive areas first.",
        "Keep placing patches until the hidden image is fully revealed.",
      ],
    },
    {
      heading: "Tips & strategies",
      list: [
        "Start with the corners and edges of the board — they are usually the easiest to match.",
        "Look for patches with unusual colors; they often belong to a unique part of the image.",
        "Use the board's background tints as a guide: each slot echoes the color of its patch.",
        "Work in small groups of patches from the same area rather than scanning the whole board.",
      ],
    },
    {
      heading: "Patches FAQ",
      faq: [
        {
          question: "Do patches need to be rotated to fit?",
          answer:
            "Patches slide into place by matching edges and colors on the board. If a piece does not fit, compare it against other slots before moving on.",
        },
        {
          question: "Is there a time limit?",
          answer:
            "Patches is a relaxed daily puzzle — take your time reasoning out where each piece belongs.",
        },
        {
          question: "Where can I see past Patches solutions?",
          answer:
            "The Patches archives contain every daily solution, including the fully completed image.",
        },
      ],
    },
  ],
  zip: [
    {
      heading: "How Zip works",
      paragraphs: [
        "Zip is a path-drawing puzzle. The grid contains numbered cells, and your goal is to draw one continuous path that visits every cell in the grid. The path must pass through the numbered cells in ascending order: 1, 2, 3, 4, and so on.",
        "The path cannot cross itself and must fill the entire grid — no empty cells are allowed. When the path connects every number and covers every square, the puzzle is solved.",
      ],
    },
    {
      heading: "Step-by-step",

      ordered: true,      list: [
        "Start at cell 1 and work your way to the next number, 2.",
        "Draw the route so it leaves room for the numbers that follow — do not box yourself in.",
        "From 2, continue to 3, and repeat until you reach the final number.",
        "Make sure every cell is covered by the final path, with no crossings.",
        "If you get stuck, backtrack and try a different route between the last two numbers.",
      ],
    },
    {
      heading: "Tips & strategies",
      list: [
        "Plan ahead: the path between 1 and 2 must leave an open route for all the later numbers.",
        "Watch for dead ends. A cell with only one neighbor usually forces the path through it.",
        "Avoid creating isolated empty regions that the path could never reach.",
        "Work backwards from the highest number too — both ends of the path are constrained.",
      ],
    },
    {
      heading: "Zip FAQ",
      faq: [
        {
          question: "Can the Zip path cross itself?",
          answer:
            "No. The path must be a single continuous line that never crosses or overlaps itself.",
        },
        {
          question: "Does every cell have to be used?",
          answer:
            "Yes. Every cell on the grid must be part of the path for the puzzle to be complete.",
        },
        {
          question: "Where can I find today's Zip solution?",
          answer:
            "Visit the Zip answer page for today's solution, plus hints for solving it yourself.",
        },
      ],
    },
  ],
  tango: [
    {
      heading: "How Tango works",
      paragraphs: [
        "Tango is a logic puzzle played on a 6x6 grid. You fill the grid with suns and moons so that every row and every column contains exactly three suns and three moons.",
        "The second rule is that no more than two identical symbols may sit next to each other, horizontally or vertically. Some cells start pre-filled; your job is to logically deduce the rest.",
      ],
    },
    {
      heading: "Step-by-step",

      ordered: true,      list: [
        "Start from the pre-filled suns and moons already shown in the grid.",
        "Apply the adjacency rule: if two suns are side by side, the cells on either side of the pair must be moons.",
        "Track each row and column. Once a row has three suns, the remaining empty cells in that row must all be moons.",
        "Repeat for both directions, horizontal and vertical, until the board is full.",
        "Use the in-game hint button when a board has you stuck.",
      ],
    },
    {
      heading: "Tips & strategies",
      list: [
        "Whenever you see a pair of matching symbols, immediately mark the cells outside the pair with the opposite symbol.",
        "Count in every row and column: reaching three of one symbol forces the rest of the line to be the other.",
        "Re-check both orientations — a rule applied to a row also applies to its column.",
        "Tango boards are fully deductive: if you are guessing, you have probably missed a clue.",
      ],
    },
    {
      heading: "Tango FAQ",
      faq: [
        {
          question: "What is the maximum number of identical symbols in a row?",
          answer:
            "No more than two identical symbols may be adjacent. Three in a row is never allowed.",
        },
        {
          question: "Do diagonals matter in Tango?",
          answer:
            "No. The adjacency rule only applies horizontally and vertically, not diagonally.",
        },
        {
          question: "Where can I find past Tango solutions?",
          answer:
            "The Tango archives list every daily answer with the completed grid.",
        },
      ],
    },
  ],
  queens: [
    {
      heading: "How Queens works",
      paragraphs: [
        "Queens is a visual logic game. The board is divided into colored regions, and your goal is to place exactly one crown in every row, every column, and every colored region of the board.",
        "There is one extra constraint: crowns cannot touch each other — not vertically, horizontally, or even diagonally. Each Queens board has exactly one valid solution.",
      ],
    },
    {
      heading: "Step-by-step",

      ordered: true,      list: [
        "Study the color regions — each region must contain exactly one crown.",
        "Place a crown in a cell that is the only legal option for its row, column, or region.",
        "Mark cells with an X when they cannot hold a crown because of an adjacent crown.",
        "Eliminate whole rows, columns, and regions once their crown is placed.",
        "Repeat until every row, column, and region contains exactly one crown.",
      ],
    },
    {
      heading: "Tips & strategies",
      list: [
        "Start with regions that contain only one or two cells — they are the easiest to resolve.",
        "When a crown is placed, every cell around it (including diagonals) becomes an X.",
        "If a row or column has only one remaining legal cell, that cell must be a crown.",
        "Work region by region: when a region is full, eliminate its remaining empty cells.",
      ],
    },
    {
      heading: "Queens FAQ",
      faq: [
        {
          question: "Can two crowns share a row or column?",
          answer:
            "No. Each row, column, and colored region must contain exactly one crown.",
        },
        {
          question: "Can crowns touch diagonally?",
          answer:
            "No. Crowns cannot touch in any direction, including diagonally.",
        },
        {
          question: "Where can I find today's Queens answer?",
          answer:
            "Check the Queens answer page for today's solution grid with coordinates.",
        },
      ],
    },
  ],
  "mini-sudoku": [
    {
      heading: "How Mini Sudoku works",
      paragraphs: [
        "Mini Sudoku is a compact 6x6 version of classic Sudoku. The grid is divided into rows, columns, and six 2x3 boxes, and you fill it with the digits 1 through 6.",
        "Every row, every column, and every 2x3 box must contain each digit from 1 to 6 exactly once. It shares all the logic of a full 9x9 Sudoku but fits into a quick daily warm-up.",
      ],
    },
    {
      heading: "Step-by-step",

      ordered: true,      list: [
        "Scan each row, column, and 2x3 box for the digits that are already filled in.",
        "For each empty cell, note which digits are still missing from its row, column, and box.",
        "Fill in cells that have only one possible digit.",
        "Use the process of elimination across rows, columns, and boxes to unlock the rest.",
        "Check frequently — every row, column, and box must contain 1 through 6 exactly once.",
      ],
    },
    {
      heading: "Tips & strategies",
      list: [
        "Start with the box that already has the most filled digits.",
        "Look for a digit that appears in five of the six cells of a row or column — the last position is forced.",
        "Cross-check rows and columns together: a digit missing from a row may only fit in one box.",
        "If you are stuck, re-check the 2x3 boxes, not just rows and columns.",
      ],
    },
    {
      heading: "Mini Sudoku FAQ",
      faq: [
        {
          question: "How is Mini Sudoku different from regular Sudoku?",
          answer:
            "Mini Sudoku uses a 6x6 grid with 2x3 boxes instead of the classic 9x9 grid, so it is faster to solve.",
        },
        {
          question: "Is every Mini Sudoku solvable by logic alone?",
          answer:
            "Yes. Daily Mini Sudoku boards are designed to be solved with deduction, without guessing.",
        },
        {
          question: "Where can I see the solution grid?",
          answer:
            "Every Mini Sudoku answer page includes the full completed solution grid.",
        },
      ],
    },
  ],
  crossclimb: [
    {
      heading: "How Crossclimb works",
      paragraphs: [
        "Crossclimb is a word ladder puzzle. You start with one word and transform it into another word one step at a time, changing a single letter at every step so that each intermediate word is still a valid English word.",
        "The puzzle gives you clues for the words along the way, guiding you from the top of the ladder to the bottom. The final word completes the challenge.",
      ],
    },
    {
      heading: "Step-by-step",

      ordered: true,      list: [
        "Read the clues in order — they describe each rung of the word ladder.",
        "Solve the first word of the ladder using its clue and the starting letters.",
        "Change exactly one letter to form the next word, keeping the remaining letters in place.",
        "Confirm each new word is valid English and matches its clue.",
        "Work down the ladder until you reach the final word.",
      ],
    },
    {
      heading: "Tips & strategies",
      list: [
        "Keep the letter positions fixed — only one letter changes between consecutive words.",
        "Answer the clue first, then check whether the word fits the ladder by changing one letter.",
        "Look for small, common words like three-, four-, and five-letter English words.",
        "If a word does not fit, try a different synonym that shares most of its letters.",
      ],
    },
    {
      heading: "Crossclimb FAQ",
      faq: [
        {
          question: "How many letters do Crossclimb words have?",
          answer:
            "Crossclimb ladders usually use short words (often three to five letters) so the ladder stays quick to solve.",
        },
        {
          question: "Can I change more than one letter per step?",
          answer:
            "No. Exactly one letter changes at each step of the ladder.",
        },
        {
          question: "Where can I find today's Crossclimb answer?",
          answer:
            "Visit the Crossclimb answer page for today's full word ladder and clues.",
        },
      ],
    },
  ],
};
