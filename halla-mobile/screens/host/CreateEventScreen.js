import React from "react";
import CreateEventForm from "../../components/admin-dashboard/events/CreateEventForm";

/**
 * Host create-event screen. Per plan §13 this is now a thin wrapper —
 * `CreateEventForm` owns the 5-step wizard, subscription gating, preview
 * popup, and submission via `useCreateEvent` when `mode === 'host'`. Old
 * inline wizard / preview / info-popup state machine deleted.
 */
const CreateEventScreen = () => <CreateEventForm mode="host" />;

export default CreateEventScreen;
