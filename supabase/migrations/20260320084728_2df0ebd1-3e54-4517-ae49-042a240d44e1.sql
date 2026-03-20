ALTER TABLE public.collection_items 
  ADD COLUMN grading_company text DEFAULT null,
  ADD COLUMN grading_value text DEFAULT null;