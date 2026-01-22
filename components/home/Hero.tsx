import { useTranslations } from "next-intl";

export default function Hero() {
  const t = useTranslations("Home");

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8 pt-12 sm:pt-16 text-center">
      <h1 className="mx-auto max-w-4xl font-display text-3xl sm:text-4xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-gray-200">
        {t("title")}
      </h1>
      <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg tracking-tight text-slate-600 dark:text-slate-400 px-4">
        {t("description")}
      </p>
    </section>
  );
}
