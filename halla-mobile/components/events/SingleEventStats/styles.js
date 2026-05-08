import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F4EF"
  },
  actionsHeaderContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#FFF",
  },
  header: {
    backgroundColor: "#C28E5C",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },backButton: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center"
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#FFF",
    textAlign: "center",
    flex: 1
  },  actionButton: {
    justifyContent: "center",
    alignItems: "center"
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
    lineHeight: 16
  },
  reminderButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center"
  },
  reminderButtonText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF"
  },
  statsContainer: {
    paddingVertical: 24,
    paddingHorizontal: 12
  },
  statsCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  statsCardHeader: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12
  },
  statsCardTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 24,
  },  listContainer: {
    flex: 1,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    marginHorizontal: 12
  },
  list: {
    flex: 1
  },
  listContent: {
    padding: 12
  },
  fabColumn: {
    position: "absolute",
    right: 24,
    bottom: 100,
    alignItems: "center",
    gap: 12,
  },
  floatingButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#C28E5C",
    justifyContent: "center",
    alignItems: "center",
  },
  exportFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6B4E33",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: "#9CA3AF",
    lineHeight: 20
  }
});

export default styles;
