# Critical Migration Workflow - MUST READ

## ⚠️ NEVER BREAK THESE RULES IN PRODUCTION

### The Golden Rules of Database Migrations

1. **NEVER edit migration files after they are created**
   - Once a migration file is generated, it is IMMUTABLE
   - If you need to change something, create a NEW migration

2. **NEVER modify schema.prisma without generating a migration**
   - Schema changes MUST go through the migration process
   - Always run `npx prisma migrate dev` after schema changes

3. **NEVER manually write SQL in migration files**
   - Let Prisma generate the SQL for you
   - If you need custom SQL, use a separate migration

4. **NEVER use `prisma migrate reset` in production**
   - This command DESTROYS ALL DATA
   - It's only for local development

## The Correct Workflow

### Step 1: Modify the Schema
```bash
# Edit prisma/schema.prisma with your changes
```

### Step 2: Generate Migration
```bash
npx prisma migrate dev --name descriptive-name-here
```

### Step 3: Review the Generated Migration
```bash
# Check the generated SQL in prisma/migrations/[timestamp]_[name]/migration.sql
# Make sure it's what you expect
```

### Step 4: Test Locally
```bash
# Run your application and test the changes
npm run dev
```

### Step 5: Commit BOTH Files
```bash
git add prisma/schema.prisma
git add prisma/migrations/
git commit -m "[Story] Add database migration for feature"
```

## If You Have Migration Drift (Local Dev Only)

### Option 1: Reset (DESTROYS ALL DATA)
```bash
npx prisma migrate reset --force
```

### Option 2: Baseline (Keeps Data)
```bash
# 1. Backup your data
# 2. Delete migrations folder
rm -rf prisma/migrations

# 3. Create initial migration from current schema
npx prisma migrate dev --name init

# 4. Mark as baseline (if database already has tables)
npx prisma migrate resolve --applied [migration-name]
```

## Common Mistakes That Cause Drift

### ❌ WRONG: Direct Schema Edit
```prisma
model User {
  themePreference String? // Added without migration
}
```

### ✅ CORRECT: Schema + Migration
```bash
# 1. Edit schema.prisma
# 2. Run migration
npx prisma migrate dev --name add-theme-preference
# 3. Commit both files
```

### ❌ WRONG: Edit Migration SQL
```sql
-- Manually editing this file after it's created
ALTER TABLE "User" ADD COLUMN "themePreference" TEXT;
```

### ✅ CORRECT: New Migration
```bash
# If you need to change something, create a new migration
npx prisma migrate dev --name fix-theme-preference
```

## Production Migration Checklist

Before deploying to production:

- [ ] All migrations tested locally
- [ ] No migration files were edited after creation
- [ ] Schema.prisma matches the migrations exactly
- [ ] `npx prisma migrate status` shows "Database schema is up to date!"
- [ ] All migration files are committed to git
- [ ] Backup production database before running migrations

## Emergency Recovery (Production)

If you have drift in production:

1. **DO NOT PANIC**
2. **DO NOT run `migrate reset`**
3. **Backup the database immediately**
4. **Contact senior engineer/DevOps**
5. **Consider using `prisma db pull` to sync schema with current database state**
6. **Create corrective migrations to fix the drift**

## Prevention

1. **Always follow the workflow** - No shortcuts
2. **Code review migrations** - Have someone check migration files
3. **Test in staging first** - Run migrations in staging before production
4. **Use CI/CD checks** - Add `prisma migrate status` to your CI pipeline
5. **Document changes** - Keep a migration log in your story files

## Current Issue Resolution

The current drift in the edfolio project was caused by:
1. Manual edits to migration files after application
2. Adding `themePreference` field without a migration

To fix (local dev only):
```bash
# Since this is local development, we can safely reset
npx prisma migrate reset --force

# Then properly add the theme preference field
npx prisma migrate dev --name add-user-theme-preference
```

This will:
- Drop and recreate the database
- Apply all migrations from scratch
- Add the new field with a proper migration

**Remember: This approach is ONLY safe in local development. In production, you would need a different strategy.**