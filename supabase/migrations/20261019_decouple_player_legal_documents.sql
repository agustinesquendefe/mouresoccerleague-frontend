alter table public.player_legal_documents
  add column if not exists document_type text;

update public.player_legal_documents as player_document
set document_type = legal_document.type::text
from public.legal_documents as legal_document
where player_document.legal_document_id = legal_document.id
  and player_document.document_type is null;

alter table public.player_legal_documents
  alter column document_type set not null,
  alter column legal_document_id drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'player_legal_documents_document_type_check'
      and conrelid = 'public.player_legal_documents'::regclass
  ) then
    alter table public.player_legal_documents
      add constraint player_legal_documents_document_type_check
      check (document_type in ('tutor', 'participant'));
  end if;
end
$$;

comment on column public.player_legal_documents.document_type is
  'Type of signed document uploaded for the player; independent from legal_documents templates.';
