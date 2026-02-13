import { Gamepad2, Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 pt-12 sm:pt-16 text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-6">
        <Sparkles className="w-4 h-4" />
        <span>Daily Answers Updated</span>
      </div>

      {/* Main Title */}
      <h1 className="mx-auto max-w-4xl font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-gray-100 mb-6">
        LinkedIn Game{" "}
        <span className="text-blue-600 dark:text-blue-400">Answers</span>
      </h1>

      {/* Subtitle */}
      <p className="mx-auto max-w-2xl text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-8">
        Get today&apos;s answers for Pinpoint and more LinkedIn games. 
        Updated daily with clues and explanations.
      </p>

      {/* Feature Pills */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">
          <Gamepad2 className="w-4 h-4" />
          <span>Pinpoint</span>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span>Updated Daily</span>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">
          <span>Free Access</span>
        </div>
      </div>
    </section>
  );
}
