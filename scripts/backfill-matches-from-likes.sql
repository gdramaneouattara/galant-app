-- Backfill des matchs manquants depuis les likes réciproques.
-- Sécurisé: n'écrase rien, n'ajoute que les paires absentes.
-- Pré-requis: la contrainte unique (user_one_id, user_two_id) existe sur public.matches.

insert into public.matches (user_one_id, user_two_id, status, created_at)
select
  least(l1.liker_id, l1.liked_id) as user_one_id,
  greatest(l1.liker_id, l1.liked_id) as user_two_id,
  'ACTIVE' as status,
  greatest(l1.created_at, l2.created_at) as created_at
from public.likes l1
join public.likes l2
  on l1.liker_id = l2.liked_id
 and l1.liked_id = l2.liker_id
where l1.liker_id <> l1.liked_id
on conflict (user_one_id, user_two_id) do nothing;

-- Vérification rapide
-- Nombre de likes réciproques (paires logiques):
-- select count(*) from (
--   select least(l1.liker_id, l1.liked_id) as u1, greatest(l1.liker_id, l1.liked_id) as u2
--   from public.likes l1
--   join public.likes l2 on l1.liker_id = l2.liked_id and l1.liked_id = l2.liker_id
--   where l1.liker_id <> l1.liked_id
--   group by 1,2
-- ) t;
--
-- Nombre total de matchs:
-- select count(*) from public.matches;
