-- Disposable integration fixtures. Run on a staging or local project with the Studio migrations applied.
begin;
select set_config('test.owner',gen_random_uuid()::text,true),
       set_config('test.artist',gen_random_uuid()::text,true),
       set_config('test.venue',gen_random_uuid()::text,true),
       set_config('test.event',gen_random_uuid()::text,true);
insert into auth.users(id,email) values(current_setting('test.owner')::uuid,current_setting('test.owner')||'@example.invalid');
insert into public.venues(id,name,slug,location_city,location_state,claimed_by_user_id)
values(current_setting('test.venue')::uuid,'Studio fixture',current_setting('test.venue'),'Reno','NV',current_setting('test.owner')::uuid);
insert into public.events(id,venue_id,created_by_user_id,title,slug,event_date,start_time,description,artist_need_description,attendee_capacity,needed_artist_count)
values(current_setting('test.event')::uuid,current_setting('test.venue')::uuid,current_setting('test.owner')::uuid,'Studio fixture',current_setting('test.event'),current_date+30,'20:00','Original','',60,1);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
do $$
declare a uuid:=current_setting('test.artist')::uuid; v uuid:=current_setting('test.venue')::uuid; e uuid:=current_setting('test.event')::uuid;
address text; first_patch jsonb; asset text:='artist/'||a||'/'||gen_random_uuid()||'.jpg';
begin
 first_patch:=jsonb_build_object('fields',jsonb_build_object('tagline','Private line'),'look',jsonb_build_object('cover','/studio-media/'||asset));
 address:=public.create_studio_artist(a,'Studio fixture',first_patch);
 if public.create_studio_artist(a,'Studio fixture',first_patch)<>address
    or not exists(select from public.bands where id=a and not page_published and tagline is null)
    or not exists(select from public.studio_drafts where entity_id=a and revision=1 and changes=first_patch)
    or exists(select from public.search_artist_directory() where band_id=a) then raise exception 'Private setup failed'; end if;
 begin
   perform public.write_studio('artist',a,0,'save','{}');
   raise exception 'Stale writer accepted';
 exception when raise_exception then if sqlerrm not like 'This draft changed%' then raise; end if; end;
 if public.write_studio('artist',a,1,'publish')<>2 then raise exception 'Artist revision failed'; end if;
 if not exists(select from public.bands where id=a and page_published and tagline='Private line' and cover_photo_url='/studio-media/'||asset) then raise exception 'Artist publish failed'; end if;
 perform public.write_studio('artist',a,2,'save','{"fields":{"tagline":"New version"}}');
 if not exists(select from public.bands where id=a and tagline='Private line') then raise exception 'Draft replaced live data'; end if;
 perform public.write_studio('artist',a,3,'discard');
 if not exists(select from public.studio_drafts where entity_id=a and changes='{}' and revision=4) then raise exception 'Discard failed'; end if;
 begin
   update public.bands set name='Changed identity' where id=a;
   raise exception 'Name was mutable';
 exception when raise_exception then if sqlerrm not like 'Artist names and public addresses%' then raise; end if; end;
 perform public.write_studio('venue',v,0,'save','{"fields":{"capacity":"81"}}');
 if exists(select from public.venues where id=v and capacity=81) then raise exception 'Venue draft leaked'; end if;
 perform public.write_studio('venue',v,1,'publish');
 if not exists(select from public.venues where id=v and capacity=81) then raise exception 'Venue publish failed'; end if;
 perform public.write_studio('event',e,0,'save','{"fields":{"description":"Updated event","is_public":"true"}}');
 if exists(select from public.events where id=e and is_public) then raise exception 'Event draft leaked'; end if;
 perform public.write_studio('event',e,1,'publish');
 if not exists(select from public.events where id=e and is_public and description='Updated event') then raise exception 'Event publish failed'; end if;
 perform set_config('test.asset',asset,true);
end $$;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
do $$
begin
 if exists(select from public.studio_drafts where entity_id in (current_setting('test.artist')::uuid,current_setting('test.venue')::uuid,current_setting('test.event')::uuid))
   then raise exception 'Another account could read a draft'; end if;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$
begin
 if not public.studio_media_visible(current_setting('test.asset')) or public.studio_media_visible('artist/'||current_setting('test.artist')||'/'||gen_random_uuid()||'.jpg') then raise exception 'Incorrect public photo access'; end if;
end $$;
rollback;
