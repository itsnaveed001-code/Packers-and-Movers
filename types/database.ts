// Hand-written types that mirror the Supabase schema. Until we add
// `supabase gen types`, this file is the single source of truth for DB
// shapes used by lib/queries.ts, lib/cms.ts, and the rest of the app.

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'card';

export type BookingEventType =
  | 'created'
  | 'confirmed'
  | 'rescheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'payment_received'
  | 'note_added';

export type FunnelEventType =
  | 'site_visit'
  | 'service_viewed'
  | 'booking_started'
  | 'booking_step_completed'
  | 'booking_submitted'
  | 'booking_abandoned';

export type ContentBlockPage = 'home' | 'about' | 'contact' | 'global';

export type OtpPurpose = 'booking' | 'cancel' | 'manage';

/** Custom-move resource selections persisted on bookings.custom_resources. */
export type CustomResources = {
  workers: number;
  vehicle: string;
  hours: number;
  /** Indicative price shown at booking time, in paise. */
  indicative_price_paise?: number;
};

export type HomeFeatureSection = 'why_choose' | 'how_it_works' | 'example_card';

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
          coming_soon: boolean;
          is_custom: boolean;
          created_at: string;
          updated_at: string;
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
          coming_soon?: boolean;
          is_custom?: boolean;
          created_at?: string;
          updated_at?: string;
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
          updated_at: string;
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
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['availability_settings']['Insert']>;
        Relationships: [];
      };
      blocked_dates: {
        Row: {
          id: string;
          date: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['blocked_dates']['Insert']>;
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          reference_code: string;
          service_id: string;
          customer_id: string | null;
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
          status: BookingStatus;
          admin_notes: string | null;
          final_price: number | null;
          payment_received: boolean;
          paid_at: string | null;
          payment_method: PaymentMethod | string | null;
          deleted_at: string | null;
          email_verified: boolean;
          cancelled_at: string | null;
          cancel_reason: string | null;
          custom_resources: CustomResources | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference_code: string;
          service_id: string;
          customer_id?: string | null;
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
          status?: BookingStatus;
          admin_notes?: string | null;
          final_price?: number | null;
          payment_received?: boolean;
          paid_at?: string | null;
          payment_method?: PaymentMethod | string | null;
          deleted_at?: string | null;
          email_verified?: boolean;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          custom_resources?: CustomResources | null;
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
          {
            foreignKeyName: 'bookings_customer_id_fkey';
            columns: ['customer_id'];
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          phone: string;
          name: string;
          email: string | null;
          total_bookings: number;
          total_revenue: number;
          first_booking_at: string | null;
          last_booking_at: string | null;
          admin_notes: string | null;
          user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          name: string;
          email?: string | null;
          total_bookings?: number;
          total_revenue?: number;
          first_booking_at?: string | null;
          last_booking_at?: string | null;
          admin_notes?: string | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
        Relationships: [];
      };
      booking_events: {
        Row: {
          id: string;
          booking_id: string;
          event_type: BookingEventType;
          payload: Record<string, unknown>;
          actor: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          event_type: BookingEventType;
          payload?: Record<string, unknown>;
          actor?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['booking_events']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'booking_events_booking_id_fkey';
            columns: ['booking_id'];
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_log: {
        Row: {
          id: number;
          table_name: string;
          row_id: string;
          op: 'INSERT' | 'UPDATE' | 'DELETE';
          old_row: Record<string, unknown> | null;
          new_row: Record<string, unknown> | null;
          actor: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      analytics_events: {
        Row: {
          id: number;
          event_type: FunnelEventType;
          session_id: string;
          service_slug: string | null;
          step: number | null;
          payload: Record<string, unknown>;
          ua_summary: string | null;
          country: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          event_type: FunnelEventType;
          session_id: string;
          service_slug?: string | null;
          step?: number | null;
          payload?: Record<string, unknown>;
          ua_summary?: string | null;
          country?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['analytics_events']['Insert']>;
        Relationships: [];
      };
      site_settings: {
        Row: {
          id: string;
          company_name: string;
          tagline: string;
          logo_url: string | null;
          phone: string;
          whatsapp: string;
          email: string;
          address: string;
          footer_text: string | null;
          business_hours: Record<string, string>;
          social_links: Record<string, string>;
          map_mode: 'embed' | 'arealist';
          map_query: string | null;
          map_lat: number | null;
          map_lng: number | null;
          google_rating: number | null;
          google_reviews_url: string | null;
          insurance_badge_url: string | null;
          stat_moves_completed: string | null;
          stat_years_service: string | null;
          singleton: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['site_settings']['Row']>;
        Update: Partial<Database['public']['Tables']['site_settings']['Row']>;
        Relationships: [];
      };
      service_areas: {
        Row: {
          id: string;
          name: string;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['service_areas']['Insert']>;
        Relationships: [];
      };
      content_blocks: {
        Row: {
          id: string;
          page: ContentBlockPage | string;
          key: string;
          value: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          page: ContentBlockPage | string;
          key: string;
          value: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['content_blocks']['Insert']>;
        Relationships: [];
      };
      home_features: {
        Row: {
          id: string;
          section: HomeFeatureSection;
          title: string;
          body: string | null;
          icon: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          section: HomeFeatureSection;
          title: string;
          body?: string | null;
          icon?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['home_features']['Insert']>;
        Relationships: [];
      };
      about_values: {
        Row: {
          id: string;
          title: string;
          body: string;
          icon: string;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          icon?: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['about_values']['Insert']>;
        Relationships: [];
      };
      testimonials: {
        Row: {
          id: string;
          name: string;
          city: string | null;
          quote: string;
          rating: number | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          city?: string | null;
          quote: string;
          rating?: number | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['testimonials']['Insert']>;
        Relationships: [];
      };
      faqs: {
        Row: {
          id: string;
          service_id: string | null;
          question: string;
          answer: string;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          service_id?: string | null;
          question: string;
          answer: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['faqs']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'faqs_service_id_fkey';
            columns: ['service_id'];
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
        ];
      };
      service_includes: {
        Row: {
          id: string;
          service_id: string;
          item: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          service_id: string;
          item: string;
          display_order?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['service_includes']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'service_includes_service_id_fkey';
            columns: ['service_id'];
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
        ];
      };
      pricing_tiers: {
        Row: {
          id: string;
          service_id: string;
          label: string;
          sublabel: string | null;
          price: number;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          service_id: string;
          label: string;
          sublabel?: string | null;
          price: number;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pricing_tiers']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'pricing_tiers_service_id_fkey';
            columns: ['service_id'];
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
        ];
      };
      email_otps: {
        Row: {
          id: string;
          email: string;
          code_hash: string;
          purpose: OtpPurpose;
          attempts: number;
          expires_at: string;
          consumed_at: string | null;
          ip: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          code_hash: string;
          purpose?: OtpPurpose;
          attempts?: number;
          expires_at: string;
          consumed_at?: string | null;
          ip?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['email_otps']['Insert']>;
        Relationships: [];
      };
      contact_submissions: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string;
          message: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone: string;
          message: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['contact_submissions']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      booking_status: BookingStatus;
      payment_method: PaymentMethod;
      booking_event_type: BookingEventType;
      funnel_event_type: FunnelEventType;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Service = Database['public']['Tables']['services']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type AvailabilitySettings =
  Database['public']['Tables']['availability_settings']['Row'];
export type BlockedDate = Database['public']['Tables']['blocked_dates']['Row'];

export type Customer = Database['public']['Tables']['customers']['Row'];
export type BookingEvent = Database['public']['Tables']['booking_events']['Row'];
export type AuditLog = Database['public']['Tables']['audit_log']['Row'];
export type AnalyticsEvent = Database['public']['Tables']['analytics_events']['Row'];

export type SiteSettings = Database['public']['Tables']['site_settings']['Row'];
export type ServiceArea = Database['public']['Tables']['service_areas']['Row'];
export type ContentBlock = Database['public']['Tables']['content_blocks']['Row'];
export type HomeFeature = Database['public']['Tables']['home_features']['Row'];
export type AboutValue = Database['public']['Tables']['about_values']['Row'];
export type Testimonial = Database['public']['Tables']['testimonials']['Row'];
export type Faq = Database['public']['Tables']['faqs']['Row'];
export type ServiceInclude = Database['public']['Tables']['service_includes']['Row'];
export type PricingTier = Database['public']['Tables']['pricing_tiers']['Row'];
export type ContactSubmission =
  Database['public']['Tables']['contact_submissions']['Row'];
export type EmailOtp = Database['public']['Tables']['email_otps']['Row'];
