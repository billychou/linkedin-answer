import { getTodayAnswer } from "@/lib/answers";
import { getGame } from "@/lib/games";
import FAQ from "./FAQ";
import GameGuide from "./GameGuide";
import Hero from "./Hero";

export default function HomeComponent() {
  const game = getGame("pinpoint");
  const todayAnswer = getTodayAnswer("pinpoint");

  return (
    <div className="w-full">
      <Hero game={game} answer={todayAnswer} />

      {/* How to Play Guide Section */}
      <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
        <GameGuide />
      </section>

      {/* FAQ Section */}
      <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
        <FAQ />
      </section>
    </div>
  );
}
