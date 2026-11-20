begin;

alter table public.bands add column page_published boolean not null default true;
alter table public.bands alter column page_published set default false;

create function public.lock_artist_identity() returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.name, new.slug) is distinct from (old.name, old.slug) then
    raise exception 'Artist names and public addresses are locked.';
  end if;
  return new;
end $$;
create trigger studio_locked_artist before update of name, slug on public.bands
for each row execute function public.lock_artist_identity();

-- Only the identity is created at setup. An unpublished artist can still send chats.
create table public.studio_drafts (
  kind text not null check (kind in ('artist','venue','event')),
  entity_id uuid not null,
  band_id uuid generated always as (case when kind='artist' then entity_id end) stored references public.bands on delete cascade,
  venue_id uuid generated always as (case when kind='venue' then entity_id end) stored references public.venues on delete cascade,
  event_id uuid generated always as (case when kind='event' then entity_id end) stored references public.events on delete cascade,
  revision bigint not null default 0,
  changes jsonb not null default '{}' check (jsonb_typeof(changes)='object' and octet_length(changes::text)<=1048576),
  updated_at timestamptz not null default now(),
  primary key(kind,entity_id)
);
create function public.studio_owner(k text, entity uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and case k
 when 'artist' then exists(select from public.bands where id=entity and user_id=auth.uid() and is_active)
 when 'venue' then exists(select from public.venues where id=entity and claimed_by_user_id=auth.uid() and is_active)
 when 'event' then exists(select from public.events e join public.venues v on v.id=e.venue_id where e.id=entity and v.claimed_by_user_id=auth.uid() and v.is_active)
 else false end
$$;
alter table public.studio_drafts enable row level security;
revoke all on public.studio_drafts from public,anon,authenticated;
grant select on public.studio_drafts to authenticated;
create policy "Studio owners read drafts" on public.studio_drafts for select to authenticated using(public.studio_owner(kind,entity_id));

create function public.write_studio(k text, entity uuid, expected bigint, operation text, payload jsonb default '{}')
returns bigint language plpgsql security definer set search_path='' as $$
declare
 d public.studio_drafts; f jsonb; a public.bands; v public.venues; e public.events;
 genre uuid;
begin
 if not public.studio_owner(k,entity) then raise exception 'Only the profile owner can edit this page.'; end if;
 insert into public.studio_drafts(kind,entity_id) values(k,entity) on conflict do nothing;
 select * into strict d from public.studio_drafts where kind=k and entity_id=entity for update;
 if expected is distinct from d.revision then raise exception 'This draft changed in another session. Reload to review it.'; end if;
 if operation='save' then
   if jsonb_typeof(payload) is distinct from 'object' or payload - array['fields','look','genres','lyrics','shows','blocks'] <> '{}' then raise exception 'Invalid draft.'; end if;
   update public.studio_drafts set changes=payload, revision=revision+1, updated_at=now() where kind=k and entity_id=entity;
   return expected+1;
 elsif operation not in ('publish','discard') or operation is null then raise exception 'Unknown Studio action.';
 end if;
 if operation='publish' then
   f:=coalesce(d.changes->'fields','{}');
   select coalesce(jsonb_object_agg(key,case when value='""'::jsonb then 'null'::jsonb else value end),'{}') into f from jsonb_each(f);
   if k='artist' then
     select * into strict a from public.bands where id=entity and user_id=auth.uid() for update;
     if f ? 'members' then
       f:=jsonb_set(f,'{members}',to_jsonb(regexp_split_to_array(coalesce(f->>'members',''), E'\n')::text[]));
       if f->'members'='[""]' then f:=jsonb_set(f,'{members}','[]'); end if;
     end if;
     a:=jsonb_populate_record(a,f);
     update public.bands set tagline=a.tagline, description=a.description, location_city=a.location_city, location_state=a.location_state,
       touring_radius=a.touring_radius,artist_type=a.artist_type,set_length_min=a.set_length_min,members=a.members,
       featured_track_url=a.featured_track_url,spotify_url=a.spotify_url,apple_music_url=a.apple_music_url,youtube_url=a.youtube_url,
       soundcloud_url=a.soundcloud_url,bandcamp_url=a.bandcamp_url,website_url=a.website_url,instagram_url=a.instagram_url,
       facebook_url=a.facebook_url,twitter_url=a.twitter_url,tiktok_url=a.tiktok_url,
       profile_theme=coalesce(profile_theme,'{}') || jsonb_build_object('studio',coalesce(profile_theme->'studio','{}') || coalesce(d.changes->'look','{}')),
       page_published=true where id=entity;
     if d.changes ? 'lyrics' then
       delete from public.band_lyrics where band_id=entity;
       insert into public.band_lyrics(id,band_id,title,body,sort_order)
       select (j->>'id')::uuid,entity,j->>'title',j->>'body',n-1 from jsonb_array_elements(d.changes->'lyrics') with ordinality t(j,n);
     end if;
     if d.changes ? 'shows' then
       delete from public.band_show_dates where band_id=entity;
       insert into public.band_show_dates(id,band_id,show_date,venue_name,city,state,ticket_url)
       select (j->>'id')::uuid,entity,(j->>'date')::date,j->>'venue',j->>'city',j->>'state',nullif(j->>'url','') from jsonb_array_elements(d.changes->'shows') j;
     end if;
   elsif k='venue' then
     select * into strict v from public.venues where id=entity and claimed_by_user_id=auth.uid() for update;
     v:=jsonb_populate_record(v,f);
     update public.venues set description=v.description, location_city=v.location_city, location_state=v.location_state,
       location_address=v.location_address,location_zip=v.location_zip,capacity=v.capacity,age_requirement=v.age_requirement,
       booking_email=v.booking_email,phone=v.phone,website_url=v.website_url,instagram_url=v.instagram_url,default_bill_cap=v.default_bill_cap,
       profile_theme=coalesce(profile_theme,'{}') || jsonb_build_object('studio',coalesce(profile_theme->'studio','{}') || coalesce(d.changes->'look','{}')) where id=entity;
   else
     select * into strict e from public.events where id=entity for update;
     if f ? 'event_date' and (f->>'event_date')::date<>e.event_date and exists(select from public.venue_unavailable_dates where venue_id=e.venue_id and unavailable_date=(f->>'event_date')::date) then raise exception 'This date is marked unavailable.'; end if;
     e:=jsonb_populate_record(e,f);
     if e.attendee_capacity<1 or e.needed_artist_count<1 or nullif(trim(e.title),'') is null then raise exception 'Check the event title and capacity.'; end if;
     update public.events set title=e.title,description=e.description,event_date=e.event_date,start_time=e.start_time,
       attendee_capacity=e.attendee_capacity,needed_artist_count=e.needed_artist_count,artist_need_description=e.artist_need_description,
       is_public=e.is_public,page_layout=coalesce(page_layout,'{}') || jsonb_build_object('studio',coalesce(page_layout->'studio','{}') || coalesce(d.changes->'look','{}')) where id=entity;
   end if;
   if d.changes ? 'genres' then
     if k='artist' then delete from public.band_genres where band_id=entity;
     elsif k='venue' then delete from public.venue_genres where venue_id=entity;
     else delete from public.event_genres where event_id=entity; end if;
     for genre in select distinct value::uuid from jsonb_array_elements_text(d.changes->'genres') loop
       if k='artist' then insert into public.band_genres(band_id,genre_id) values(entity,genre);
       elsif k='venue' then insert into public.venue_genres(venue_id,genre_id) values(entity,genre);
       else insert into public.event_genres(event_id,genre_id) values(entity,genre); end if;
     end loop;
   end if;
   if k in ('artist','venue') and d.changes ? 'blocks' then
     delete from public.profile_page_blocks where (k='artist' and band_id=entity) or (k='venue' and venue_id=entity);
     insert into public.profile_page_blocks(id,band_id,venue_id,block_type,schema_version,content,settings)
       select (j->>'id')::uuid,case when k='artist' then entity end,case when k='venue' then entity end,
       j->>'blockType',1,j->'content',j->'settings' from jsonb_array_elements(d.changes->'blocks') j;
   end if;
 end if;
 update public.studio_drafts set changes='{}',revision=revision+1,updated_at=now() where kind=k and entity_id=entity;
 return expected+1;
end $$;

revoke all on function public.write_studio(text,uuid,bigint,text,jsonb) from public,anon;
grant execute on function public.write_studio(text,uuid,bigint,text,jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('studio-media','studio-media',false,5242880,array['image/jpeg','image/png','image/webp']);
-- Immutable object names begin with the entity kind and ID. Only the owning page
-- can publish a reference to its own files. Private event membership follows event RLS.
create function public.studio_media_visible(path text) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare k text:=split_part(path,'/',1); entity uuid; doc jsonb; reference text:='/studio-media/'||path;
begin
 if path !~ '^(artist|venue|event)/[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|png|webp)$' then return false; end if;
 entity:=split_part(path,'/',2)::uuid;
 if public.studio_owner(k,entity) then return true; end if;
 if k='artist' then select profile_theme->'studio' into doc from public.bands where id=entity and is_active and page_published;
 elsif k='venue' then select profile_theme->'studio' into doc from public.venues where id=entity and is_active and not is_unlisted;
 else select page_layout->'studio' into doc from public.events where id=entity; end if;
 if doc is null then return false; end if;
 return exists(select from jsonb_each_text(doc) t where t.value=reference)
 or exists(select from public.profile_page_blocks b cross join lateral jsonb_path_query(b.content,'$.** ? (@.type() == "string")') x
 where ((k='artist' and b.band_id=entity) or (k='venue' and b.venue_id=entity)) and x=to_jsonb(reference));
exception when invalid_text_representation then return false;
end $$;
create policy "Studio versioned media read" on storage.objects for select to anon,authenticated using(bucket_id='studio-media' and public.studio_media_visible(name));
create policy "Studio owner uploads" on storage.objects for insert to authenticated with check(bucket_id='studio-media'
 and name ~ '^(artist|venue|event)/[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|png|webp)$'
 and public.studio_owner(split_part(name,'/',1),split_part(name,'/',2)::uuid));
-- Creation is idempotent for a retried form submission. Only the locked identity
-- enters public operational records before the first explicit page publication.
create function public.create_studio_artist(entity uuid, artist_name text, payload jsonb) returns text
language plpgsql security definer set search_path='' as $$
declare address text; base text; counter int:=0;
begin
 if auth.uid() is null or nullif(trim(artist_name),'') is null or length(artist_name)>160 then raise exception 'Enter an artist name.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(entity::text,0));
 select slug into address from public.bands where id=entity and user_id=auth.uid();
 if found then return address; end if;
 base:=trim(both '-' from regexp_replace(lower(trim(artist_name)),'[^a-z0-9]+','-','g'));
 if base='' then base:='artist'; end if;
 loop
   address:=base||case when counter=0 then '' else '-'||(counter+1)::text end;
   insert into public.bands(id,user_id,name,slug,page_published) values(entity,auth.uid(),trim(artist_name),address,false)
     on conflict(slug) do nothing;
   exit when found;
   counter:=counter+1;
 end loop;
 insert into public.studio_drafts(kind,entity_id,revision,changes) values('artist',entity,1,payload);
 update public.profiles set primary_role=case when primary_role='venue' then 'both' else coalesce(primary_role,'artist') end where id=auth.uid();
 return address;
end $$;
revoke all on function public.create_studio_artist(uuid,text,jsonb) from public,anon;
grant execute on function public.create_studio_artist(uuid,text,jsonb) to authenticated;
commit;
