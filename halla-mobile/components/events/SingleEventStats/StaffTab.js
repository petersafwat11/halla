import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ModeratorListItem from "../ModeratorListItem";
import { listStaffTokens } from "../../../services/eventsService2";
import styles from "./styles";

/**
 * Authoritative staff-token state from `GET /events/:eventId/staff-tokens`.
 * Indexed by normalized phone (the staff sub-doc _id is the natural key on
 * the FE, but the token list groups by phone since multiple tokens can
 * exist per staff member). Newest token wins (the endpoint sorts by
 * createdAt desc).
 */
const useStaffTokens = (eventId, active) => {
  const [staffTokensByPhone, setStaffTokensByPhone] = useState({});

  const refreshStaffTokens = useCallback(async () => {
    if (!eventId) return;
    try {
      const resp = await listStaffTokens(eventId);
      const tokens = resp?.tokens || [];
      const byPhone = {};
      for (const tok of tokens) {
        const phoneKey = (tok.phone || "").trim();
        if (!byPhone[phoneKey]) byPhone[phoneKey] = tok;
      }
      setStaffTokensByPhone(byPhone);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[SingleEventStats] listStaffTokens failed:", e?.message);
    }
  }, [eventId]);

  useEffect(() => {
    if (active) refreshStaffTokens();
  }, [active, refreshStaffTokens]);

  return { staffTokensByPhone, refreshStaffTokens };
};

const StaffTabContent = ({
  stats,
  searchQuery,
  staffActions,
  staffTokensByPhone,
  onEdit,
  onDelete,
  onRevoke,
}) => {
  const staff = useMemo(
    () =>
      (stats?.staff || []).map((s) => {
        const id = s._id || s.id || String(Math.random());
        const local = staffActions[id] || {};
        const phoneKey = (s.phone || "").trim();
        const tokenRow = staffTokensByPhone[phoneKey];
        return {
          id,
          name: s.name || "مشرف",
          phone: s.phone || "",
          isRevoked: !!(tokenRow?.isRevoked || s.isRevoked || local.revoked),
          isExpired: !!tokenRow?.isExpired,
          lastUsedAt: tokenRow?.lastUsedAt || null,
          useCount: tokenRow?.useCount || 0,
        };
      }),
    [stats?.staff, staffActions, staffTokensByPhone]
  );

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (m) => m.name.toLowerCase().includes(q) || m.phone.includes(q)
    );
  }, [staff, searchQuery]);

  if (filteredStaff.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="person-add-outline" size={40} color="#C8C8C8" />
        <Text style={styles.emptyStateText}>لا يوجد مشرفين حالياً</Text>
      </View>
    );
  }

  return filteredStaff.map((item, index) => (
    <ModeratorListItem
      key={item.id || index}
      moderator={item}
      onEdit={onEdit}
      onDelete={onDelete}
      onRevoke={onRevoke}
      index={index}
    />
  ));
};

export { useStaffTokens };
export default StaffTabContent;
