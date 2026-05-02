import React from "react";
import StatusBadge from "../common/StatusBadge";
import { SectionCard, InfoRow } from "./HostSectionCard";

const HostInfoSection = ({ host, formatDate }) => (
  <SectionCard title="Contact & Account" icon="person-outline">
    <InfoRow icon="mail-outline"           label="Email"          value={host.email} />
    <InfoRow icon="call-outline"           label="Phone"          value={host.phoneNumber} />
    <InfoRow icon="time-outline"           label="Joined"         value={formatDate(host.createdAt)} />
    <InfoRow icon="log-in-outline"         label="Last Login"     value={formatDate(host.lastLogin)} />
    <InfoRow
      icon="shield-checkmark-outline"
      label="Email Verified"
      badge={<StatusBadge status={host.emailVerified ? "verified" : "pending"} size="small" />}
      last
    />
  </SectionCard>
);

export default HostInfoSection;
