-- Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- Create a table for long-term memory
create table if not exists public.long_term_memory (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    content text not null,
    embedding vector(1536) not null, -- 1536 for text-embedding-3-small or similar
    metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.long_term_memory enable row level security;

-- Policies
create policy "Users can view their own memory"
    on public.long_term_memory for select
    using (auth.uid() = user_id);

create policy "Users can insert their own memory"
    on public.long_term_memory for insert
    with check (auth.uid() = user_id);

create policy "Users can delete their own memory"
    on public.long_term_memory for delete
    using (auth.uid() = user_id);

-- Create an index for vector similarity search
create index on public.long_term_memory using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Function for vector search
create or replace function match_long_term_memory (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    ltm.id,
    ltm.content,
    ltm.metadata,
    1 - (ltm.embedding <=> query_embedding) as similarity
  from long_term_memory ltm
  where ltm.user_id = p_user_id
    and 1 - (ltm.embedding <=> query_embedding) > match_threshold
  order by ltm.embedding <=> query_embedding
  limit match_count;
end;
$$;
