import GameGrid from "@/components/games/GameGrid";
import Hero from "@/components/home/Hero";

export default function HomeComponent() {
  return (
    <div className="w-full">
      <Hero />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <GameGrid />
      </section>
    </div>
  );
}
