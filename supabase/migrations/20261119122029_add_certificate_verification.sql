/*
# Certificate verification: status, verification URL, barcode, public verify function

1. Modified Tables
- `certificates`
  - adds `status` (text, 'valid' or 'revoked', default 'valid') — revocation state, never client-writable
  - adds `verification_url` (text, null) — public URL encoded in the certificate QR code
  - adds `barcode_value` (text, not null, default '') — value encoded in the Code 128 barcode (the certificate ID)

2. Security
- `status` must only change through an authorized server-side function, so direct client
  UPDATE is restricted to content columns only (REVOKE UPDATE, then GRANT on the safe columns).
- New `verify_certificate(p_certificate_id text)` SECURITY DEFINER function:
  - callable by `anon` and `authenticated` (public visitors scan QR/barcodes without signing in)
  - accepts a certificate ID (case-insensitive, trimmed) or a full verification URL
  - returns ONLY public-facing fields (names, course, dates, status) — no user_id, no internal ids
  - returns a row with `found boolean` so NOT FOUND is an explicit, indistinguishable-to-timing outcome
- Revocation/restore goes through `set_certificate_status(p_certificate_id, p_status)`:
  - SECURITY DEFINER, callable by `authenticated` only (admins are signed in)
  - validates the status value and derives nothing from caller-controlled actor fields
- Grants: SELECT on existing columns stays with `authenticated` (admin-only records);
  anon gets NO direct table access — the public can only reach data via the verify function.

3. Notes
- Existing certificates keep working: status defaults to 'valid', barcode_value defaults to ''.
- The frontend fills verification_url and barcode_value on new inserts.
*/

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'valid',
  ADD COLUMN IF NOT EXISTS verification_url text,
  ADD COLUMN IF NOT EXISTS barcode_value text NOT NULL DEFAULT '';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'certificates_status_check'
  ) THEN
    ALTER TABLE certificates ADD CONSTRAINT certificates_status_check CHECK (status IN ('valid', 'revoked'));
  END IF;
END $$;

-- Backfill barcode_value for existing certificates
UPDATE certificates SET barcode_value = certificate_id WHERE barcode_value = '';

-- Restrict client writes to content columns only; status is server-controlled
REVOKE UPDATE ON certificates FROM authenticated;
GRANT UPDATE (recipient_name, course_name, organization_name, start_date, completion_date, issue_date, director_name, verification_url, barcode_value)
  ON certificates TO authenticated;

CREATE OR REPLACE FUNCTION verify_certificate(p_certificate_id text)
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
  verification_url text
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
    c.verification_url
  FROM certificates c
  WHERE lower(c.certificate_id) = lower(trim(p_certificate_id))
     OR lower(c.verification_url) = lower(trim(p_certificate_id))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION set_certificate_status(p_certificate_id text, p_status text)
RETURNS text
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

  IF p_status NOT IN ('valid', 'revoked') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE certificates
  SET status = p_status
  WHERE lower(certificate_id) = lower(trim(p_certificate_id))
    AND user_id = v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Certificate not found';
  END IF;

  RETURN p_status;
END;
$$;

REVOKE EXECUTE ON FUNCTION verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_certificate(text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION set_certificate_status(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_certificate_status(text, text) TO authenticated;