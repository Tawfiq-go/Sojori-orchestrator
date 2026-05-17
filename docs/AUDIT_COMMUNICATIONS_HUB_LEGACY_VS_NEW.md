# Audit: Communications Hub - Legacy vs New Implementation

**Date:** 2026-05-16
**Author:** Claude Code Audit
**Purpose:** Document all differences between sojori-dashboard (legacy, working) and Sojori-orchestrator (new, issues)

---

## Executive Summary

The legacy Communications Hub (`sojori-dashboard`) is a fully-functional, battle-tested implementation with:
- ✅ Modern design system components
- ✅ Proper API integration with all backend services
- ✅ WebSocket real-time updates with intelligent debouncing
- ✅ Client-side filtering for instant response
- ✅ Stable layout that doesn't shift during message loading
- ✅ Staff tasks panel integration

The new implementation (`Sojori-orchestrator`) has several critical issues that need to be addressed to match the legacy functionality.

---

## 🚨 Critical Differences Found

### 1. **Staff WhatsApp Tab - Missing Features**

#### Legacy Implementation (`/sojori-dashboard`)
```javascript
// File: src/features/staffMessages/pages/StaffWhatsAppNew.jsx

✅ FEATURES:
- Fetches threads from API: /staff-whatsapp/get
- Displays staff role badges (Admin/Manager/Staff) with color coding
- Shows phone number chips for each conversation
- Shows message count badge per conversation
- Has tasks panel that slides in from right (360px width)
- Tasks panel fetches tasks for selected staff member
- Auto-loads first conversation on mount
- Proper pagination (100 initial, 25 per page)
- Client-side role filtering (admin/staff/manager/unreplied/recent)
- Search by name, phone, or role
- Message count: 50 messages per thread
```

#### New Implementation (`/Sojori-orchestrator`)
```javascript
// File: src/components/communications/StaffWhatsAppTab.tsx

❌ ISSUES:
- Uses wrong API: /ai/debug/conversations?hasReservation=false
  (This is for GUEST WhatsApp, not STAFF!)
- NO role badges displayed
- NO phone number chips
- NO message count badges
- NO tasks panel integration
- NO proper staff data mapping
- Shows "Aucune conversation staff" even when data exists
- Missing FilterBar component with role filters
- Missing ThreadListItem additional chips
- Missing staff-specific styling (ROLE_COLORS)
```

**Root Cause:** The new implementation is treating Staff WhatsApp like a subset of Guest WhatsApp instead of using the dedicated staff endpoint.

---

### 2. **API Endpoints - Mismatch**

#### Legacy Endpoints (Working)

| Tab | Endpoint | Service | Purpose |
|-----|----------|---------|---------|
| **WhatsApp (Guest)** | `GET /ai/debug/conversations` | srv-chatbot | Guest conversations |
| **Staff WhatsApp** | `GET /staff-whatsapp/get` | srv-task | Staff-to-admin messaging |
| **OTA Messages** | `GET /rentals/get-thread` | srv-reservations | Channex/RU messages |
| **Leads** | `GET /rentals/get-thread?source=lead` | srv-reservations | Pre-booking requests |
| **Reviews** | `GET /rentals/get-review` | srv-reservations | Guest reviews |

#### New Endpoints (Incorrect)

| Tab | Endpoint Used | ❌ Issue |
|-----|---------------|----------|
| **Staff WhatsApp** | `GET /ai/debug/conversations?hasReservation=false` | **WRONG API!** Should use `/staff-whatsapp/get` |

---

### 3. **Layout Architecture - Key Differences**

#### Legacy Layout Pattern
```javascript
// StaffWhatsAppLayout.jsx - Dedicated wrapper

<DashboardLayout>
  <Box sx={{ height: 'calc(100vh - 80px)' }}>
    <StaffWhatsAppLayout
      isOpen={tasksPanelOpen}
      selectedThread={selectedThread}
      onTaskClick={handleTaskClick}
    >
      {/* 2-column: Threads + Messages */}
      {/* Tasks panel slides in from right (360px) */}
    </StaffWhatsAppLayout>
  </Box>

  <TaskEditModal /> {/* For editing tasks */}
</DashboardLayout>
```

#### New Layout Pattern
```javascript
// Uses generic ChatLayout (not Staff-specific)

<ChatLayout mobileView='both'>
  <ConversationList />
  {activeConversation ? <ChatThread /> : <Placeholder />}
  {activeConversation ? <ChatAside /> : <Placeholder />}
</ChatLayout>

// ❌ NO tasks panel
// ❌ NO TaskEditModal
// ❌ Generic layout, not staff-specific
```

**Issue:** The new implementation uses a generic 3-column chat layout instead of the specialized staff layout with tasks panel.

---

### 4. **Design System Components - Missing Imports**

#### Legacy Components (Available)
```javascript
// File: src/features/communications/components/modern/index.js

import { FilterBar } from './FilterBar'
import { ThreadListItem } from './ThreadListItem'
import { MessageBubble } from './MessageBubble'
import { ThreadHeader } from './ThreadHeader'
import { EmptyState } from './EmptyState'
import { StatusChip } from './StatusChip'
```

#### Legacy Design Constants
```javascript
// File: src/features/communications/design/index.js

export const COLORS = {
  brand: { primary: '#FF6B35' }, // Sojori Orange
  platforms: {
    whatsapp: '#25D366',
    airbnb: '#FF5A5F',
    booking: '#003580'
  },
  status: { replied: '#10B981', unreplied: '#EF4444' }
}

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }
export const COMPONENT_SIZES = {
  layout: {
    sidebarWidth: '360px',
    tasksPanelWidth: '360px'
  }
}
```

#### New Implementation
```javascript
// ❌ None of these components imported
// ❌ Using basic MUI components without design system
// ❌ Inconsistent styling, no design constants
```

---

### 5. **Data Mapping - Staff Thread Structure**

#### Legacy Mapping Function
```javascript
// Maps API response to unified thread structure
function mapStaffThreadToThread(staffThread) {
  const role = staffThread.workerRole?.toLowerCase() || 'staff'
  const displayName = staffThread.workerWaName || staffThread.workerWaNumber || 'Staff'

  return {
    id: staffThread._id,
    phone: staffThread.workerWaNumber,
    guestName: displayName, // Actually staff name
    channel: 'Staff',
    messages: staffThread.messages || [],
    hasReplied: lastMsg ? !lastMsg.isIncoming : false,
    messagesCount: messages.length,

    // Staff-specific fields
    role, // 'admin' | 'staff' | 'manager'
    roleLabel: role === 'admin' ? 'Admin' : role === 'manager' ? 'Manager' : 'Staff',
    staffId: normalizeMongoId(staffThread.staffId),
    staffDoc: staffThread.staff || staffThread.staffDoc,

    reservationNumber: null // Not applicable for staff
  }
}
```

#### New Implementation
```javascript
// ❌ NO staff-specific mapping
// ❌ Treats staff conversations like guest conversations
// ❌ Missing role, roleLabel, staffId, staffDoc fields
```

---

### 6. **FilterBar - Role-Based Filtering**

#### Legacy FilterBar (Staff Mode)
```javascript
<FilterBar
  tabType="staff"  // Enables staff filters
  activeFilter={activeFilter}
  onFilterChange={handleFilterChange}
  showTitle={true}
  maxVisibleFilters={8}
/>

// Filters available:
// - 'all' - All conversations
// - 'admin' - Only admin conversations
// - 'staff' - Only staff conversations
// - 'manager' - Only manager conversations
// - 'unreplied' - Only unreplied threads
// - 'recent' - Last 24 hours only
```

#### Legacy Filter Logic
```javascript
const applyLocalFilter = (filterType, threadsList) => {
  let filtered = [...threadsList]

  if (filterType === 'admin') {
    filtered = filtered.filter(t => t.role === 'admin')
  } else if (filterType === 'staff') {
    filtered = filtered.filter(t => t.role === 'staff')
  } else if (filterType === 'manager') {
    filtered = filtered.filter(t => t.role === 'manager')
  } else if (filterType === 'unreplied') {
    filtered = filtered.filter(t => !t.hasReplied)
  } else if (filterType === 'recent') {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    filtered = filtered.filter(t => new Date(t.lastMessageTime) >= yesterday)
  }

  // Sort by most recent first
  filtered.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime))

  setThreads(filtered)
}
```

#### New Implementation
```javascript
// ❌ NO FilterBar component
// ❌ NO role-based filtering
// ❌ Basic filter only: activeFilter state but not used
```

---

### 7. **ThreadListItem - Additional Chips**

#### Legacy Implementation
```javascript
<ThreadListItem
  key={thread.id}
  thread={thread}
  isSelected={selectedThread?.id === thread.id}
  onClick={() => handleSelectThread(thread)}
  showStatus={false}
  showPlatform={false}
  additionalChips={[
    // Chip 1: Role badge
    {
      label: thread.roleLabel, // 'Admin' | 'Manager' | 'Staff'
      tooltip: `Rôle: ${thread.roleLabel}`,
      sx: {
        bgcolor: ROLE_COLORS[thread.role], // Orange/Blue/Green
        color: '#fff !important',
        fontWeight: 700,
        fontSize: '0.65rem'
      }
    },
    // Chip 2: Phone number
    {
      icon: <PhoneIcon sx={{ fontSize: 12 }} />,
      label: thread.phone,
      tooltip: `Téléphone: ${thread.phone}`,
      sx: {
        bgcolor: COLORS.background.tertiary,
        color: `${COLORS.text.secondary} !important`,
        fontFamily: 'monospace',
        fontSize: '0.65rem'
      }
    },
    // Chip 3: Message count
    {
      label: `${thread.messagesCount} msg`,
      tooltip: `${thread.messagesCount} messages`,
      sx: {
        bgcolor: alpha(SOJORI_ORANGE, 0.15),
        color: `${SOJORI_ORANGE} !important`,
        fontWeight: 600,
        fontSize: '0.65rem',
        border: `1px solid ${alpha(SOJORI_ORANGE, 0.3)}`
      }
    }
  ]}
/>
```

#### New Implementation
```javascript
<ConversationList
  conversations={formattedConversations}
  activeId={activeConversation?.phone}
  onSelect={(conv) => { ... }}
/>

// ❌ NO additional chips
// ❌ NO role badge
// ❌ NO phone number chip
// ❌ NO message count badge
```

---

### 8. **Tasks Panel Integration**

#### Legacy Implementation
```javascript
// File: src/features/staffMessages/hooks/useStaffTasksPanel.js

export function useStaffTasksPanel() {
  const [isOpen, setIsOpen] = useState(false)

  return {
    isOpen,
    toggle: () => setIsOpen(prev => !prev),
    close: () => setIsOpen(false),
    open: () => setIsOpen(true)
  }
}

// In component:
const {
  isOpen: tasksPanelOpen,
  toggle: toggleTasksPanel,
  close: closeTasksPanel
} = useStaffTasksPanel()

// Close tasks panel on mobile or when no thread selected
useEffect(() => {
  if (!selectedThread || isMobile) {
    closeTasksPanel()
  }
}, [selectedThread?.id, isMobile, closeTasksPanel])

// Toggle button in ThreadHeader
<Chip
  icon={tasksPanelOpen ? <CloseIcon /> : <ArticleOutlinedIcon />}
  label={tasksPanelOpen ? 'Masquer tâches' : 'Afficher tâches'}
  onClick={toggleTasksPanel}
  sx={{ ... }}
/>
```

#### Legacy Tasks Panel Component
```javascript
// File: src/features/staffMessages/components/StaffTasksPanel.jsx

export function StaffTasksPanel({ staffId, onTaskClick }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (staffId) {
      fetchTasksForStaff(staffId) // API: /tasks/search-staff-timeline
    }
  }, [staffId])

  return (
    <Box sx={{ width: 360, p: 2, borderLeft: '1px solid #e0e0e0' }}>
      <Typography variant="h6">Tâches assignées</Typography>
      {tasks.map(task => (
        <TaskCompactRow
          key={task._id}
          task={task}
          onClick={() => onTaskClick(task)}
        />
      ))}
    </Box>
  )
}
```

#### New Implementation
```javascript
// ❌ NO tasks panel at all
// ❌ NO useStaffTasksPanel hook
// ❌ NO StaffTasksPanel component
// ❌ NO TaskEditModal
// ❌ NO toggle button
```

---

### 9. **Message Display - Styling Differences**

#### Legacy Message Display
```javascript
<Box sx={{
  flex: 1,
  overflow: 'auto',
  p: `${SPACING.xl}px`, // 24px
  bgcolor: COLORS.background.secondary,
  display: 'flex',
  flexDirection: 'column',

  // WhatsApp-style background
  backgroundImage: 'url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)',
  backgroundSize: '412.5px 749.25px'
}}>
  {messages.map(msg => (
    <MessageBubble
      key={msg.id}
      message={msg}
      isFromUser={msg.sender === 'guest'}
      isFromAdmin={msg.sender === 'host'}
      status={msg.status}
      showStatus={true}
      showTimestamp={true}
      platformColor={SOJORI_ORANGE}
    />
  ))}
  <div ref={messagesEndRef} />
</Box>
```

#### New Implementation
```javascript
<Box sx={{ flex: 1, overflowY: 'auto', p: 3, bgcolor: t.bg2 }}>
  {messages.map((msg, i) => (
    <Box
      key={i}
      sx={{
        display: 'flex',
        justifyContent: msg.sender === 'bot' ? 'flex-start' : 'flex-end',
        mb: 1,
      }}
    >
      <Box sx={{ ... basic bubble styling ... }}>
        <Typography>{msg.content}</Typography>
        <Typography variant="caption">{formatTime(msg.timestamp)}</Typography>
      </Box>
    </Box>
  ))}
  <div ref={messagesEndRef} />
</Box>

// ❌ NO WhatsApp background pattern
// ❌ NO MessageBubble component
// ❌ NO status indicators (sent/delivered/read)
// ❌ Inconsistent styling
```

---

### 10. **Pagination & Data Loading**

#### Legacy Strategy
```javascript
const CONFIG = {
  INITIAL_LOAD: 100,  // Load 100 threads initially
  PAGE_SIZE: 25,      // Load 25 more on "Load More" click
  MESSAGES_LIMIT: 50  // 50 messages per thread
}

// Initial load
fetchThreads(0, false) // page=0, append=false

// Load more button
loadMoreThreads() {
  const nextPage = page + 1
  setPage(nextPage)
  fetchThreads(nextPage, true) // append=true
}

// API call
const query = {
  page: pageNum,
  limit: pageNum === 0 ? CONFIG.INITIAL_LOAD : CONFIG.PAGE_SIZE,
  paged: true,
  messagesLimit: CONFIG.MESSAGES_LIMIT,
  sortBy: 'recent'
}
```

#### New Implementation
```javascript
// ❌ NO pagination config
// ❌ Loads with limit: 200 (all at once)
// ❌ NO "Load More" button
// ❌ NO page state tracking
// ❌ NO hasMore state
```

---

### 11. **Search Implementation**

#### Legacy Search
```javascript
const [searchText, setSearchText] = useState('')

// Debounced API search
useEffect(() => {
  const timer = setTimeout(() => {
    if (allThreads.length > 0) {
      fetchThreads(0, false) // Refetch with search
    }
  }, 300)
  return () => clearTimeout(timer)
}, [searchText])

// Client-side filtering for display
const filteredThreads = threads.filter(thread => {
  if (!searchText) return true

  const name = String(thread.guestName || '').toLowerCase()
  const phone = String(thread.phone || '')
  const roleLabel = String(thread.roleLabel || '').toLowerCase()
  const q = searchText.toLowerCase()

  return name.includes(q) || phone.includes(searchText) || roleLabel.includes(q)
})
```

#### New Implementation
```javascript
// ❌ NO search term state
// ❌ NO debounced search
// ❌ NO filtering by role
```

---

### 12. **Auto-Selection Behavior**

#### Legacy Behavior
```javascript
// Auto-select first thread ONLY on initial load
if (formatted.length > 0 && !selectedThread) {
  setSelectedThread(formatted[0])
}
```

#### New Implementation
```javascript
// ✅ Fixed in recent update: NO auto-selection
// User must click to select conversation
```

---

## 📊 Feature Comparison Matrix

| Feature | Legacy (sojori-dashboard) | New (Sojori-orchestrator) | Status |
|---------|---------------------------|----------------------------|--------|
| **API Endpoint** | ✅ `/staff-whatsapp/get` | ❌ Wrong endpoint | 🔴 Critical |
| **Role Badges** | ✅ Admin/Manager/Staff colored | ❌ Missing | 🔴 Critical |
| **Phone Chips** | ✅ Monospace, clickable | ❌ Missing | 🟡 Important |
| **Message Count** | ✅ Badge per conversation | ❌ Missing | 🟡 Important |
| **Tasks Panel** | ✅ Slides in from right | ❌ Missing | 🔴 Critical |
| **Task Modal** | ✅ Edit task on click | ❌ Missing | 🔴 Critical |
| **FilterBar** | ✅ Role filters (6 types) | ❌ Missing | 🔴 Critical |
| **Search** | ✅ Name/Phone/Role | ❌ Missing | 🟡 Important |
| **Pagination** | ✅ 100 initial + 25/page | ❌ Load all | 🟡 Important |
| **Design System** | ✅ Modern components | ❌ Basic MUI | 🟡 Important |
| **Message Bubbles** | ✅ MessageBubble component | ❌ Basic div | 🟡 Important |
| **WhatsApp BG** | ✅ Pattern image | ❌ Plain color | 🟢 Nice to have |
| **Layout** | ✅ Staff-specific layout | ❌ Generic ChatLayout | 🔴 Critical |
| **Auto-select** | ✅ First thread on mount | ✅ Fixed (no auto) | ✅ Good |
| **Stable Layout** | ✅ No shifting | ✅ Fixed (3 children always) | ✅ Good |

**Legend:**
- 🔴 Critical - Breaks core functionality
- 🟡 Important - Missing expected feature
- 🟢 Nice to have - UX enhancement
- ✅ Good - Working as expected

---

## 🛠️ Recommended Fix Strategy

### Phase 1: Critical Fixes (Blocking Issues)

1. **Fix API Endpoint**
   - Change from `/ai/debug/conversations?hasReservation=false`
   - To: `/staff-whatsapp/get` with proper params
   - File: `src/components/communications/StaffWhatsAppTab.tsx`

2. **Add Staff Data Mapping**
   - Create `mapStaffThreadToThread()` function
   - Extract role, roleLabel, staffId, staffDoc
   - Map messages array correctly

3. **Import Design System Components**
   - Import `FilterBar`, `ThreadListItem`, `MessageBubble`, etc.
   - Import `COLORS`, `SPACING`, `COMPONENT_SIZES`
   - Update all styling to use design constants

4. **Add FilterBar with Role Filters**
   - Add role-based filtering (admin/staff/manager/unreplied/recent)
   - Implement `applyLocalFilter()` function
   - Add filter UI at top of conversation list

5. **Add Role/Phone/Count Chips**
   - Add `additionalChips` prop to `ThreadListItem`
   - Show role badge with color coding
   - Show phone number chip
   - Show message count badge

### Phase 2: Important Features

6. **Add Tasks Panel**
   - Create `useStaffTasksPanel` hook
   - Add `StaffTasksPanel` component
   - Fetch tasks from `/tasks/search-staff-timeline` or `/tasks/get-tasks-by-staff`
   - Add toggle button in ThreadHeader

7. **Add Task Modal**
   - Import `TaskEditModal` component
   - Handle task click → open modal
   - Support task editing

8. **Add Search Functionality**
   - Add search input field
   - Debounce search (300ms)
   - Filter by name, phone, role

9. **Add Pagination**
   - Implement "Load More" button
   - Track page state
   - Load 100 initial, 25 per page

### Phase 3: UX Enhancements

10. **Update Message Display**
    - Use `MessageBubble` component
    - Add WhatsApp background pattern
    - Show status indicators (sent/delivered/read)

11. **Update Layout**
    - Use staff-specific layout wrapper
    - Support tasks panel slide-in animation
    - Handle mobile responsive behavior

---

## 📁 Files to Modify

### New Orchestrator Files (Needs Changes)

1. ❌ **src/components/communications/StaffWhatsAppTab.tsx**
   - Wrong API endpoint
   - Missing FilterBar
   - Missing role badges
   - Missing tasks panel
   - Missing proper data mapping

### Legacy Files to Reference (Copy From)

2. ✅ **sojori-dashboard/src/features/staffMessages/pages/StaffWhatsAppNew.jsx**
   - Complete reference implementation
   - Copy logic for API calls, filtering, data mapping

3. ✅ **sojori-dashboard/src/features/staffMessages/components/StaffWhatsAppLayout.jsx**
   - Layout wrapper with tasks panel support

4. ✅ **sojori-dashboard/src/features/staffMessages/components/StaffTasksPanel.jsx**
   - Tasks panel component

5. ✅ **sojori-dashboard/src/features/staffMessages/hooks/useStaffTasksPanel.js**
   - Tasks panel state hook

6. ✅ **sojori-dashboard/src/features/communications/components/modern/**
   - Modern design system components
   - FilterBar, ThreadListItem, MessageBubble, etc.

7. ✅ **sojori-dashboard/src/features/communications/design/**
   - Design constants (COLORS, SPACING, etc.)

---

## 🧪 Testing Checklist

After implementing fixes, verify:

### API & Data
- [ ] Fetches from `/staff-whatsapp/get` endpoint
- [ ] Displays all staff conversations (not filtered by `hasReservation`)
- [ ] Shows correct staff names
- [ ] Shows correct phone numbers
- [ ] Shows message counts
- [ ] Loads 100 threads initially
- [ ] "Load More" button loads 25 more

### UI Components
- [ ] Role badges visible (Admin/Manager/Staff)
- [ ] Role badges have correct colors (Orange/Blue/Green)
- [ ] Phone number chips visible and monospace font
- [ ] Message count badges visible
- [ ] FilterBar displays with 6 filters (all/admin/staff/manager/unreplied/recent)
- [ ] Filters work instantly (client-side)
- [ ] Search works by name, phone, role

### Tasks Panel
- [ ] "Afficher tâches" button visible in ThreadHeader
- [ ] Tasks panel slides in from right (360px)
- [ ] Tasks panel fetches tasks for selected staff member
- [ ] Task cards clickable
- [ ] TaskEditModal opens on task click
- [ ] Tasks panel closes on mobile
- [ ] Tasks panel closes when no thread selected

### Layout
- [ ] Left column (list) doesn't move when selecting conversation
- [ ] Center column (messages) displays correctly
- [ ] Right column (tasks panel) slides in/out smoothly
- [ ] Layout stable during message loading
- [ ] No shifting or jumping
- [ ] Responsive on mobile

### Messages
- [ ] Messages display in correct order (oldest to newest)
- [ ] Message bubbles styled correctly
- [ ] WhatsApp background pattern visible
- [ ] Timestamps formatted correctly
- [ ] Status indicators show (sent/delivered/read)
- [ ] Scroll auto-scrolls to bottom on new message
- [ ] Send message works correctly

---

## 📝 Notes

- The legacy implementation (`sojori-dashboard`) is the source of truth
- All design system components already exist in legacy - just need to port
- API endpoints are stable and well-tested in production
- The new implementation tried to reuse Guest WhatsApp code for Staff, which doesn't work
- Staff conversations have different data structure than Guest conversations
- Tasks panel is a critical feature for staff management workflow

---

## 🔗 Related Documentation

- `.clinerules` - Critical rules for API client safety
- `docs/incidents/PREVENTIVE_MEASURES_API_CLIENT_SAFETY.md` - API best practices
- `docs/WhatsApp/MUST_READ_WHATSAPP_FLOWS.md` - WhatsApp integration rules

---

**Next Steps:** Proceed with Phase 1 fixes to restore basic functionality, then Phase 2 for feature parity.
