import { getData } from "@/lib/data";

export default async function HomePage() {
  const { coverage } = await getData();
  const top10 = coverage.slice(0, 10);
  const utenDekning = coverage.filter((c) => c.no_coverage).length;
  const totalEldreAlene = coverage.reduce(
    (sum, c) => sum + c.antall_67plus_alene,
    0,
  );

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "2rem 1.5rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <header style={{ marginBottom: "2rem" }}>
        <p
          style={{
            color: "#D7282F",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontSize: "0.875rem",
            marginBottom: "0.5rem",
          }}
        >
          Røde Kors Samfunnspuls
        </p>
        <h1
          style={{
            fontSize: "2.25rem",
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: "0.75rem",
          }}
        >
          Hvor mangler vi besøkstjeneste?
        </h1>
        <p style={{ color: "#555", fontSize: "1.05rem", maxWidth: 720 }}>
          Datadrevet beslutningsstøtte for fagansvarlige. Kombinerer SSB-data
          om eldre som bor alene med Røde Kors&rsquo; egen oversikt over
          aktive lokalforeninger.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
          marginBottom: "2.5rem",
        }}
      >
        <Stat label="Kommuner totalt" value={coverage.length.toString()} />
        <Stat
          label="Uten besøkstjeneste"
          value={utenDekning.toString()}
          accent
        />
        <Stat
          label="Eldre som bor alene (67+)"
          value={totalEldreAlene.toLocaleString("nb-NO")}
        />
      </section>

      <section>
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            marginBottom: "1rem",
          }}
        >
          Topp 10 — størst dekningsgap
        </h2>
        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            border: "1px solid #e5e5e5",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {top10.map((row, i) => (
            <li
              key={row.kommunenummer}
              style={{
                display: "grid",
                gridTemplateColumns: "3rem 1fr auto auto",
                gap: "1rem",
                padding: "1rem 1.25rem",
                alignItems: "center",
                borderTop: i === 0 ? "none" : "1px solid #e5e5e5",
                background: i % 2 === 0 ? "#fff" : "#fafafa",
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "1.25rem",
                  color: "#999",
                }}
              >
                {i + 1}
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: "1.05rem" }}>
                  {row.kommunenavn}
                </div>
                <div style={{ color: "#777", fontSize: "0.875rem" }}>
                  {row.fylkesnavn}
                </div>
              </div>
              <div style={{ textAlign: "right", minWidth: 120 }}>
                <div style={{ fontWeight: 600 }}>
                  {row.antall_67plus_alene.toLocaleString("nb-NO")}
                </div>
                <div style={{ color: "#777", fontSize: "0.75rem" }}>
                  eldre alene
                </div>
              </div>
              <div style={{ minWidth: 130, textAlign: "right" }}>
                {row.no_coverage ? (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.25rem 0.625rem",
                      background: "#FCE7E8",
                      color: "#D7282F",
                      borderRadius: 4,
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                    }}
                  >
                    Ingen dekning
                  </span>
                ) : (
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {row.antall_besokstjenester} grupper
                    </div>
                    <div style={{ color: "#777", fontSize: "0.75rem" }}>
                      ≈ {Math.round(row.need_per_service ?? 0)} per gruppe
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer
        style={{
          marginTop: "3rem",
          paddingTop: "1.5rem",
          borderTop: "1px solid #e5e5e5",
          color: "#777",
          fontSize: "0.875rem",
        }}
      >
        Kartdata © Kartverket (CC BY 4.0). Befolkningsdata © Statistisk
        sentralbyrå (tabell 06844). Organisasjonsdata © Røde Kors.
      </footer>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        padding: "1.25rem",
        border: "1px solid #e5e5e5",
        borderRadius: 8,
        background: accent ? "#FCE7E8" : "#fff",
      }}
    >
      <div
        style={{
          fontSize: "0.8125rem",
          color: accent ? "#D7282F" : "#777",
          fontWeight: 600,
          marginBottom: "0.5rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "2rem",
          fontWeight: 700,
          color: accent ? "#D7282F" : "#171717",
        }}
      >
        {value}
      </div>
    </div>
  );
}
