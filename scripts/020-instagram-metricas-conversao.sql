-- Métricas de conversão por post do Instagram (visitas ao perfil, seguidores, reposts).
-- profile_visits e follows não são retornados para Reels; ficam null nesses casos.
alter table public.instagram_midia add column if not exists visitas_perfil integer;
alter table public.instagram_midia add column if not exists seguidores integer;
alter table public.instagram_midia add column if not exists reposts integer;
