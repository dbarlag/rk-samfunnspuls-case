import { HomeView } from "@/components/HomeView";
import { MunicipalityMap } from "@/components/MunicipalityMap";
import { getData } from "@/lib/data";

export default async function HomePage() {
  const { coverage } = await getData();
  return (
    <HomeView
      coverage={coverage}
      map={<MunicipalityMap coverage={coverage} />}
    />
  );
}
