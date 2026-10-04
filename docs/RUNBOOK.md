# Operations & Free-Tier Maintenance Runbook

This runbook provides the Chairman and maintainers with instructions for operating within the **zero-cost constraints** of the system using Supabase Free Tier.

---

## 1. Supabase Free Tier Limits & Mitigations

| Constraint | Limit | System Mitigation Strategy |
|---|---|---|
| **PostgreSQL Database** | 500 MB | Normalized schema, Integer paise instead of float, indexed keys, lean rows. Sufficient for years of residential society operations. |
| **File Storage** | 1 GB | Client-side compression pipeline enforces photos to 200–400 KB before upload. Old proofs can be archived annually. |
| **Inactivity Pause** | Pauses after 7 days idle | Automated GitHub Actions workflow (`.github/workflows/keep-alive.yml`) runs every 5 days to hit `/api/v1/health` and keep the project active. |
| **Automated Backups** | Not available on free tier | Weekly offline `pg_dump` script (detailed below) taken by the Chairman/Admin. |

---

## 2. Weekly Offline Database Backup (pg_dump)

Run this command once a week to download an immutable snapshot of your society database:

### Command (PowerShell / Bash):
```bash
pg_dump "postgresql://postgres:[YOUR_SUPABASE_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres" \
  -F c -b -v -f "society_backup_$(date +%Y%m%d).dump"
```

### To Restore from a Backup:
```bash
pg_restore -h db.[YOUR_PROJECT_REF].supabase.co -U postgres -d postgres -v "society_backup_YYYYMMDD.dump"
```

---

## 3. Connecting Backend to Live Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **Project Settings** $\rightarrow$ **Database** $\rightarrow$ **Connection string** $\rightarrow$ **URI**.
3. In `backend/.env`, set:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```
4. Run migrations to create all tables:
   ```bash
   npm --prefix backend run db:migrate
   ```
5. Optionally seed the initial Chairman and sample structure:
   ```bash
   npm --prefix backend run db:seed
   ```

---

## 4. Supabase Storage Setup (Private Vault)

1. Go to **Storage** in the Supabase Dashboard.
2. Create a new bucket named: `society-private-vault`.
3. Set bucket privacy to **Private** (Public: Off).
4. Copy your project's **Service Role Key** from **Settings** $\rightarrow$ **API** $\rightarrow$ `service_role`.
5. In `backend/.env`, set:
   ```env
   SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
   SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
   SUPABASE_STORAGE_BUCKET=society-private-vault
   ```
