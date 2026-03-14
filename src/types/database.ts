export type UserRole = "parent" | "kid";
export type EntryStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface Family {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  display_name: string;
  role: UserRole;
  redemption_rate: number;
  created_at: string;
  updated_at: string;
}

export interface ReadingEntry {
  id: string;
  family_id: string;
  kid_id: string;
  minutes: number;
  book_title: string | null;
  notes: string | null;
  status: EntryStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

export interface Redemption {
  id: string;
  family_id: string;
  kid_id: string;
  minutes: number;
  status: EntryStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

export interface KidBalance {
  kid_id: string;
  family_id: string;
  display_name: string;
  redemption_rate: number;
  total_reading_minutes: number;
  earned_screen_minutes: number;
  used_screen_minutes: number;
  balance: number;
}
