import { getTodayAnswer } from "@/lib/answers";
import { getGame } from "@/lib/games";
import FAQ from "./FAQ";
import GameGuide from "./GameGuide";
import Hero from "./Hero";
import OnboardingBanner from "./OnboardingBanner";

export default function HomeComponent() {
  const game = getGame("pinpoint");
  const todayAnswer = getTodayAnswer("pinpoint");

  return (
    <div className="w-full">
      <Hero game={game} answer={todayAnswer} />

      {/* 首次登录引导（仅登录且未 onboarded 时展示） */}
      <OnboardingBanner />

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
