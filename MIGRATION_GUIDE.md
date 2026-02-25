# Migration Guide: Unify Generation System & Fix Image Storage

## Overview

This migration performs two critical P0 architecture improvements:

1. **Unify Generation System**: Merges `single_generations` table into `generations` table with a `generation_type` field
2. **Fix Image Storage**: Creates independent `generated_images` table to replace JSON array storage

## Pre-Migration Checklist

- [ ] Backup database: `pg_dump -U user -d database > backup_$(date +%Y%m%d).sql`
- [ ] Stop application servers to prevent writes during migration
- [ ] Verify disk space (migration creates new rows, ~2x current size temporarily)
- [ ] Test migration on staging environment first

## Migration Steps

### 1. Apply Prisma Schema Changes

```bash
# Backup current schema
cp prisma/schema.prisma prisma/schema.prisma.backup

# Replace with new schema
cp prisma/schema-new.prisma prisma/schema.prisma

# Generate Prisma client
pnpm prisma generate
```

### 2. Run Migration

```bash
# Apply migration
psql -U your_user -d your_database -f prisma/migrations/20260225000000_unify_generation_system/migration.sql

# Verify migration
psql -U your_user -d your_database -c "SELECT COUNT(*) FROM generated_images;"
psql -U your_user -d your_database -c "SELECT generation_type, COUNT(*) FROM generations GROUP BY generation_type;"
```

### 3. Verify Data Integrity

```sql
-- Check that all single_generations were migrated
SELECT COUNT(*) FROM generations WHERE generation_type = 'single';
-- Should match original single_generations count

-- Check that all images were migrated
SELECT
  g.id,
  g.generation_type,
  COUNT(gi.id) as image_count
FROM generations g
LEFT JOIN generated_images gi ON gi.generation_id = g.id
GROUP BY g.id, g.generation_type
HAVING COUNT(gi.id) = 0;
-- Should return 0 rows (all generations have images)

-- Check image type distribution
SELECT image_type, COUNT(*) FROM generated_images GROUP BY image_type;
```

### 4. Deploy Application Updates

```bash
# Deploy updated API routes and frontend code
pnpm build
pnpm pm2:restart
```

## Rollback Procedure

If issues occur, rollback using:

```bash
# Stop application
pnpm pm2:stop

# Restore schema
cp prisma/schema.prisma.backup prisma/schema.prisma

# Run rollback script
psql -U your_user -d your_database -f prisma/migrations/20260225000000_unify_generation_system/rollback.sql

# Regenerate Prisma client
pnpm prisma generate

# Restart application
pnpm pm2:start
```

## Post-Migration Tasks

### Immediate (Day 1)
- [ ] Monitor error logs for migration-related issues
- [ ] Verify user-facing features work correctly
- [ ] Check generation flow (both batch and single)
- [ ] Verify dashboard displays correctly

### Short-term (Week 1)
- [ ] Monitor database performance (query times, index usage)
- [ ] Collect user feedback on any issues
- [ ] Plan removal of deprecated JSON columns after 2 weeks

### Long-term (Month 1)
- [ ] Remove deprecated columns (`preview_images`, `high_res_images`)
- [ ] Update analytics queries to use `generated_images` table
- [ ] Optimize indexes based on query patterns

## Breaking Changes

### API Response Format Changes

**Before:**
```json
{
  "id": "gen_123",
  "preview_images": ["url1", "url2", "url3"],
  "high_res_images": ["url4", "url5", "url6"]
}
```

**After:**
```json
{
  "id": "gen_123",
  "generated_images": [
    {
      "id": "img_1",
      "image_url": "url1",
      "image_type": "preview",
      "image_index": 0
    },
    {
      "id": "img_2",
      "image_url": "url2",
      "image_type": "preview",
      "image_index": 1
    }
  ]
}
```

**Backward Compatibility**: API routes will continue to return both formats during transition period.

### Database Schema Changes

1. **New Tables**:
   - `generated_images` - Independent image storage

2. **Modified Tables**:
   - `generations.project_id` - Now nullable
   - `generations.generation_type` - New field (batch/single)
   - `generations.prompt` - New field for single generations
   - `generations.original_image` - New field for single generations
   - `generations.settings` - New field for single generations

3. **Deprecated Tables**:
   - `single_generations` - Dropped after migration

4. **Deprecated Columns** (to be removed in future):
   - `generations.preview_images` - Use `generated_images` table
   - `generations.high_res_images` - Use `generated_images` table

## Performance Impact

- **Migration Duration**: ~5-10 minutes for 10k generations
- **Downtime Required**: Yes, 5-15 minutes recommended
- **Disk Space**: Temporary increase of ~50% during migration
- **Query Performance**: Improved for single-image operations, similar for batch operations

## Support

If you encounter issues:
1. Check logs: `pnpm pm2:logs`
2. Verify database state with verification queries above
3. Rollback if critical issues occur
4. Contact development team with error details
