-- Create a storage bucket for documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the documents bucket
UPDATE storage.buckets
SET public = true
WHERE id = 'documents';

-- Create policy to allow authenticated users to upload documents
CREATE POLICY "Allow authenticated users to upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Create policy to allow authenticated users to select documents
CREATE POLICY "Allow authenticated users to select documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Create policy to allow authenticated users to update their own documents
CREATE POLICY "Allow authenticated users to update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND owner = auth.uid());

-- Create policy to allow authenticated users to delete their own documents
CREATE POLICY "Allow authenticated users to delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND owner = auth.uid());

-- Create policy to allow public access to documents
CREATE POLICY "Allow public access to documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Add document_url column to transactions table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'transactions' 
                AND column_name = 'document_url') THEN
    ALTER TABLE public.transactions ADD COLUMN document_url TEXT;
  END IF;
END
$$;