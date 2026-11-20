/*
# Add public download setting and expose it through verify_certificate

1. Modified Tables
- `app_settings`
  - adds `allow_public_download` (boolean, default true) — admin toggle controlling whether
    the public verification page shows a Download PDF button.

2. Modified Functions
- Drops and recreates `verify_certificate(p_certificate_id text)` so it now also returns
  `allow_public_download`, read from the certificate owner's settings (default true when unset).
  Still SECURITY DEFINER and still exposes only public-facing fields.

3. Security
- `allow_public_download` is only writable by the owner through the existing
  app_settings UPDATE policy; the public verify function only reads it.
*/

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS allow_public_download boolean NOT NULL DEFAULT true;

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
  SELECT
    true,
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
    )
  FROM certificates c
  WHERE lower(c.certificate_id) = lower(trim(p_certificate_id))
     OR lower(c.verification_url) = lower(trim(p_certificate_id))
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_certificate(text) TO anon, authenticated;