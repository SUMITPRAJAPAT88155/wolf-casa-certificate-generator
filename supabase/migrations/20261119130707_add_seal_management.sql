/*
# Company Seal Management: seals table, storage bucket, seal settings

1. New Tables
   - seals: id, user_id (owner, defaults to auth.uid()), name, kind
     (company_seal | signatory_stamp | director_signature), storage_path,
     is_default (one per owner, enforced by partial unique index), created_at.

2. Modified Tables
   - app_settings: adds seal_enabled (default true), seal_size (default 110),
     seal_position (bottom_left | bottom_center | bottom_right, default bottom_left),
     selected_seal_id, selected_stamp_id, selected_signature_id (FKs to seals,
     ON DELETE SET NULL so deleting a seal clears references).

3. Storage
   - New public bucket "seals". Seal images appear on publicly verifiable
     certificates, so public read is intended. Writes are restricted to
     authenticated users writing only inside a first folder named their own
     auth.uid().

4. Security
   - RLS enabled on seals with owner-scoped CRUD, granted to authenticated only.
   - set_default_seal(p_seal_id uuid) SECURITY DEFINER: promotes one owned seal
     to default and clears the flag on all others atomically. Revoked from
     PUBLIC and anon, granted to authenticated.

5. Notes
   - Images are validated in the app (image types only, max 2 MB) before upload.
*/

CREATE TABLE IF NOT EXISTS seals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'company_seal' CHECK (kind IN ('company_seal', 'signatory_stamp', 'director_signature')),
  storage_path text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE seals ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON seals TO authenticated;

DROP POLICY IF EXISTS "select_own_seals" ON seals;
CREATE POLICY "select_own_seals" ON seals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_seals" ON seals;
CREATE POLICY "insert_own_seals" ON seals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_seals" ON seals;
CREATE POLICY "update_own_seals" ON seals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_seals" ON seals;
CREATE POLICY "delete_own_seals" ON seals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS seals_one_default_per_user ON seals (user_id) WHERE is_default;

INSERT INTO storage.buckets (id, name, public)
VALUES ('seals', 'seals', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "seals_public_read" ON storage.objects;
CREATE POLICY "seals_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'seals');

DROP POLICY IF EXISTS "seals_owner_insert" ON storage.objects;
CREATE POLICY "seals_owner_insert" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'seals' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "seals_owner_update" ON storage.objects;
CREATE POLICY "seals_owner_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'seals' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "seals_owner_delete" ON storage.objects;
CREATE POLICY "seals_owner_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'seals' AND (storage.foldername(name))[1] = auth.uid()::text);

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS seal_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS seal_size integer NOT NULL DEFAULT 110,
  ADD COLUMN IF NOT EXISTS seal_position text NOT NULL DEFAULT 'bottom_left',
  ADD COLUMN IF NOT EXISTS selected_seal_id uuid REFERENCES seals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS selected_stamp_id uuid REFERENCES seals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS selected_signature_id uuid REFERENCES seals(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_settings_seal_position_check'
  ) THEN
    ALTER TABLE app_settings ADD CONSTRAINT app_settings_seal_position_check
      CHECK (seal_position IN ('bottom_left', 'bottom_center', 'bottom_right'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION set_default_seal(p_seal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM seals WHERE id = p_seal_id AND user_id = v_user) THEN
    RAISE EXCEPTION 'Seal not found';
  END IF;

  UPDATE seals
  SET is_default = (id = p_seal_id)
  WHERE user_id = v_user;
END;
$$;

REVOKE EXECUTE ON FUNCTION set_default_seal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_default_seal(uuid) TO authenticated;