-- FTN Index Scout scheduler — one controlled run/day using Supabase pg_cron + pg_net.
-- 09:17 UTC = 05:17 Trinidad & Tobago (AST). The odd minute avoids top-of-hour load spikes.
-- No external scheduler or paid service is introduced.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid)
from cron.job
where jobname='ftn-index-scout-tto-accommodation-daily';

select cron.schedule(
  'ftn-index-scout-tto-accommodation-daily',
  '17 9 * * *',
  $job$
    select net.http_post(
      url := 'https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ftn-index-scout',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-ftn-scout-secret',(
          select setting_value
          from public.ftn_index_internal_settings
          where setting_key='scout_cron_secret'
        )
      ),
      body := '{}'::jsonb
    );
  $job$
);
