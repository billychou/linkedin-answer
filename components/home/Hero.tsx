import { Gamepad2, Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6 pt-8 sm:pt-10 text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium mb-4">
        <Sparkles className="w-4 h-4" />
        <span>Daily Answers Updated</span>
      </div>

      {/* Main Title */}
      <h1 className="mx-auto max-w-4xl font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-gray-100 mb-4">
        LinkedIn Game{" "}
        <span className="text-blue-600 dark:text-blue-400">Answers</span>
      </h1>

      {/* Subtitle */}
      <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-400 mb-6">
        Get today&apos;s answers for Pinpoint. Updated daily with clues.
      </p>

      {/* Feature Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>Pinpoint</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
          <span>Updated Daily</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">
          <span>Free Access</span>
        </div>
      </div>
    </section>
  );
}
