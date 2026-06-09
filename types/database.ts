export type Database = {
  public: {
    Tables: {
      services: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string;
          short_description: string;
          base_price: number | null;
          duration_hours: number;
          icon_name: string;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description: string;
          short_description: string;
          base_price?: number | null;
          duration_hours?: number;
          icon_name?: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['services']['Insert']>;
        Relationships: [];
      };
      availability_settings: {
        Row: {
          id: string;
          working_days: number[];
          working_hours_start: string;
          working_hours_end: string;
          slot_duration_minutes: number;
          max_concurrent_bookings_per_slot: number;
          advance_booking_days: number;
          minimum_notice_hours: number;
        };
        Insert: {
          id?: string;
          working_days?: number[];
          working_hours_start?: string;
          working_hours_end?: string;
          slot_duration_minutes?: number;
          max_concurrent_bookings_per_slot?: number;
          advance_booking_days?: number;
          minimum_notice_hours?: number;
        };
        Update: Partial<Database['public']['Tables']['availability_settings']['Insert']>;
        Relationships: [];
      };
      blocked_dates: {
        Row: {
          id: string;
          date: string;
          reason: string | null;
        };
        Insert: {
          id?: string;
          date: string;
          reason?: string | null;
        };
        Update: Partial<Database['public']['Tables']['blocked_dates']['Insert']>;
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          reference_code: string;
          service_id: string;
          booking_date: string;
          booking_time: string;
          duration_hours: number;
          customer_name: string;
          customer_phone: string;
          customer_email: string;
          pickup_address: string;
          pickup_city: string;
          pickup_pincode: string;
          dropoff_address: string;
          dropoff_city: string;
          dropoff_pincode: string;
          notes: string | null;
          status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
          admin_notes: string | null;
          final_price: number | null;
          payment_received: boolean;
          paid_at: string | null;
          payment_method: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference_code: string;
          service_id: string;
          booking_date: string;
          booking_time: string;
          duration_hours: number;
          customer_name: string;
          customer_phone: string;
          customer_email: string;
          pickup_address: string;
          pickup_city: string;
          pickup_pincode: string;
          dropoff_address: string;
          dropoff_city: string;
          dropoff_pincode: string;
          notes?: string | null;
          status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
          admin_notes?: string | null;
          final_price?: number | null;
          payment_received?: boolean;
          paid_at?: string | null;
          payment_method?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'bookings_service_id_fkey';
            columns: ['service_id'];
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Service = Database['public']['Tables']['services']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type AvailabilitySettings =
  Database['public']['Tables']['availability_settings']['Row'];
export type BlockedDate = Database['public']['Tables']['blocked_dates']['Row'];
