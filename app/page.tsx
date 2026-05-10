import {
  type KommunePath,
  MunicipalityMap,
} from "@/components/MunicipalityMap";
import { HomeView } from "@/components/HomeView";
import { getData } from "@/lib/data";
import { getKommunePaths, MAP_HEIGHT, MAP_WIDTH } from "@/lib/geo";

export default async function HomePage() {
  const { coverage } = await getData();

  // Projiser kommune-polygoner server-side (file IO), serialiser til array
  // som passes som prop til client-komponenten.
  const pathsMap = getKommunePaths();
  const paths: KommunePath[] = Array.from(pathsMap.entries()).map(
    ([knr, { name, d }]) => ({ knr, name, d }),
  );

  return (
    <HomeView
      coverage={coverage}
      map={
        <MunicipalityMap
          paths={paths}
          coverage={coverage}
          viewBoxWidth={MAP_WIDTH}
          viewBoxHeight={MAP_HEIGHT}
        />
      }
    />
  );
}
