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
  antall_barn_6_16: number | null;       // SSB 07459 sum 6-16 (Leksehjelp-behov)
  antall_innvandrere: number | null;      // SSB 09817 (Norsktrening-behov)
  data_year: number | null;
  updated_at: string;
};

export type MunicipalityInsert = Omit<Municipality, "antall_67plus_alene" | "updated_at">;

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
