#!/usr/bin/env bash
set -euo pipefail

# Example local Supabase storage provisioning for an avatar bucket.
# Replace bucket name/policies if your app uses different storage conventions.

DB_CONTAINER_ID="$(
  docker ps --format '{{.ID}} {{.Names}}' \
    | awk '/supabase.*db/ {print $1; exit}'
)"

if [[ -z "${DB_CONTAINER_ID}" ]]; then
  echo "error: could not find a running local Supabase DB container." >&2
  echo "hint: run 'scripts/start-local-auth.sh local_offline' first." >&2
  exit 1
fi

docker exec -i "${DB_CONTAINER_ID}" psql -v ON_ERROR_STOP=1 -U postgres -d postgres <<'SQL'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    TRUE,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id)
DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
CREATE POLICY "Avatar public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar owner write" ON storage.objects;
CREATE POLICY "Avatar owner write"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Avatar owner update" ON storage.objects;
CREATE POLICY "Avatar owner update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Avatar owner delete" ON storage.objects;
CREATE POLICY "Avatar owner delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
);
SQL

echo "Local avatar bucket and storage policies are ready."
