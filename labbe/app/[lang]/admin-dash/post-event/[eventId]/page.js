// Admin post-event management page.
//
// Mirrors the host post-event page exactly — same composer (caption, media,
// template, publish) and same published view. The underlying component reads
// `eventId` from the route via `useParams()` and fetches through
// `useHostPostEventContent`, whose backend endpoint is tenant/role-scoped
// (`post-event.service.buildScopedEventQuery`) so super-admins and
// tenant-scoped admins/moderators can manage events under their scope. Access
// to this route is gated by the admin-dash layout + middleware, identical to
// every other admin page. Re-exporting the host page keeps the two surfaces
// from drifting.
export { default } from "@/app/[lang]/host/post-event/[eventId]/page";
