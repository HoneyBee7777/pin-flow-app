-- CopeCart-Abo-Anbindung für Pin-Flow
-- ---------------------------------------------------------------------------
-- Einmalig im Supabase-SQL-Editor ausführen (Projekt Zürich).
-- Legt zwei Tabellen an:
--   abo_status      – pro Nutzer: ist der Zugang aktiv, und bis wann?
--   copecart_events – Rohprotokoll aller eingehenden IPNs (nur Service-Role).
--
-- Zugriffsregel (identisch in middleware.ts umgesetzt) — allein zugang_bis
-- entscheidet, `status` ist das lesbare Etikett dazu:
--   Zugang frei, wenn  zugang_bis IS NULL  ODER  zugang_bis > now()
--   Kein Datensatz vorhanden = Zugang frei (Bestandskonten, Admin, Tester).
--
-- Dadurch behält eine gekündigte Nutzerin ihren Zugang bis zum Kündigungsdatum
-- (status 'gekuendigt', zugang_bis in der Zukunft), während eine Rückerstattung
-- sofort greift (status 'gesperrt', zugang_bis = Zeitpunkt der Rückerstattung).

-- ---------------------------------------------------------------------------
-- 1. abo_status
-- ---------------------------------------------------------------------------
create table if not exists public.abo_status (
  user_id                   uuid primary key references auth.users(id) on delete cascade,
  email                     text not null,

  -- Herkunft aus CopeCart
  copecart_buyer_id         text,
  copecart_order_id         text,
  product_id                text,
  product_name              text,
  payment_plan              text,          -- z. B. 'abonnement'
  frequency                 text,          -- 'half_yearly' | 'yearly'

  -- Zugangssteuerung
  status                    text not null default 'aktiv'
                              check (status in ('aktiv', 'gekuendigt', 'gesperrt')),
  zugang_bis                timestamptz,   -- NULL = unbefristet aktiv
  gekuendigt_zum            date,          -- aus is_cancelled_for
  naechste_zahlung_am       timestamptz,

  -- Zahlungsprobleme (sperren NICHT, nur Vermerk für den Kundenservice)
  zahlung_fehlgeschlagen_am timestamptz,
  zahlung_fehlversuche      integer not null default 0,
  interner_hinweis          text,

  -- Protokoll
  letztes_event             text,
  letztes_event_am          timestamptz,
  erstellt_am               timestamptz not null default now(),
  aktualisiert_am           timestamptz not null default now()
);

create index if not exists abo_status_email_idx      on public.abo_status (email);
create index if not exists abo_status_order_id_idx   on public.abo_status (copecart_order_id);

comment on table public.abo_status is
  'Abo-/Zugangsstatus je Nutzer, gepflegt vom CopeCart-IPN-Webhook (/api/webhooks/copecart).';
comment on column public.abo_status.zugang_bis is
  'NULL = unbefristet. Bei Kündigung auf das Ende von is_cancelled_for gesetzt, damit der Zugang erst zu diesem Datum endet.';

-- aktualisiert_am automatisch mitführen
create or replace function public.abo_status_touch()
returns trigger
language plpgsql
as $$
begin
  new.aktualisiert_am := now();
  return new;
end;
$$;

drop trigger if exists abo_status_touch_trg on public.abo_status;
create trigger abo_status_touch_trg
  before update on public.abo_status
  for each row execute function public.abo_status_touch();

-- RLS: Nutzer dürfen ausschließlich ihre eigene Zeile LESEN.
-- Schreiben passiert nur über den Service-Role-Key (umgeht RLS).
alter table public.abo_status enable row level security;

drop policy if exists "abo_status_select_own" on public.abo_status;
create policy "abo_status_select_own"
  on public.abo_status
  for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. copecart_events (Rohprotokoll)
-- ---------------------------------------------------------------------------
create table if not exists public.copecart_events (
  id             bigserial primary key,
  event_type     text,
  order_id       text,
  buyer_email    text,
  payload        jsonb not null,
  ergebnis       text,          -- 'ok' | 'fehler' | 'ignoriert'
  hinweis        text,          -- Klartext, z. B. 'Zugangsmail versendet'
  fehler         text,          -- nur bei ergebnis = 'fehler'
  empfangen_am   timestamptz not null default now()
);

create index if not exists copecart_events_empfangen_idx on public.copecart_events (empfangen_am desc);
create index if not exists copecart_events_order_idx     on public.copecart_events (order_id);

comment on table public.copecart_events is
  'Append-only Protokoll aller eingehenden CopeCart-IPNs. Nur über den Service-Role-Key lesbar.';

-- RLS an, aber bewusst KEINE Policy: damit kommt niemand außer der
-- Service-Role (Webhook) an die Rohdaten.
alter table public.copecart_events enable row level security;

-- ---------------------------------------------------------------------------
-- 3. zugang_tokens (Zugangslinks mit eigener Gültigkeit)
-- ---------------------------------------------------------------------------
-- Warum ein eigenes Token statt des Supabase-Links: Supabase deckelt die
-- Gültigkeit von E-Mail-Links bei 24 Stunden (Email OTP Expiry, max. 86400 s).
-- Für 72 Stunden brauchen wir eine eigene Ablaufsteuerung. Der Supabase-Link
-- wird erst im Moment des Klicks erzeugt und Sekunden später eingelöst — seine
-- kurze Gültigkeit spielt damit keine Rolle mehr.
create table if not exists public.zugang_tokens (
  id                    bigserial primary key,
  user_id               uuid not null references auth.users(id) on delete cascade,
  email                 text not null,
  -- Nur der SHA-256-Hash wird gespeichert, nie das Token selbst.
  token_hash            text not null unique,
  ablauf_am             timestamptz not null,
  eingeloest_am         timestamptz,      -- erster Klick
  zuletzt_eingeloest_am timestamptz,      -- letzter Klick
  einloesungen          integer not null default 0,
  ungueltig_ab          timestamptz,      -- gesetzt, sobald das Passwort steht
  erstellt_am           timestamptz not null default now()
);

create index if not exists zugang_tokens_user_idx   on public.zugang_tokens (user_id);
create index if not exists zugang_tokens_ablauf_idx on public.zugang_tokens (ablauf_am);

comment on table public.zugang_tokens is
  'Zugangslinks aus der CopeCart-Willkommensmail. Innerhalb der Gültigkeit mehrfach einlösbar (E-Mail-Scanner rufen Links vorab auf), entwertet sobald das Passwort gesetzt ist.';

-- RLS an, bewusst KEINE Policy: nur die Service-Role kommt an die Tokens.
alter table public.zugang_tokens enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Optional: Bestandskonten explizit freischalten
-- ---------------------------------------------------------------------------
-- Nicht nötig für den Betrieb (ohne Zeile ist der Zugang ohnehin frei), aber
-- praktisch, wenn du den Status aller Konten an einer Stelle sehen möchtest:
--
--   insert into public.abo_status (user_id, email, status, interner_hinweis)
--   select id, email, 'aktiv', 'Bestandskonto vor CopeCart-Anbindung'
--   from auth.users
--   on conflict (user_id) do nothing;
