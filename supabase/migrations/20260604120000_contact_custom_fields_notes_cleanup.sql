UPDATE public.contacts
SET custom_fields = CASE
  WHEN custom_fields ? 'notes' THEN custom_fields - 'clickupTaskContent' - 'linkedInLabels' - 'linkedinLabels'
  WHEN custom_fields ? 'clickupTaskContent' THEN jsonb_set(
    custom_fields - 'clickupTaskContent' - 'linkedInLabels' - 'linkedinLabels',
    '{notes}',
    custom_fields -> 'clickupTaskContent',
    true
  )
  ELSE custom_fields - 'linkedInLabels' - 'linkedinLabels'
END
WHERE custom_fields ? 'clickupTaskContent'
   OR custom_fields ? 'linkedInLabels'
   OR custom_fields ? 'linkedinLabels';
