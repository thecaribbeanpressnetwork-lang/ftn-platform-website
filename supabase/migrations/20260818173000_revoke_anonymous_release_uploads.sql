-- Close the temporary Community Connect release-upload capability.
-- The public bucket may remain readable, but browser roles must never publish signed builds.
drop policy if exists "ftn_android_release_1_0_8_upload" on storage.objects;
drop policy if exists "ftn_one_time_android_release_upload" on storage.objects;
