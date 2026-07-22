-- WhatsApp outbound media storage.
-- Run this migration in the Supabase SQL Editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'outbound-media',
  'outbound-media',
  true,
  16777216,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'audio/mpeg',
    'audio/ogg',
    'audio/mp4',
    'video/mp4',
    'video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Workspace members can upload outbound media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'outbound-media'
  and exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id::text = (storage.foldername(name))[1]
      and wm.user_id = auth.uid()
  )
);

create policy "Workspace members can read outbound media"
on storage.objects for select
to authenticated
using (
  bucket_id = 'outbound-media'
  and exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id::text = (storage.foldername(name))[1]
      and wm.user_id = auth.uid()
  )
);

create policy "Public can read outbound media"
on storage.objects for select
to anon
using (bucket_id = 'outbound-media');
