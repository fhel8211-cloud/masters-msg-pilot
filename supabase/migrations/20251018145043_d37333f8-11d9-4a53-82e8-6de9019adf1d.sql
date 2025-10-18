-- Create leads table for storing extracted phone numbers and generated messages
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  name TEXT,
  message TEXT,
  wa_link TEXT,
  status TEXT DEFAULT 'unsent' CHECK (status IN ('unsent', 'sent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries on status
CREATE INDEX idx_leads_status ON public.leads(status);

-- Create index for faster queries on created_at
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since this is a personal tool)
CREATE POLICY "Allow all operations on leads"
  ON public.leads
  FOR ALL
  USING (true)
  WITH CHECK (true);