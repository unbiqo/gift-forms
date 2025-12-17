drop extension if exists "pg_net";


  create table "public"."campaigns" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "slug" text not null,
    "name" text not null,
    "brand_color" text default '#000000'::text,
    "welcome_message" text,
    "config" jsonb not null default '{}'::jsonb,
    "claims_count" integer default 0,
    "status" text default 'active'::text,
    "ask_custom_question" boolean default false,
    "custom_question_label" text,
    "custom_question_required" boolean default false,
    "block_duplicate_orders" boolean default false,
    "show_tiktok_field" boolean default false,
    "show_instagram_field" boolean default false,
    "show_phone_field" boolean default false,
    "require_second_consent" boolean default false,
    "second_consent_text" text,
    "email_opt_in" boolean default true,
    "email_consent_text" text,
    "link_to_store" text,
    "link_text" text,
    "terms_consent_text" text,
    "show_consent_checkbox" boolean default true,
    "restricted_countries" text,
    "shipping_zone" text,
    "max_cart_value" numeric,
    "order_limit_per_link" integer,
    "item_limit" integer default 1,
    "selected_product_ids" jsonb,
    "submit_button_text" text
      );


alter table "public"."campaigns" enable row level security;


  create table "public"."orders" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "campaign_id" uuid not null,
    "shopify_order_id" text,
    "shopify_order_number" text,
    "influencer_email" text not null,
    "influencer_handle" text,
    "influencer_name" text,
    "items" jsonb not null,
    "shipping_address" jsonb,
    "status" text default 'pending'::text
      );


alter table "public"."orders" enable row level security;

CREATE UNIQUE INDEX campaigns_pkey ON public.campaigns USING btree (id);

CREATE UNIQUE INDEX campaigns_slug_key ON public.campaigns USING btree (slug);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

alter table "public"."campaigns" add constraint "campaigns_pkey" PRIMARY KEY using index "campaigns_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."campaigns" add constraint "campaigns_slug_key" UNIQUE using index "campaigns_slug_key";

alter table "public"."campaigns" add constraint "campaigns_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'archived'::text]))) not valid;

alter table "public"."campaigns" validate constraint "campaigns_status_check";

alter table "public"."orders" add constraint "orders_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) not valid;

alter table "public"."orders" validate constraint "orders_campaign_id_fkey";

grant delete on table "public"."campaigns" to "anon";

grant insert on table "public"."campaigns" to "anon";

grant references on table "public"."campaigns" to "anon";

grant select on table "public"."campaigns" to "anon";

grant trigger on table "public"."campaigns" to "anon";

grant truncate on table "public"."campaigns" to "anon";

grant update on table "public"."campaigns" to "anon";

grant delete on table "public"."campaigns" to "authenticated";

grant insert on table "public"."campaigns" to "authenticated";

grant references on table "public"."campaigns" to "authenticated";

grant select on table "public"."campaigns" to "authenticated";

grant trigger on table "public"."campaigns" to "authenticated";

grant truncate on table "public"."campaigns" to "authenticated";

grant update on table "public"."campaigns" to "authenticated";

grant delete on table "public"."campaigns" to "service_role";

grant insert on table "public"."campaigns" to "service_role";

grant references on table "public"."campaigns" to "service_role";

grant select on table "public"."campaigns" to "service_role";

grant trigger on table "public"."campaigns" to "service_role";

grant truncate on table "public"."campaigns" to "service_role";

grant update on table "public"."campaigns" to "service_role";

grant delete on table "public"."orders" to "anon";

grant insert on table "public"."orders" to "anon";

grant references on table "public"."orders" to "anon";

grant select on table "public"."orders" to "anon";

grant trigger on table "public"."orders" to "anon";

grant truncate on table "public"."orders" to "anon";

grant update on table "public"."orders" to "anon";

grant delete on table "public"."orders" to "authenticated";

grant insert on table "public"."orders" to "authenticated";

grant references on table "public"."orders" to "authenticated";

grant select on table "public"."orders" to "authenticated";

grant trigger on table "public"."orders" to "authenticated";

grant truncate on table "public"."orders" to "authenticated";

grant update on table "public"."orders" to "authenticated";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant references on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant trigger on table "public"."orders" to "service_role";

grant truncate on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";


  create policy "Dashboard can archive campaigns"
  on "public"."campaigns"
  as permissive
  for delete
  to public
using ((auth.role() = ANY (ARRAY['anon'::text, 'service_role'::text])));



  create policy "Dashboard can manage campaigns"
  on "public"."campaigns"
  as permissive
  for insert
  to public
with check ((auth.role() = ANY (ARRAY['anon'::text, 'service_role'::text])));



  create policy "Dashboard can update campaigns"
  on "public"."campaigns"
  as permissive
  for update
  to public
using ((auth.role() = ANY (ARRAY['anon'::text, 'service_role'::text])))
with check ((auth.role() = ANY (ARRAY['anon'::text, 'service_role'::text])));



  create policy "Enable read for everyone"
  on "public"."campaigns"
  as permissive
  for select
  to public
using (true);



  create policy "Public campaigns are viewable by everyone"
  on "public"."campaigns"
  as permissive
  for select
  to public
using ((status = 'active'::text));



  create policy "Anyone can create an order"
  on "public"."orders"
  as permissive
  for insert
  to public
with check (true);



  create policy "Enable insert for orders"
  on "public"."orders"
  as permissive
  for insert
  to public
with check (true);



  create policy "Enable read for orders"
  on "public"."orders"
  as permissive
  for select
  to public
using (true);



