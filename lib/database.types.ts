// Manuelt vedlikeholdt — speiler db/schema.sql.
// Hold disse i sync når schemaet endres.

export type Municipality = {
  kommunenummer: string;
  kommunenavn: string;
  kommunenavn_normalized: string;
  fylkesnummer: string | null;
  fylkesnavn: string | null;
  antall_67_79_alene: number | null;
  antall_80plus_alene: number | null;
  antall_67plus_alene: number; // GENERATED
  total_befolkning: number | null;
  // Multi-aktivitet behov-metrikker (kommer fra ekstra ETL):
  antall_ungdom_13_19: number | null;    // SSB 07459 sum 13-19 (Leksehjelp-behov, ungdomsskole+VGS)
  antall_innvandrere: number | null;      // SSB 09817 (Norsktrening-behov)
  antall_flyktninger: number | null;      // SSB 09817 13-lands proxy (Flyktningguide-behov)
  data_year: number | null;
  updated_at: string;
};

// Insert-type for municipalities. Alle ikke-PK / ikke-NOT-NULL felt er
// optional, slik at en ingest-script kan upserte sparse rader (f.eks.
// ingest-ssb populerer alders-tall, ingest-ssb-extra populerer barn 6-16
// og innvandrere).
export type MunicipalityInsert = {
  kommunenummer: string;
  kommunenavn: string;
  kommunenavn_normalized: string;
  fylkesnummer?: string | null;
  fylkesnavn?: string | null;
  antall_67_79_alene?: number | null;
  antall_80plus_alene?: number | null;
  antall_ungdom_13_19?: number | null;
  antall_innvandrere?: number | null;
  antall_flyktninger?: number | null;
  total_befolkning?: number | null;
  data_year?: number | null;
};

export type Branch = {
  branch_id: string;
  branch_number: string | null;
  name: string;
  branch_type: string;
  parent_name: string | null;
  municipality_name: string | null;
  kommunenummer: string | null;
  county: string | null;
  postal_code: string | null;
  email: string | null;
  phone: string | null;
  web: string | null;
  is_active: boolean;
  updated_at: string;
};

export type BranchInsert = Omit<Branch, "updated_at">;

export type BranchActivity = {
  branch_id: string;
  activity_name: string;
};

// Database-type formet etter Supabase-postgrest-js sin GenericSchema.
// Hver tabell må ha Row/Insert/Update + Relationships (selv om tom).
export type Database = {
  public: {
    Tables: {
      municipalities: {
        Row: Municipality;
        Insert: MunicipalityInsert;
        Update: Partial<MunicipalityInsert>;
        Relationships: [];
      };
      red_cross_branches: {
        Row: Branch;
        Insert: BranchInsert;
        Update: Partial<BranchInsert>;
        Relationships: [
          {
            foreignKeyName: "red_cross_branches_kommunenummer_fkey";
            columns: ["kommunenummer"];
            isOneToOne: false;
            referencedRelation: "municipalities";
            referencedColumns: ["kommunenummer"];
          },
        ];
      };
      branch_activities: {
        Row: BranchActivity;
        Insert: BranchActivity;
        Update: Partial<BranchActivity>;
        Relationships: [
          {
            foreignKeyName: "branch_activities_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "red_cross_branches";
            referencedColumns: ["branch_id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
  };
};
