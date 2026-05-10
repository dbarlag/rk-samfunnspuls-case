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

export type Database = {
  public: {
    Tables: {
      municipalities: {
        Row: Municipality;
        Insert: MunicipalityInsert;
        Update: Partial<MunicipalityInsert>;
      };
      red_cross_branches: {
        Row: Branch;
        Insert: BranchInsert;
        Update: Partial<BranchInsert>;
      };
      branch_activities: {
        Row: BranchActivity;
        Insert: BranchActivity;
        Update: Partial<BranchActivity>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
