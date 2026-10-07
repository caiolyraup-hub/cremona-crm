-- Indexes for foreign-key lookups and deletes in the durable Lucca workflow.
CREATE INDEX IF NOT EXISTS idx_lucca_qualifications_first_message
  ON public.lucca_qualifications(first_message_id)
  WHERE first_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lucca_qualifications_last_processed_message
  ON public.lucca_qualifications(last_processed_message_id)
  WHERE last_processed_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lucca_qualifications_human_taken_over_by
  ON public.lucca_qualifications(human_taken_over_by)
  WHERE human_taken_over_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lucca_qualifications_resumed_by
  ON public.lucca_qualifications(resumed_by)
  WHERE resumed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lucca_qualifications_attribution_submission
  ON public.lucca_qualifications(attribution_submission_id)
  WHERE attribution_submission_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lucca_jobs_workspace
  ON public.lucca_jobs(workspace_id);

CREATE INDEX IF NOT EXISTS idx_lucca_jobs_contact
  ON public.lucca_jobs(contact_id);

CREATE INDEX IF NOT EXISTS idx_lucca_jobs_message
  ON public.lucca_jobs(message_id)
  WHERE message_id IS NOT NULL;
