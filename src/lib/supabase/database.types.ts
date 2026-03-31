// src/lib/supabase/database.types.ts
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      match_likes: {
        Row: { fixture_id: string; user_id: string; created_at: string }
        Insert: { fixture_id: string; user_id: string; created_at?: string }
        Update: Partial<{ fixture_id: string; user_id: string; created_at: string }>
      }
      match_comments: {
        Row: {
          id: string
          fixture_id: string
          parent_id: string | null
          author_id: string
          author_name: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          fixture_id: string
          parent_id?: string | null
          author_id: string
          author_name: string
          body: string
          created_at?: string
        }
        Update: Partial<{
          id: string
          fixture_id: string
          parent_id: string | null
          author_id: string
          author_name: string
          body: string
          created_at: string
        }>
      }
    }
  }
}