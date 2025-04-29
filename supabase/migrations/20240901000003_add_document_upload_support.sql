-- Add document_url column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS document_url TEXT;

-- Add document_url column to ci_payments table
ALTER TABLE ci_payments ADD COLUMN IF NOT EXISTS document_url TEXT;

-- Create storage bucket for transaction documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('transaction-documents', 'transaction-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy to allow authenticated users to upload
CREATE POLICY "Authenticated users can upload transaction documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'transaction-documents');

-- Set up storage policy to allow authenticated users to select their own documents
CREATE POLICY "Users can view their own transaction documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'transaction-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Set up storage policy to allow authenticated users to update their own documents
CREATE POLICY "Users can update their own transaction documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'transaction-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Set up storage policy to allow authenticated users to delete their own documents
CREATE POLICY "Users can delete their own transaction documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'transaction-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow admins to view all documents
CREATE POLICY "Admins can view all transaction documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'transaction-documents' AND 
  EXISTS (
    SELECT 1 FROM agents 
    WHERE agents.user_id = auth.uid() AND agents.role = 'admin'
  )
);
