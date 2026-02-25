import { getTodayAnswer } from "@/lib/answers";
import { getGame } from "@/lib/games";
import FAQ from "./FAQ";
import GameGuide from "./GameGuide";
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

      {/* How to Play Guide Section */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-12">
        <GameGuide />
      </section>

      {/* FAQ Section */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-12">
        <FAQ />
      </section>
    </div>
  );
}
