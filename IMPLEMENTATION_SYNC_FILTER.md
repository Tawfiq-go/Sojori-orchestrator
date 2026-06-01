# Implementation: Owner Filter with Integrated Sync Buttons

## Summary

Successfully implemented an enhanced owner filter system that integrates synchronization buttons directly into the filter UI, replacing the previous separate button approach.

## What Changed

### Previous Behavior
- Button appeared in page header only when viewing admin template
- Showed modal dialog to choose between "current owner" or "all owners"
- Not intuitive for users

### New Behavior
- Filter dropdown now shows:
  1. **"Admin (voir template admin)"** - View admin template (no sync button)
  2. **"Tous les PMs"** - View admin template with "Synchroniser tous les PMs" button
  3. **Individual PM entries** - View PM's config with "Synchroniser ce PM" button
- Sync buttons appear dynamically based on selection
- More intuitive workflow

## Files Created

### `/Users/gouacht/Sojori-orchestrator/src/features/taskHub/components/OwnerConfigScopeBarWithSync.tsx`
New component that replaces `OwnerConfigScopeBar` with integrated sync functionality.

**Key Features:**
- Autocomplete filter with 3 types of options:
  - `ADMIN_SENTINEL` - Admin template view
  - `ALL_PMS_SENTINEL` - Triggers "sync all" mode
  - Individual owner objects - Triggers "sync one" mode
- Conditional button rendering based on selection
- Loading states during sync operations
- Toast notifications for success/error

## Files Modified

### `/Users/gouacht/Sojori-orchestrator/src/pages/TasksConfigFulltaskPage.tsx`
**Changes:**
1. Removed import: `ApplyAdminConfigToOwnersButton`
2. Added import: `OwnerConfigScopeBarWithSync`
3. Replaced `handleApplyAdminToOwners` with two separate handlers:
   - `handleSyncToOwner(targetOwnerId, targetOwnerName)` - Sync to one PM
   - `handleSyncToAllOwners()` - Sync to all PMs
4. Removed button from page header
5. Replaced `<OwnerConfigScopeBar>` with `<OwnerConfigScopeBarWithSync>` with sync callbacks

### `/Users/gouacht/Sojori-orchestrator/src/pages/TasksOrchestrationFulltaskPage.tsx`
**Changes:**
1. Removed import: `ApplyAdminConfigToOwnersButton`
2. Added import: `OwnerConfigScopeBarWithSync`
3. Replaced `handleApplyAdminToOwners` with two separate handlers:
   - `handleSyncToOwner(targetOwnerId, targetOwnerName)` - Sync to one PM
   - `handleSyncToAllOwners()` - Sync to all PMs
4. Removed button section from JSX
5. Replaced `<OwnerConfigScopeBar>` with `<OwnerConfigScopeBarWithSync>` with sync callbacks

## User Workflow

### For Task Config Page (`/tasks/config`)

1. **Admin loads page** → Filter shows "Admin (voir template admin)" by default
   - Displays admin template configuration
   - No sync button visible

2. **Admin selects "Tous les PMs"** from filter
   - Still displays admin template
   - "Synchroniser tous les PMs" button appears
   - Click button → Copies admin config to all PMs

3. **Admin selects specific PM** (e.g., "PM X")
   - Displays PM X's current configuration
   - "Synchroniser ce PM" button appears
   - Click button → Copies admin config to PM X only

### For Orchestration Config Page (`/tasks/orchestration-config`)

Same workflow as Task Config, but synchronizes:
- Workflows
- Message catalog
- Scheduled messages
- UI list order

## Backend Endpoints Used

All endpoints were previously implemented in `/Users/gouacht/sojori-production/apps/srv-fulltask/src/routes/config.ts`:

1. `POST /api/config/task-config/copy` - Copy task config to one owner
2. `POST /api/config/task-config/copy-to-all` - Copy task config to all owners
3. `POST /api/orchestration/copy` - Copy orchestration to one owner
4. `POST /api/orchestration/copy-to-all` - Copy orchestration to all owners

## Technical Details

### Filter Selection Logic

```typescript
// Determine current selection
let currentValue;
if (!selectedOwnerId || selectedOwnerId === ORCHESTRATION_ADMIN_OWNER_ID) {
  currentValue = ADMIN_SENTINEL;
} else if (selectedOwnerId === 'ALL_PMS') {
  currentValue = ALL_PMS_SENTINEL;
} else {
  currentValue = (owners || []).find((o) => String(o?._id ?? o?.id) === String(selectedOwnerId)) || ADMIN_SENTINEL;
}
```

### Button Visibility Logic

```typescript
const showSyncAllButton = selectedOwnerId === 'ALL_PMS';
const showSyncOneButton = selectedOwnerId &&
                          selectedOwnerId !== ORCHESTRATION_ADMIN_OWNER_ID &&
                          selectedOwnerId !== 'ALL_PMS';
```

## Testing Checklist

- [x] TypeScript compilation passes without errors
- [ ] Test as Admin user on `/tasks/config`:
  - [ ] Load page → see admin template
  - [ ] Select "Tous les PMs" → see sync all button
  - [ ] Click sync all → verify all PMs receive config
  - [ ] Select specific PM → see that PM's config with sync button
  - [ ] Click sync → verify that PM receives admin config
- [ ] Test as Admin user on `/tasks/orchestration-config`:
  - [ ] Same workflow as above
- [ ] Test as Owner user:
  - [ ] Filter should show simple owner info (no filter, no sync buttons)
- [ ] Verify toast notifications appear on success/error
- [ ] Verify loading states during sync operations

## Benefits

1. **More Intuitive**: Filter clearly shows what you're viewing and what sync action is available
2. **Less Clicks**: No modal dialog needed, direct action buttons
3. **Better Visibility**: Sync buttons appear contextually based on selection
4. **Cleaner UI**: Integrated design instead of separate button in header
5. **Consistent Pattern**: Same behavior on both Task Config and Orchestration Config pages

## Notes

- The `ORCHESTRATION_ADMIN_OWNER_ID = '67f5416ff145a6002e46c2f3'` constant is used throughout
- This is a real MongoDB ObjectId representing the admin template owner
- Non-admin users (Owner role) see simplified UI without filter or sync buttons
- All sync operations use the admin template as source and copy to target PM(s)
