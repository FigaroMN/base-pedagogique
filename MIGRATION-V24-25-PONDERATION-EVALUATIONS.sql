-- FigaroMN V24.25 — normalisation des indicateurs Bac Pro sur une échelle interne de 5 points.
-- 20 % = 1/5, 40 % = 2/5, 60 % = 3/5, 100 % = 5/5.
-- Cette migration est idempotente et ne modifie ni les anciennes notes ni les anciens pourcentages.
BEGIN;

UPDATE public.indicator_results ir
SET correct_count = ir.correct_count * 5,
    question_count = ir.question_count * 5
FROM public.activity_attempts aa
WHERE ir.attempt_id = aa.id
  AND COALESCE(aa.details->>'engine','') = 'bacpro_auto_v11'
  AND COALESCE((aa.details->>'indicator_scale')::integer,1) <> 5;

UPDATE public.activity_attempts
SET details = COALESCE(details,'{}'::jsonb) || '{"indicator_scale":5}'::jsonb
WHERE COALESCE(details->>'engine','') = 'bacpro_auto_v11'
  AND COALESCE((details->>'indicator_scale')::integer,1) <> 5;

COMMIT;
