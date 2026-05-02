import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import PropTypes from "prop-types";
import { StatusBadge } from "../common";
import {
  colors,
  spacing,
  textStyles,
  borderRadius,
  backgrounds,
} from "../../../styles/tokens";

/**
 * TicketDetailsCard Component
 *
 * Displays comprehensive ticket information in a card layout with organized sections.
 * Shows ticket details, submitter info, assignment, status, and response information.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.ticket - Ticket data object
 */
const TicketDetailsCard = ({ ticket }) => {
  /**
   * Get priority badge color based on priority level
   */
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return colors.error[500];
      case "medium":
        return colors.warning[500];
      case "low":
        return colors.info[500];
      default:
        return colors.natural[500];
    }
  };

  /**
   * Get status badge color based on status
   */
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "open":
        return colors.warning[500];
      case "in-progress":
      case "in_progress":
        return colors.info[500];
      case "resolved":
        return colors.success[500];
      case "closed":
        return colors.natural[500];
      default:
        return colors.natural[500];
    }
  };

  /**
   * Format status text for display
   */
  const formatStatus = (status) => {
    if (!status) return "Unknown";
    return status.replace("_", "-").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * Render a section with title and content
   */
  const renderSection = (title, content) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{content}</View>
    </View>
  );

  /**
   * Render a field row with label and value
   */
  const renderField = (label, value, isLast = false) => (
    <View style={[styles.fieldRow, isLast && styles.fieldRowLast]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || "N/A"}</Text>
    </View>
  );

  /**
   * Render a badge field row
   */
  const renderBadgeField = (label, badgeText, badgeColor, isLast = false) => (
    <View style={[styles.fieldRow, isLast && styles.fieldRowLast]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <StatusBadge status={badgeText} color={badgeColor} size="small" />
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Ticket Information Section */}
      {renderSection(
        "Ticket Information",
        <>
          {renderField("Ticket ID", `#${ticket.id}`)}
          {renderField("Subject", ticket.subject)}
          {renderField("Description", ticket.description)}
          {renderField("Category", ticket.category)}
          {renderBadgeField(
            "Priority",
            ticket.priority || "Low",
            getPriorityColor(ticket.priority),
            true,
          )}
        </>,
      )}

      {/* Submitter Information Section */}
      {renderSection(
        "Submitter Information",
        <>
          {renderField("Name", ticket.submitterName || ticket.submitter?.name)}
          {renderField(
            "Email",
            ticket.submitterEmail || ticket.submitter?.email,
          )}
          {renderField(
            "Phone",
            ticket.submitterPhone || ticket.submitter?.phone,
            true,
          )}
        </>,
      )}

      {/* Assignment Section */}
      {renderSection(
        "Assignment",
        <>
          {renderField(
            "Assigned To",
            ticket.assignedTo?.name || ticket.assignedToName || "Unassigned",
          )}
          {renderField("Assigned Date", formatDate(ticket.assignedAt), true)}
        </>,
      )}

      {/* Status Section */}
      {renderSection(
        "Status & Timeline",
        <>
          {renderBadgeField(
            "Current Status",
            formatStatus(ticket.status),
            getStatusColor(ticket.status),
          )}
          {renderField("Created Date", formatDate(ticket.createdAt))}
          {renderField("Last Updated", formatDate(ticket.updatedAt))}
          {renderField("Resolved Date", formatDate(ticket.resolvedAt), true)}
        </>,
      )}

      {/* Response Section */}
      {(ticket.response || ticket.resolutionMessage) &&
        renderSection(
          "Response",
          <View style={styles.responseContainer}>
            <Text style={styles.responseText}>
              {ticket.response || ticket.resolutionMessage}
            </Text>
          </View>,
        )}

      {/* Internal Notes Section */}
      {ticket.internalNotes &&
        renderSection(
          "Internal Notes",
          <View style={styles.notesContainer}>
            <Text style={styles.notesText}>{ticket.internalNotes}</Text>
          </View>,
        )}
    </ScrollView>
  );
};

TicketDetailsCard.propTypes = {
  ticket: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    subject: PropTypes.string,
    description: PropTypes.string,
    category: PropTypes.string,
    priority: PropTypes.string,
    status: PropTypes.string,
    submitterName: PropTypes.string,
    submitterEmail: PropTypes.string,
    submitterPhone: PropTypes.string,
    submitter: PropTypes.shape({
      name: PropTypes.string,
      email: PropTypes.string,
      phone: PropTypes.string,
    }),
    assignedTo: PropTypes.shape({
      name: PropTypes.string,
    }),
    assignedToName: PropTypes.string,
    assignedAt: PropTypes.string,
    createdAt: PropTypes.string,
    updatedAt: PropTypes.string,
    resolvedAt: PropTypes.string,
    response: PropTypes.string,
    resolutionMessage: PropTypes.string,
    internalNotes: PropTypes.string,
  }).isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: backgrounds.artboard,
  },
  section: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    padding: spacing[16],
    marginBottom: spacing[16],
  },
  sectionTitle: {
    ...textStyles.titleMedium,
    color: colors.natural[900],
    marginBottom: spacing[12],
  },
  sectionContent: {
    // Container for section content
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
  },
  fieldRowLast: {
    borderBottomWidth: 0,
  },
  fieldLabel: {
    ...textStyles.bodyMedium,
    color: colors.natural[500],
    flex: 1,
  },
  fieldValue: {
    ...textStyles.bodyMedium,
    color: colors.natural[900],
    flex: 2,
    textAlign: "right",
  },
  responseContainer: {
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[8],
    padding: spacing[12],
  },
  responseText: {
    ...textStyles.bodyMedium,
    color: colors.natural[900],
    lineHeight: 22,
  },
  notesContainer: {
    backgroundColor: colors.warning[50],
    borderRadius: borderRadius[8],
    padding: spacing[12],
    borderLeftWidth: 3,
    borderLeftColor: colors.warning[500],
  },
  notesText: {
    ...textStyles.bodySmall,
    color: colors.natural[700],
    lineHeight: 20,
    fontStyle: "italic",
  },
});

export default TicketDetailsCard;
