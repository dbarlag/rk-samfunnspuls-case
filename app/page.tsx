import { HomeView } from "@/components/HomeView";
import { type KommunePath } from "@/components/MunicipalityMap";
import { getData } from "@/lib/data";
import { getKommunePaths, MAP_HEIGHT, MAP_WIDTH } from "@/lib/geo";

export default async function HomePage() {
  const { coverageByActivity } = await getData();

  const pathsMap = getKommunePaths();
  const paths: KommunePath[] = Array.from(pathsMap.entries()).map(
    ([knr, { name, d }]) => ({ knr, name, d }),
  );

  return (
    <HomeView
      coverageByActivity={coverageByActivity}
      paths={paths}
      viewBoxWidth={MAP_WIDTH}
      viewBoxHeight={MAP_HEIGHT}
    />
  );
}
