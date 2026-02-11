-- =============================================================
-- HOSTech Coworking Space - Discount Codes, Service Types, 
-- Room Bookings, and Staff Soft Delete
-- =============================================================

-- ===================== DISCOUNT CODES TABLE =====================
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(12, 2) NOT NULL CHECK (discount_value > 0),
  max_usage INT,
  usage_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===================== SERVICE CONFIGURATIONS =====================
CREATE TABLE IF NOT EXISTS public.service_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===================== ROOM BOOKINGS TABLE =====================
CREATE TABLE IF NOT EXISTS public.room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type TEXT NOT NULL CHECK (room_type IN ('Meeting Room', 'Conference Room')),
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  booked_by UUID NOT NULL,
  booked_by_name TEXT NOT NULL,
  receipt_id UUID,
  customer_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===================== RLS FOR NEW TABLES =====================
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;

-- Discount codes policies
DROP POLICY IF EXISTS "discount_codes_select_all" ON public.discount_codes;
CREATE POLICY "discount_codes_select_all" ON public.discount_codes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "discount_codes_insert_admin" ON public.discount_codes;
CREATE POLICY "discount_codes_insert_admin" ON public.discount_codes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "discount_codes_update_admin" ON public.discount_codes;
CREATE POLICY "discount_codes_update_admin" ON public.discount_codes FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "discount_codes_delete_admin" ON public.discount_codes;
CREATE POLICY "discount_codes_delete_admin" ON public.discount_codes FOR DELETE TO authenticated USING (true);

-- Service config policies
DROP POLICY IF EXISTS "service_config_select_all" ON public.service_config;
CREATE POLICY "service_config_select_all" ON public.service_config FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "service_config_update_admin" ON public.service_config;
CREATE POLICY "service_config_update_admin" ON public.service_config FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "service_config_insert_admin" ON public.service_config;
CREATE POLICY "service_config_insert_admin" ON public.service_config FOR INSERT TO authenticated WITH CHECK (true);

-- Room bookings policies
DROP POLICY IF EXISTS "room_bookings_select_all" ON public.room_bookings;
CREATE POLICY "room_bookings_select_all" ON public.room_bookings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "room_bookings_insert_auth" ON public.room_bookings;
CREATE POLICY "room_bookings_insert_auth" ON public.room_bookings FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "room_bookings_update_auth" ON public.room_bookings;
CREATE POLICY "room_bookings_update_auth" ON public.room_bookings FOR UPDATE TO authenticated USING (true);

-- ===================== INDEXES =====================
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON public.discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON public.discount_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_room_bookings_date ON public.room_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_room_bookings_room_type ON public.room_bookings(room_type);
