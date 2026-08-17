# Naming Audit — Staff Role Canonical Rename

**Decision**: The gate scanner / event check-in role is called **"staff"** everywhere.  
**Date**: 2026-04-29  
**Scope**: All three repos — labbe-backend, labbe (web), halla-mobile

> ⚠️ **DO NOT rename platform "Moderators"** — that is a separate admin role (admin dashboard moderators with platform-level permissions). Only the event-level gate scanner role is being renamed.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| v4.0 | 2026-05-02 | Verification pass: halla-mobile already clean (Section 3 marked done), fixed EventModel.js line number, fixed Section 2.4 line 66 description, added missing import updates to 2.11 & 2.13, added missing comment to 2.13, corrected Section 2.10 dead-CSS note |
| v3.0 | 2026-04-29 | Removed all backward compatibility sections — project is in dev, rename everything cleanly |
| v2.0 | 2026-04-29 | Added backward compat strategy, pre-flight findings, full DB migration, Section 11 verification |
| v1.0 | 2026-04-29 | Initial plan |

---

## Summary of work

| Repo | Files to change | Wrong-name occurrences |
|------|----------------|----------------------|
| labbe-backend | 13 files | ~160 |
| labbe (web) | 32 files | ~150 |
| halla-mobile | 15 files | ~65 |
| **Total** | **60+ files** | **~400+** |

**Terms to eradicate**: `supervisor`, `supervisors`, `supervisorId`, `supervisorsList`, `supervisorsCount`, `supervisorData`, `supervisorSchema`, `hasGateKeeperAssignment`, `gateKeeper`, `ModeratorsPopup`, `AddSuperVisorPopup`

**Terms to keep (already correct)**: `staff`, `staffId`, `staffList`, `staffCount`, `staffSchema`, `hasStaffAssignment`, `StaffAccessToken`, `verifyStaffToken`, `StaffPortalScreen`

---

## Pre-flight Investigation Findings

### Role string: is `role: 'supervisor'` a breaking change?

**Verdict: NOT breaking.** The `staffAuth` middleware validates `decoded.type === "staff_session"` only — it never reads `decoded.role`. The mobile `StaffPortalScreen` only reads `staffInfo.name`. Nothing downstream checks the role field. Rename it freely.

### Stored vs derived fields: which fields need DB migration?

| Field | Stored in DB? | Needs migration? |
|-------|--------------|-----------------|
| `supervisorsList` | **Yes** — `EventModel.js` line 274 | **Yes — `$rename` to `staffList`** |
| `supervisorsCount` | **No** — computed client-side from `supervisorsList?.length` | **No migration needed** |

### Scope correction

The original estimate of 32 files / ~105 occurrences was wrong. Actual scope is 60+ files / ~400+ occurrences. The biggest gaps were `labbe/services/createAndUpdateEvents.js` (~55 occurrences) and `labbe/hooks/events/mutations/useEventMutation.js` (~15 occurrences), plus multiple localization files not in the original plan.

---

## Section 1 — labbe-backend

### 1.1 `models/EventModel.js`
| Line | Current | Change to |
|------|---------|-----------|
| 5 | `const supervisorSchema = new mongoose.Schema(` | `const staffSchema = new mongoose.Schema(` |
| ~237 | `supervisorsList: [supervisorSchema],` | `staffList: [staffSchema],` |

> Field rename requires a DB migration — see Section 7. Line number in plan was previously stated as 274 but verified to be ~237; search for the text rather than jumping to a line number.

---

### 1.2 `src/modules/events/events.routes.js`
| Lines | Current route / param | Change to |
|-------|----------------------|-----------|
| 380–414 | `PATCH /events/:id/supervisors-list` | `PATCH /events/:id/staff-list` |
| 706–730 | `POST /events/:eventId/supervisors` | `POST /events/:eventId/staff` |
| 738–767 | `PUT /events/:eventId/supervisors/:supervisorId` | `PUT /events/:eventId/staff/:staffId` |
| 775–807 | `PUT /events/:eventId/supervisors/:supervisorId/status` | `PUT /events/:eventId/staff/:staffId/status` |
| 815–838 | `DELETE /events/:eventId/supervisors/:supervisorId` | `DELETE /events/:eventId/staff/:staffId` |
| 769, 809, 840 | `validateObjectId("supervisorId")` | `validateObjectId("staffId")` |

---

### 1.3 `src/modules/events/events.controller.js`
| Lines | Current text | Change to |
|-------|-------------|-----------|
| 215 | `* Replace supervisors list` | `* Replace staff list` |
| 216 | `* PATCH /api/v2/events/:id/supervisors-list` | `* PATCH /api/v2/events/:id/staff-list` |
| 327 | `* Add supervisor to event` | `* Add staff to event` |
| 340 | `* PUT /api/v2/events/:eventId/supervisors/:supervisorId` | update route in comment |
| 355 | `* PUT /api/v2/events/:eventId/supervisors/:supervisorId/status` | update route in comment |
| 371 | `* DELETE /api/v2/events/:eventId/supervisors/:supervisorId` | update route in comment |

---

### 1.4 `src/modules/events/events.service.js`
| Lines | Current method / variable | Change to |
|-------|--------------------------|-----------|
| 967–973 | `updateSupervisorsList()` | `updateStaffList()` |
| 1155–1161 | `addSupervisorToEvent()` | `addStaffToEvent()` |
| 1183–1190 | `updateSupervisor()` | `updateStaff()` |
| 1211–1218 | `updateSupervisorStatus()` | `updateStaffStatus()` |
| 1223–1229 | `deleteSupervisor()` | `deleteStaff()` |
| 1261 | `const activeSupervisors` | `const activeStaff` |

Run `grep -n supervisor events.service.js` after the above changes and rename any remaining variables inside function bodies.

---

### 1.5 `src/modules/staff/staff.service.js`
| Line | Current | Change to |
|------|---------|-----------|
| 46 | `role: 'supervisor',` | `role: 'staff',` |
| 64 | `const supervisor = event.supervisorsList?.find(` | `const staffMember = event.staffList?.find(` |
| 68 | `if (!supervisor)` | `if (!staffMember)` |
| 75 | `staffName: supervisor.name,` | `staffName: staffMember.name,` |
| 76 | `staffId: supervisor._id,` | `staffId: staffMember._id,` |
| 82 | `_id: supervisor._id,` | `_id: staffMember._id,` |
| 83 | `name: supervisor.name,` | `name: staffMember.name,` |
| 84 | `phone: supervisor.phone,` | `phone: staffMember.phone,` |
| 85 | `role: 'supervisor',` | `role: 'staff',` |

---

### 1.6 `src/modules/admin/admin.service.js`
| Line | Current | Change to |
|------|---------|-----------|
| 1364 | `'supervisorsList'` in allowedFields array | `'staffList'` |

---

### 1.7 `src/modules/admin/admin.controller.js`
| Line | Current | Change to |
|------|---------|-----------|
| 382 | `req.body.supervisorsList` / `eventData.supervisorsList` | `req.body.staffList` / `eventData.staffList` |
| 479 | `req.body.supervisorsList` / `updateData.supervisorsList` | `req.body.staffList` / `updateData.staffList` |

---

### 1.8 `src/shared/middleware/staffAuth.js`
| Line | Current | Change to |
|------|---------|-----------|
| 56 | comment: `Verify staff is still in supervisors list` | `Verify staff is still in staffList` |
| 58 | `event.supervisorsList?.find(` | `event.staffList?.find(` |

---

### 1.9 `models/PlanModel.js`
| Line | Current | Change to |
|------|---------|-----------|
| 27 | `hasGateKeeperAssignment: { type: Boolean, default: true }` | `hasStaffAssignment: { type: Boolean, default: true }` |

> `hasStaffCheckIn` on line 26 is already correct — do not touch it.

---

### 1.10 `src/shared/constants/plans.js`
| Line | Current | Change to |
|------|---------|-----------|
| 67 | `hasGateKeeperAssignment: { labelAr: 'تعيين حارس البوابة', labelEn: 'Gate keeper assignment', icon: 'gate' }` | `hasStaffAssignment: { labelAr: 'تعيين فريق العمل', labelEn: 'Staff assignment', icon: 'gate' }` |

---

### 1.11 `src/shared/constants/planDefaults.js`
| Line | Current | Change to |
|------|---------|-----------|
| 6 | `hasGateKeeperAssignment: true,` | `hasStaffAssignment: true,` |

---

### 1.12 `email/templates/staff.js`
| Line | Current text | Change to |
|------|-------------|-----------|
| 43 | `"You have been assigned as a supervisor for an event"` | `"You have been assigned as staff for an event"` |
| 51 | `You have been assigned as a supervisor for "${data.eventTitle}"` | `You have been assigned as staff for "${data.eventTitle}"` |
| 91 | `You've been assigned as supervisor for ${data.eventTitle}` | `You've been assigned as staff for ${data.eventTitle}` |
| 384 | `"...sent to the supervisor."` | `"...sent to the staff member."` |

---

### 1.13 `models/StaffAccessTokenModel.js`
| Line | Current | Change to |
|------|---------|-----------|
| 20 | comment: `// Staff phone number (matches supervisorsList entry)` | `// Staff phone number (matches staffList entry)` |
| 27 | comment: `// Staff name (from supervisorsList)` | `// Staff name (from staffList)` |

> Only comments need changing — no model field names are wrong in this file.

---

## Section 2 — labbe (web)

### 2.1 `services/new-backend/api.config.js`
| Line | Current | Change to |
|------|---------|-----------|
| 71 | `updateSupervisorsList: (id) => \`/events/${id}/supervisors-list\`` | `updateStaffList: (id) => \`/events/${id}/staff-list\`` |
| 87 | comment: `// Supervisor Management` | `// Staff Management` |
| 88 | `addSupervisorToEvent: (eventId) => \`/events/${eventId}/supervisors\`` | `addStaff: (eventId) => \`/events/${eventId}/staff\`` |
| 89 | `updateSupervisor: (eventId, supervisorId) => ...` | `updateStaff: (eventId, staffId) => \`/events/${eventId}/staff/${staffId}\`` |
| 90 | `updateSupervisorStatus: (eventId, supervisorId) => ...` | `updateStaffStatus: (eventId, staffId) => \`/events/${eventId}/staff/${staffId}/status\`` |
| 91 | `deleteSupervisor: (eventId, supervisorId) => ...` | `deleteStaff: (eventId, staffId) => \`/events/${eventId}/staff/${staffId}\`` |

---

### 2.2 `services/createAndUpdateEvents.js`
**Largest single-file change in the web repo — ~55 occurrences.**

| Lines | Current | Change to |
|-------|---------|-----------|
| 128 | `if (eventData.supervisorsList)` | `if (eventData.staffList)` |
| 130–131 | `"supervisorsList"`, `JSON.stringify(eventData.supervisorsList)` | `"staffList"`, `JSON.stringify(eventData.staffList)` |
| 198 | `@param {Array} [supervisorsList]` in JSDoc | `@param {Array} [staffList]` |
| 206 | `supervisorsList = null,` parameter | `staffList = null,` |
| 215–216 | `supervisorsList` check and body assignment | `staffList` |
| 412–413 | JSDoc `* Add supervisor to event` | `* Add staff to event` |
| 414 | `* POST /events/:eventId/supervisors` | `* POST /events/:eventId/staff` |
| 415 | `@param {Object} supervisorData` | `@param {Object} staffData` |
| 417 | `@returns {Promise<Object>} Added supervisor` | `@returns {Promise<Object>} Added staff member` |
| 419 | `addSupervisor: async (eventId, supervisorData, token)` | `addStaff: async (eventId, staffData, token)` |
| 424–437 | all `supervisorData.name` / `supervisorData.phone` refs | `staffData.name` / `staffData.phone` |
| 425 | error: `"Supervisor name must be at least 2 characters"` | `"Staff name must be at least 2 characters"` |
| 428 | error: `"Supervisor name cannot exceed 100 characters"` | `"Staff name cannot exceed 100 characters"` |
| 433 | error: `"Supervisor phone is required"` | `"Staff phone is required"` |
| 470 | POST URL `/events/${eventId}/supervisors` | `/events/${eventId}/staff` |
| 473 | `body: JSON.stringify(supervisorData)` | `body: JSON.stringify(staffData)` |
| 480–508 | `updateSupervisor()` function and all internal refs | `updateStaff()` |
| 483 | `@param {string} supervisorId` | `@param {string} staffId` |
| 484 | `@param {Object} supervisorData` | `@param {Object} staffData` |
| 488 | `updateSupervisor: async (eventId, supervisorId, supervisorData)` | `updateStaff: async (eventId, staffId, staffData)` |
| 498–504 | all `supervisorId` checks and error messages | `staffId` |
| 508 | PUT URL `/supervisors/${supervisorId}` | `/staff/${staffId}` |
| 518–556 | `updateSupervisorStatus()` function | `updateStaffStatus()` |
| 526 | `updateSupervisorStatus: async (eventId, supervisorId, ...)` | `updateStaffStatus: async (eventId, staffId, ...)` |
| 560–584 | `removeSupervisor()` function | `removeStaff()` |
| 567 | `removeSupervisor: async (eventId, supervisorId, ...)` | `removeStaff: async (eventId, staffId, ...)` |
| 582 | DELETE URL `/supervisors/${supervisorId}` | `/staff/${staffId}` |
| 613 | `supervisorsList: (formData.moderatorsList \|\| []).map((supervisor) =>` | `staffList: (formData.staffList \|\| []).map((s) =>` |
| 614–615 | `supervisor.name`, `supervisor.mobile \|\| supervisor.phone` | `s.name`, `s.mobile \|\| s.phone` |
| 648 | comment: `Transform supervisors list: map phone -> mobile` | `Transform staff list: map phone -> mobile` |
| 649 | `(event.supervisorsList \|\| []).map(` | `(event.staffList \|\| []).map(` |

---

### 2.3 `hooks/events/mutations/useEventMutation.js`
| Lines | Current | Change to |
|-------|---------|-----------|
| 41 | `formData.append("supervisorsList", ...)` | `formData.append("staffList", ...)` |
| 86–91 | `updateSupervisorsList` mutation key, `API_PATHS.events.updateSupervisorsList` | `updateStaffList`, `API_PATHS.events.updateStaffList` |
| 232–237 | `addSupervisor` mutation key, `API_PATHS.events.addSupervisorToEvent` | `addStaff`, `API_PATHS.events.addStaff` |
| 245–250 | `updateSupervisor` mutation key, `supervisorId` param | `updateStaff`, `staffId` |
| 258–263 | `updateSupervisorStatus` mutation key, `supervisorId` param | `updateStaffStatus`, `staffId` |
| 271–276 | `deleteSupervisor` mutation key, `supervisorId` param | `deleteStaff`, `staffId` |
| 283 | comment: `notify all active supervisors via SMS` | `notify all active staff via SMS` |
| 348 | `export const useUpdateSupervisorsList` | `export const useUpdateStaffList` |
| 380 | comment: `Hook for supervisor operations` | `Hook for staff operations` |
| 382 | `export const useAddSupervisor` | `export const useAddStaff` |
| 383 | `export const useUpdateSupervisor` | `export const useUpdateStaff` |
| 384 | `export const useUpdateSupervisorStatus` | `export const useUpdateStaffStatus` |
| 385 | `export const useDeleteSupervisor` | `export const useDeleteStaff` |

Update all import sites of these exported hooks across the web app.

---

### 2.4 `hooks/events/useEventForm.js`
| Lines | Current | Change to |
|-------|---------|-----------|
| 52–57 | `transformModeratorsList(supervisors = [])` | `transformStaffList(staff = [])` |
| 66 | `moderatorsList: transformModeratorsList(event.supervisorsList),` | `staffList: transformStaffList(event.staffList),` |
| 94–97 | `supervisorsList` in `buildEventPayload` | `staffList` |

---

### 2.5 `utils/schemas/createEventSchema.js`
| Line | Current | Change to |
|------|---------|-----------|
| 42 | comment: `// Supervisor schema - name and phone required` | `// Staff schema - name and phone required` |
| 43 | `const supervisorSchema = z.object({` | `const staffSchema = z.object({` |
| 113 | comment: `// Step 3: Supervisors List` | `// Step 3: Staff List` |
| 114 | `supervisorsList: z.array(supervisorSchema).optional()` | `staffList: z.array(staffSchema).optional()` |
| 142 | `supervisorsList: createEventSchema(t).shape.supervisorsList` | `staffList: createEventSchema(t).shape.staffList` |
| 181 | comment: `supervisors optional` | `staff optional` |

---

### 2.6 `utils/schemas/eventAddintionSchemas.js`
| Line | Current | Change to |
|------|---------|-----------|
| 20 | `t("singleEvent.addSupervisor.phoneRequired")` | `t("singleEvent.addStaff.phoneRequired")` |
| 25 | `t("singleEvent.addSupervisor.invalidPhone")` | `t("singleEvent.addStaff.invalidPhone")` |
| 61 | comment: `// Supervisor schema - name and phone required` | `// Staff schema - name and phone required` |
| 62 | `const supervisorSchema = z.object({` | `const staffSchema = z.object({` |
| 69 | `t("singleEvent.addSupervisor.nameRequired")` | `t("singleEvent.addStaff.nameRequired")` |
| 75 | `t("singleEvent.addSupervisor.nameMaxLength")` | `t("singleEvent.addStaff.nameMaxLength")` |
| 85 | `supervisorSchema,` | `staffSchema,` |
| 120 | `export const supervisorSchema = z.object({` | `export const staffSchema = z.object({` |

---

### 2.7 `app/[lang]/host/create-event/page.js`
| Line | Current | Change to |
|------|---------|-----------|
| 17 | `import ModeratorsPopup from "./_components/moderatorsPopup/ModeratorsPopup"` | `import StaffPopup from "./_components/staffPopup/StaffPopup"` |
| 32 | `const [showModeratorsPopup, setShowModeratorsPopup] = useState(false)` | `const [showStaffPopup, setShowStaffPopup] = useState(false)` |
| 124 | `onClick={() => setShowModeratorsPopup(true)}` | `onClick={() => setShowStaffPopup(true)}` |
| 274 | `isOpen={showModeratorsPopup}` | `isOpen={showStaffPopup}` |
| 275 | `onClose={() => setShowModeratorsPopup(false)}` | `onClose={() => setShowStaffPopup(false)}` |
| 277 | `<ModeratorsPopup` | `<StaffPopup` |
| 282 | `onClose={() => setShowModeratorsPopup(false)}` | `onClose={() => setShowStaffPopup(false)}` |

---

### 2.8 `app/[lang]/host/create-event/_components/moderatorsPopup/ModeratorsPopup.js`
| What | Current | Change to |
|------|---------|-----------|
| Directory name | `moderatorsPopup/` | `staffPopup/` |
| File name | `ModeratorsPopup.js` | `StaffPopup.js` |
| Component name | `ModeratorsPopup` | `StaffPopup` |
| CSS import | `import styles from "./moderatorsPopup.module.css"` | `import styles from "./staffPopup.module.css"` |
| Line 11 | `const ModeratorsPopup = ({` | `const StaffPopup = ({` |
| Line 211 | `export default ModeratorsPopup` | `export default StaffPopup` |

Rename the CSS module file: `moderatorsPopup.module.css` → `staffPopup.module.css`

---

### 2.9 `app/[lang]/host/create-event/_components/summary/Summary.js`
| Line | Current | Change to |
|------|---------|-----------|
| 129 | `{t("number_of_supervisors")}` | `{t("number_of_staff")}` |

---

### 2.10 `app/[lang]/host/create-event/_components/stepThree/stepThree.module.css`
| Lines | Current CSS class | Change to |
|-------|-----------------|-----------|
| 248 | `.addSupervisorsButton {` | `.addStaffButton {` |
| 266 | `.addSupervisorsButton:hover {` | `.addStaffButton:hover {` |
| 270 | `.addSupervisorsButton span {` | `.addStaffButton span {` |
| 278 | `.addSupervisorsButton svg {` | `.addStaffButton svg {` |
| 360 | `.addSupervisorsButton {` | `.addStaffButton {` |

> **Dead CSS**: `addSupervisorsButton` is not referenced by any JS/JSX file — `StepThree.js` imports this CSS module but never uses this class. Only the CSS rename above is needed; there is no corresponding JS component to update.

---

### 2.11 `app/[lang]/admin-dash/events/[id]/_components/AdminEventHeader.jsx`
| Line | Current | Change to |
|------|---------|-----------|
| 9 | `import ModeratorsPopup from "..."` | `import StaffPopup from ".../staffPopup/StaffPopup"` |
| 39 | `supervisorsCount` | `staffCount` |
| 42–47 | Transform `supervisors` → `moderatorsList` | Transform `staff` → `staffList` |
| 104 | `handleAddModerator` | `handleAddStaff` |
| 107–116 | `supervisorsList` in API payload | `staffList` |

---

### 2.12 `app/[lang]/admin-dash/create-event/_components/AdminCreateEvent.jsx`
| Line | Current | Change to |
|------|---------|-----------|
| 94 | `fd.append("supervisorsList", ...)` | `fd.append("staffList", ...)` |
| Any `ModeratorsPopup` import | `ModeratorsPopup` | `StaffPopup` |

---

### 2.13 `app/[lang]/host/events/[id]/_components/EventHeader.jsx`
| Line | Current | Change to |
|------|---------|-----------|
| 8 | `import ModeratorsPopup from "..."` | `import StaffPopup from ".../staffPopup/StaffPopup"` |
| ~25 | comment: `// ... supervisorsList: [...] }` | update comment to reference `staffList` |
| ~29 | `supervisors = event?.supervisorsList \|\| []` | `staff = event?.staffList \|\| []` |
| ~30–32 | Transform to `moderatorsList` | Transform to `staffList` |

> Line numbers are approximate — the original plan had ~23 but verified to be ~29. Search for `supervisorsList` in this file.

---

### 2.14 `app/[lang]/host/plans/PlansPage.js`
| Line | Current | Change to |
|------|---------|-----------|
| 99 | `hasGateKeeperAssignment: { icon: "gate", labelAr: "تعيين حارس البوابة", labelEn: "Gatekeeper Assignment" }` | `hasStaffAssignment: { icon: "gate", labelAr: "تعيين فريق العمل", labelEn: "Staff Assignment" }` |

---

### 2.15 `ui/host/popups/addSuperVisorPopup/AddSuperVisorPopup.js`
| What | Current | Change to |
|------|---------|-----------|
| Directory name | `addSuperVisorPopup/` | `addStaffPopup/` |
| File name | `AddSuperVisorPopup.js` | `AddStaffPopup.js` |
| CSS file | `addSuperVisorPopup.module.css` | `addStaffPopup.module.css` |
| Component internals | all `supervisorSchema`, `supervisor*` variable names | `staffSchema`, `staff*` |

Update all import sites of this component across the web app.

---

### 2.16 `localization/locales/en/createEvent.json`
| Line | Current key | Change to |
|------|------------|-----------|
| 42 | `"step3_label": "Supervisors"` | `"step3_label": "Staff"` |
| 126 | `"add_supervisors"` | `"add_staff": "Add Staff"` |
| 127 | `"supervisor_name"` | `"staff_name": "Staff Name"` |
| 128 | `"supervisor_name_placeholder"` | `"staff_name_placeholder": "Enter staff name"` |
| 129 | `"supervisor_phone"` | `"staff_phone": "Phone Number"` |
| 130 | `"supervisor_phone_placeholder"` | `"staff_phone_placeholder": "Mobile phone number"` |
| 131 | `"supervisor_email"` | `"staff_email": "Email"` |
| 132 | `"supervisor_email_placeholder"` | `"staff_email_placeholder": "Enter email"` |
| 133 | `"supervisor_role"` | `"staff_role": "Staff Role"` |
| 134 | `"supervisor_role_placeholder"` | `"staff_role_placeholder": "Role name"` |
| 135 | `"supervisor_name_required"` | `"staff_name_required": "Staff name is required"` |
| 136 | `"supervisor_phone_required"` | `"staff_phone_required": "Phone number is required"` |
| 137 | `"supervisor_phone_invalid"` | `"staff_phone_invalid": "Phone number must be at least 9 digits"` |
| 138 | `"supervisor_email_required"` | `"staff_email_required": "Email is required"` |
| 139 | `"supervisor_email_invalid"` | `"staff_email_invalid": "Invalid email address"` |
| 140 | `"supervisor_email_duplicate"` | `"staff_email_duplicate": "This email is already added."` |
| 141 | `"supervisor_role_required"` | `"staff_role_required": "Staff role is required"` |
| 142 | `"supervisors_list"` | `"staff_list": "Staff List"` |
| 178 | `"number_of_supervisors"` | `"number_of_staff": "Number of Staff"` |
| 240 | value: `"Guest and supervisor list updated successfully"` | `"Guest and staff list updated successfully"` |
| 264 | `"step3_title": "Supervisors"` | `"step3_title": "Staff"` |
| 265 | `"step3_description": "Add supervisors for your event"` | `"step3_description": "Add staff for your event"` |
| 273 | `"moderators_button": "Supervisors"` | `"staff_button": "Staff"` |

---

### 2.17 `localization/locales/ar/createEvent.json`
Same key rename as 2.16, with Arabic values:

| New key | Arabic value |
|---------|-------------|
| `"step3_label"` | `"فريق العمل"` |
| `"add_staff"` | `"إضافة فريق العمل"` |
| `"staff_name"` | `"اسم الموظف"` |
| `"staff_name_placeholder"` | `"أدخل اسم الموظف"` |
| `"staff_phone"` | `"رقم الجوال"` |
| `"staff_role"` | `"دور الموظف"` |
| `"staff_name_required"` | `"اسم الموظف مطلوب"` |
| `"staff_phone_required"` | `"رقم الجوال مطلوب"` |
| `"staff_phone_invalid"` | `"رقم الجوال يجب أن يكون 9 أرقام على الأقل"` |
| `"staff_role_required"` | `"دور الموظف مطلوب"` |
| `"staff_list"` | `"قائمة فريق العمل"` |
| `"number_of_staff"` | `"عدد فريق العمل"` |
| `"step3_title"` | `"فريق العمل"` |
| `"step3_description"` | `"أضف فريق العمل للحدث"` |
| `"staff_button"` | `"فريق العمل"` |

---

### 2.18 `localization/locales/en/common.json`
| Line | Current key | Change to |
|------|------------|-----------|
| 57 | `"supervisorName": "Supervisor Name"` | `"staffName": "Staff Name"` |
| 58 | `"supervisorPhone": "Phone Number"` | `"staffPhone": "Phone Number"` |
| 59 | `"supervisorEvent": "Event"` | `"staffEvent": "Event"` |

---

### 2.19 `localization/locales/ar/common.json`
| Line | Current key | Change to |
|------|------------|-----------|
| 57 | `"supervisorName": "اسم المدير"` | `"staffName": "اسم الموظف"` |
| 58 | `"supervisorPhone": "رقم الجوال"` | `"staffPhone": "رقم الجوال"` |
| 59 | `"supervisorEvent": "الحدث"` | `"staffEvent": "الحدث"` |

---

## Section 3 — halla-mobile (15 files)

> ✅ **ALREADY DONE — DO NOT RE-APPLY.** Verified 2026-05-02: a broad grep for `supervisor`, `gateKeeper`, and `hasGateKeeperAssignment` across halla-mobile returns zero results. Every file listed below has already been updated to use `staff` terminology. Applying this section again will fail because the "before" strings no longer exist.

### 3.1 `config/api.js`
| Line | Current | Change to |
|------|---------|-----------|
| 73 | `UPDATE_SUPERVISORS_LIST: (id) => \`/events/${id}/supervisors-list\`` | `UPDATE_STAFF_LIST: (id) => \`/events/${id}/staff-list\`` |
| 84 | `ADD_SUPERVISOR: (eventId) => \`/events/${eventId}/supervisors\`` | `ADD_STAFF: (eventId) => \`/events/${eventId}/staff\`` |
| 85 | `UPDATE_SUPERVISOR: (eventId, supId) => ...` | `UPDATE_STAFF: (eventId, staffId) => \`/events/${eventId}/staff/${staffId}\`` |
| 86 | `DELETE_SUPERVISOR: (eventId, supId) => ...` | `DELETE_STAFF: (eventId, staffId) => \`/events/${eventId}/staff/${staffId}\`` |

> Line 91 `NOTIFY_STAFF` is already correct — do not touch.

---

### 3.2 `utils/schemas/createEventSchema.js`
| Line | Current | Change to |
|------|---------|-----------|
| 43 | `const supervisorSchema = z.object({` | `const staffSchema = z.object({` |
| 112 | `supervisorsList: z.array(supervisorSchema).optional()` | `staffList: z.array(staffSchema).optional()` |
| 140 | `supervisorsList: createEventSchema(t).shape.supervisorsList` | `staffList: createEventSchema(t).shape.staffList` |
| 179 | comment: `supervisors optional` | `staff optional` |

---

### 3.3 `services/eventsService2.js`
Full rename — replace all occurrences:

| Old | New |
|-----|-----|
| `supervisorsList` | `staffList` |
| `supervisorId` | `staffId` |
| `supervisorData` | `staffData` |
| `updateSupervisorsList()` | `updateStaffList()` |
| `addSupervisor()` | `addStaff()` |
| `updateSupervisor()` | `updateStaff()` |
| `deleteSupervisor()` | `deleteStaff()` |
| All `"supervisor"` in console.log strings | `"staff"` |
| All JSDoc `@param supervisorId` | `@param staffId` |

Key lines: 120, 138, 154, 173, 180, 186–187, 205, 207, 211–214, 394–413, 419–450, 456–475

---

### 3.4 `services/EventsService.js`
| Line | Current | Change to |
|------|---------|-----------|
| 348 | `supervisorsList: (formData.moderatorsList \|\| []).map(...)` | `staffList: (formData.staffList \|\| []).map(...)` |

---

### 3.5 `components/home/LastEvent.js`
| Line | Current | Change to |
|------|---------|-----------|
| 36 | `event.supervisorsCount \|\| event.supervisorsList?.length` | `event.staffCount \|\| event.staffList?.length` |

---

### 3.6 `components/home/EventActionsHeader.js`
| Line | Current | Change to |
|------|---------|-----------|
| 27 | `event?.supervisorsList?.length \|\| event?.supervisorsCount` | `event?.staffList?.length \|\| event?.staffCount` |
| 52 | `` `Sent to ${data?.sent}/${data?.total} supervisors` `` | `` `Sent to ${data?.sent}/${data?.total} staff` `` |

---

### 3.7 `screens/CreateEventScreen.js`
| Line | Current | Change to |
|------|---------|-----------|
| 127 | `if (payload.supervisorsList)` | `if (payload.staffList)` |
| 129–130 | `supervisorsList` in logging | `staffList` |

---

### 3.8 `screens/host/UpdateEventScreen.js`
| Line | Current | Change to |
|------|---------|-----------|
| 45 | `const moderatorsList = (eventData.supervisorsList \|\| []).map(...)` | `const staffList = (eventData.staffList \|\| []).map(...)` |
| 189–191 | `payload.supervisorsList` / `updateSupervisorsList` call | `payload.staffList` / `updateStaffList` call |

---

### 3.9 `components/events/SingleEventStats.js`
| Line | Current | Change to |
|------|---------|-----------|
| 60 | `const moderators = (stats?.supervisors \|\| []).map((supervisor) =>` | `const staff = (stats?.staff \|\| []).map((s) =>` |
| 61–63 | Variable references to `supervisor` | `s` or `staffMember` |
| 211 | `supervisorsCount: event.supervisorsList?.length \|\| 0` | `staffCount: event.staffList?.length \|\| 0` |

---

### 3.10 `screens/StaffPortalScreen.js`
| Line | Current | Change to |
|------|---------|-----------|
| 3 | comment: `Allows event supervisors to log in...` | `Allows event staff to log in...` |

> Rest of the file is already correct.

---

### 3.11 `components/events/EventDetails.js`
| Line | Current | Change to |
|------|---------|-----------|
| 47 | `event.supervisorsList?.length \|\| event.moderatorsCount \|\| 0` | `event.staffList?.length \|\| event.staffCount \|\| 0` |

---

### 3.12 `hooks/mutations/useEventMutations.js`
| Line | Current | Change to |
|------|---------|-----------|
| 111 | comment: `Hook to notify all active supervisors via SMS` | `Hook to notify all active staff via SMS` |

---

### 3.13 `components/admin-dashboard/events/UpdateEventForm.js`
| Line | Current | Change to |
|------|---------|-----------|
| 41 | `const moderatorsList = (eventData.supervisorsList \|\| []).map(...)` | `const staffList = (eventData.staffList \|\| []).map(...)` |
| 116 | `if (payload.supervisorsList)` | `if (payload.staffList)` |

---

### 3.14 `components/admin-dashboard/events/CreateEventForm.js`
| Line | Current | Change to |
|------|---------|-----------|
| 86–87 | `if (payload.supervisorsList)` | `if (payload.staffList)` |

---

### 3.15 `screens/admin-dashboard/EventDetailsScreen.js`
| Line | Current | Change to |
|------|---------|-----------|
| 378 | `supervisorsCount: event.supervisorsList?.length \|\| 0` | `staffCount: event.staffList?.length \|\| 0` |

---

## Section 4 — Already correct (do not touch)

| File | Already uses |
|------|-------------|
| `models/StaffAccessTokenModel.js` | `StaffAccessToken`, `generateToken`, `createForStaff`, `validateToken`, `revoke` (only comments need fixing — see 1.13) |
| `src/modules/staff/staff.service.js` | `verifyStaffAccess`, `getEventGuests`, `checkInByQR` |
| `src/modules/staff/staff.routes.js` | `/staff/verify` |
| `src/modules/staff/staff.controller.js` | `verifyStaffAccess` |
| `src/shared/utils/emailService.js` | `sendStaffAccessEmail` |
| `email/templates/index.js` | `staffAccess`, `staffAccessEmail` |
| `email/index.js` | `staffAccess` method |
| `models/PlanModel.js:26` | `hasStaffCheckIn` |
| `src/shared/constants/plans.js:66` | `hasStaffCheckIn` |
| `labbe/services/staff.js` | All staff endpoints |
| `labbe/hooks/reactQueryHooks/useStaff.js` | All staff hooks |
| `labbe/localization/locales/en/staff.json` | Entire file correct |
| `labbe/localization/locales/ar/staff.json` | Entire file correct |
| `halla-mobile/services/staffService.js` | Entire file correct |
| `halla-mobile/screens/StaffPortalScreen.js` | Correct except line 3 comment |
| `halla-mobile/navigation/AppNavigator.js` | `StaffPortalScreen` screen registration |
| `halla-mobile/config/api.js` lines 139–145 | `STAFF` endpoint block |

---

## Section 5 — Do NOT touch (different role)

`moderator` / `Moderator` in admin context = platform admin role, completely separate from event staff.

- `labbe/app/[lang]/admin-dash/moderators/` directory
- `localization/locales/en/admin.json` key `"moderators": "Moderators"`
- `models/UserModel.js` `role: 'moderator'`
- `ROLES.MODERATOR` in `roles.js`
- Any admin dashboard moderator CRUD screens

---

## Section 6 — Rename order

1. **DB migration** — run Section 7 script first to rename `supervisorsList` → `staffList` in MongoDB
2. **Backend model** — `EventModel.js` (1.1)
3. **Backend routes + service** — events.routes.js, events.service.js, admin.service.js, admin.controller.js, staffAuth.js (1.2–1.8)
4. **Backend role string** — staff.service.js (1.5)
5. **Backend plan flags** — PlanModel, plans.js, planDefaults.js (1.9–1.11)
6. **Backend email + comments** — staff.js template, StaffAccessTokenModel comments (1.12–1.13)
7. **Localization** — all en/ and ar/ JSON files (2.16–2.19) — do this before components so keys exist when components switch
8. **API config** — api.config.js in web and mobile (2.1, 3.1)
9. **Service layer** — createAndUpdateEvents.js, eventsService2.js, EventsService.js (2.2, 3.3, 3.4)
10. **Hooks + schemas** — mutation hooks, Zod schemas (2.3–2.6, 3.2)
11. **Components + file renames** — ModeratorsPopup → StaffPopup, AddSuperVisorPopup → AddStaffPopup, all component internals (2.7–2.15)

> **Section 3 (halla-mobile) is already complete** — skip it entirely.

---

## Section 7 — DB Migration Script

```js
// Step 1: verify scope
db.events.countDocuments({ supervisorsList: { $exists: true } })

// Step 2: migrate
db.events.updateMany(
  { supervisorsList: { $exists: true } },
  { $rename: { "supervisorsList": "staffList" } }
);

// Step 3: verify
db.events.countDocuments({ supervisorsList: { $exists: true } }) // must be 0
db.events.countDocuments({ staffList: { $exists: true } })       // must match step 1 count

// Rollback if needed
db.events.updateMany(
  { staffList: { $exists: true } },
  { $rename: { "staffList": "supervisorsList" } }
);
```

Also rename the plan feature flag in existing plan documents:

```js
db.plans.updateMany(
  { hasGateKeeperAssignment: { $exists: true } },
  { $rename: { "hasGateKeeperAssignment": "hasStaffAssignment" } }
);
```

---

## Section 11 — Final Verification

Run after all changes are applied. Every command must return **zero results**.

```bash
# Backend — supervisor terms
grep -rn "supervisor\|supervisorsList\|supervisorId\|supervisorData\|supervisorSchema\|supervisorsCount\|gateKeeper\|hasGateKeeperAssignment" \
  --include="*.js" --exclude-dir=node_modules --exclude-dir=.git \
  labbe-backend-/

# Web — supervisor + wrong component names
grep -rn "supervisor\|supervisorsList\|supervisorId\|supervisorData\|supervisorSchema\|supervisorsCount\|gateKeeper\|hasGateKeeperAssignment\|ModeratorsPopup\|AddSuperVisorPopup" \
  --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.css" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=.git \
  labbe/

# Mobile — supervisor terms
grep -rn "supervisor\|supervisorsList\|supervisorId\|supervisorData\|supervisorSchema\|supervisorsCount\|gateKeeper\|hasGateKeeperAssignment" \
  --include="*.js" --include="*.ts" \
  --exclude-dir=node_modules --exclude-dir=.git \
  halla-mobile/

# DB — must both return 0
db.events.countDocuments({ supervisorsList: { $exists: true } })
db.plans.countDocuments({ hasGateKeeperAssignment: { $exists: true } })
```

> If grep returns hits in `admin-dash/moderators/` or `UserModel role: 'moderator'` — those are correct, ignore them (Section 5).
