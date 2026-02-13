import { getTodayAnswer } from "@/lib/answers";
import { getGame } from "@/lib/games";
import Hero from "./Hero";
import TodayPinpoint from "./TodayPinpoint";

export default function HomeComponent() {
  const game = getGame("pinpoint");
  const todayAnswer = getTodayAnswer("pinpoint");

  return (
    <div className="w-full">
      <Hero />
      
      {/* Today's Pinpoint Answer Section */}
      {game && todayAnswer && (
        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-12">
          <TodayPinpoint game={game} answer={todayAnswer} />
        </section>
      )}
      
      {/* Game Cards Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-gray-100 mb-2">
            All Games
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Explore more LinkedIn games and their answers
          </p>
        </div>
        {/* <GameGrid /> */}
      </section>
    </div>
  );
}
