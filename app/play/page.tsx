import Link from "next/link";
import GameSession from "@/components/game/GameSessionLoader";
import { hasCoverage } from "@/lib/geo/countries-coverage";
import type { Continent, GameScope } from "@/types/game";

const CONTINENT_CODES: Continent[] = ["EU", "AS", "AF", "NA", "SA", "OC"];

function parseScope(
  searchParams: Record<string, string | string[] | undefined>,
): GameScope | null {
  const scopeType = searchParams.scope;
  const code = searchParams.code;

  if (scopeType === "globe") {
    return { type: "globe" };
  }

  if (scopeType === "continent" && typeof code === "string") {
    if ((CONTINENT_CODES as string[]).includes(code)) {
      return { type: "continent", code: code as Continent };
    }
    return null;
  }

  if (scopeType === "country" && typeof code === "string" && hasCoverage(code)) {
    return { type: "country", code };
  }

  return null;
}

export default async function Page(props: PageProps<"/play">) {
  const searchParams = await props.searchParams;
  const scope = parseScope(searchParams);

  if (!scope) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 px-6 text-center text-slate-300">
        <p>Invalid or missing game scope.</p>
        <Link
          href="/"
          className="rounded-full bg-sky-500 px-6 py-2 font-semibold text-white transition hover:bg-sky-400"
        >
          Back to Start
        </Link>
      </div>
    );
  }

  return <GameSession initialScope={scope} />;
}
