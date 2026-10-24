-- Aba Arquivos: data de postagem para organizar os materiais por data (como na aba Conteúdo).
ALTER TABLE public.arquivos ADD COLUMN IF NOT EXISTS data_postagem date;
