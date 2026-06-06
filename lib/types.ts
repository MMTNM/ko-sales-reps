export interface Lead {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  roof_type: string | null;
  damage_type: string | null;
  notes: string | null;
  status: "new" | "contacted" | "estimate_scheduled" | "estimate_sent" | "sold" | "lost";
  jobnimbus_contact_id: string | null;
  jobnimbus_job_id: string | null;
  assigned_rep: string | null;
  doors_knocked: number;
  latitude: number | null;
  longitude: number | null;
  territory: string | null;
  created_at: string;
  updated_at: string;
}
