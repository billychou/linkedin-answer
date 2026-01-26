import GameGrid from "@/components/games/GameGrid";

export default function HomeComponent() {
  return (
    <div className="w-full">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <GameGrid />
      </section>
    </div>
  );
}
