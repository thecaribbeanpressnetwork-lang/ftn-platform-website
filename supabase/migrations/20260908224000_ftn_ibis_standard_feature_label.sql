update public.ftn_ibis_plans
set features='["Five public source-backed intelligence tools plus plan discovery","Source links and provenance","Basic Caribbean opportunity search","No payment required"]'::jsonb,
    updated_at=now()
where plan_id='ibis-standard';
