CREATE TABLE IF NOT EXISTS certificate_verification_tombstones (
  certificate_id text PRIMARY KEY,
  verification_url text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deleted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE certificate_verification_tombstones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON certificate_verification_tombstones FROM anon, authenticated;
REVOKE DELETE ON certificates FROM authenticated;

CREATE OR REPLACE FUNCTION delete_certificate(p_certificate_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_certificate_id text;
  v_verification_url text;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT c.certificate_id, c.verification_url
  INTO v_certificate_id, v_verification_url
  FROM certificates c
  WHERE lower(c.certificate_id) = lower(trim(p_certificate_id))
    AND c.user_id = v_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Certificate not found';
  END IF;

  INSERT INTO certificate_verification_tombstones (certificate_id, verification_url, user_id)
  VALUES (v_certificate_id, v_verification_url, v_user)
  ON CONFLICT (certificate_id) DO UPDATE
  SET verification_url = EXCLUDED.verification_url,
      user_id = EXCLUDED.user_id,
      deleted_at = now();

  DELETE FROM certificates
  WHERE certificate_id = v_certificate_id
    AND user_id = v_user;

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_certificate(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION delete_certificate(text) TO authenticated;

DROP FUNCTION IF EXISTS verify_certificate(text);

CREATE FUNCTION verify_certificate(p_certificate_id text)
RETURNS TABLE (
  found boolean,
  status text,
  certificate_id text,
  recipient_name text,
  course_name text,
  organization_name text,
  start_date date,
  completion_date date,
  issue_date date,
  director_name text,
  verification_url text,
  allow_public_download boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH matching_certificate AS (
    SELECT
      true AS found,
      c.status,
      c.certificate_id,
      c.recipient_name,
      c.course_name,
      c.organization_name,
      c.start_date,
      c.completion_date,
      c.issue_date,
      c.director_name,
      c.verification_url,
      COALESCE(
        (SELECT s.allow_public_download FROM app_settings s WHERE s.user_id = c.user_id LIMIT 1),
        true
      ) AS allow_public_download
    FROM certificates c
    WHERE lower(c.certificate_id) = lower(trim(p_certificate_id))
       OR lower(c.verification_url) = lower(trim(p_certificate_id))
    LIMIT 1
  )
  SELECT
    mc.found,
    mc.status,
    mc.certificate_id,
    mc.recipient_name,
    mc.course_name,
    mc.organization_name,
    mc.start_date,
    mc.completion_date,
    mc.issue_date,
    mc.director_name,
    mc.verification_url,
    mc.allow_public_download
  FROM matching_certificate mc

  UNION ALL

  SELECT
    true,
    'revoked'::text,
    t.certificate_id,
    NULL::text,
    NULL::text,
    NULL::text,
    NULL::date,
    NULL::date,
    NULL::date,
    NULL::text,
    t.verification_url,
    NULL::boolean
  FROM certificate_verification_tombstones t
  WHERE (
    lower(t.certificate_id) = lower(trim(p_certificate_id))
    OR lower(t.verification_url) = lower(trim(p_certificate_id))
  )
    AND NOT EXISTS (
      SELECT 1
      FROM certificates c
      WHERE lower(c.certificate_id) = lower(trim(p_certificate_id))
         OR lower(c.verification_url) = lower(trim(p_certificate_id))
    )
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_certificate(text) TO anon, authenticated;
