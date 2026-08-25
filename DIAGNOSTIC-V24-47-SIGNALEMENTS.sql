-- FigaroMN V24.47 — diagnostic facultatif des signalements anti-triche
-- À exécuter dans Supabase > SQL Editor uniquement si vous voulez vérifier les lignes reçues.
select
  detected_at,
  student_name,
  student_level,
  evaluation_title,
  question_no,
  question_total,
  reason,
  status
from public.evaluation_integrity_alerts
order by detected_at desc
limit 30;
