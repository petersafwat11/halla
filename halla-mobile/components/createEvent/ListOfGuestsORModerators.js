import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  FlatList
} from "react-native";
import EditGuestOrModeratorsModal from "./EditGuestOrModeratorsModal";
import Svg, { Path } from "react-native-svg";

const CloseIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke="#656565"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const EditIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path
      d="M14.1667 2.49993C14.3856 2.28106 14.6454 2.10744 14.9314 1.98899C15.2173 1.87054 15.5238 1.80957 15.8334 1.80957C16.1429 1.80957 16.4494 1.87054 16.7353 1.98899C17.0213 2.10744 17.2811 2.28106 17.5 2.49993C17.7189 2.7188 17.8925 2.97863 18.011 3.2646C18.1294 3.55057 18.1904 3.85706 18.1904 4.16659C18.1904 4.47612 18.1294 4.78262 18.011 5.06859C17.8925 5.35455 17.7189 5.61439 17.5 5.83326L6.25 17.0833L1.66667 18.3333L2.91667 13.7499L14.1667 2.49993Z"
      stroke="#C28E5C"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TrashIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path
      d="M2.5 5H4.16667H17.5M6.66667 5V3.33333C6.66667 2.89131 6.84226 2.46738 7.15482 2.15482C7.46738 1.84226 7.89131 1.66667 8.33333 1.66667H11.6667C12.1087 1.66667 12.5326 1.84226 12.8452 2.15482C13.1577 2.46738 13.3333 2.89131 13.3333 3.33333V5M15.8333 5V16.6667C15.8333 17.1087 15.6577 17.5326 15.3452 17.8452C15.0326 18.1577 14.6087 18.3333 14.1667 18.3333H5.83333C5.39131 18.3333 4.96738 18.1577 4.65482 17.8452C4.34226 17.5326 4.16667 17.1087 4.16667 16.6667V5H15.8333Z"
      stroke="#E74C3C"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PersonIcon = () => (
  <Svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <Path
      d="M33.3333 35V31.6667C33.3333 29.8986 32.631 28.2029 31.3807 26.9526C30.1305 25.7024 28.4348 25 26.6667 25H13.3333C11.5652 25 9.86953 25.7024 8.61929 26.9526C7.36905 28.2029 6.66667 29.8986 6.66667 31.6667V35M26.6667 11.6667C26.6667 15.3486 23.682 18.3333 20 18.3333C16.318 18.3333 13.3333 15.3486 13.3333 11.6667C13.3333 7.98477 16.318 5 20 5C23.682 5 26.6667 7.98477 26.6667 11.6667Z"
      stroke="#C28E5C"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ListOfGuestsORModerators = ({
  visible,
  onClose,
  title,
  list = [],
  type = "guest",
  onEdit,
  onRemove
}) => {
  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleSaveEdit = (id, updatedData) => {
    const result = onEdit(id, updatedData);
    if (result.success) {
      setShowEditModal(false);
      setEditingItem(null);
    }
    return result;
  };

  const renderItem = ({ item }) => (
    <View style={styles.listItem}>
      <View style={styles.listItemLeft}>
        <View style={styles.avatarContainer}>
          <PersonIcon />
        </View>
        <View style={styles.listItemInfo}>
          <Text style={styles.listItemName}>
            {item.name}
          </Text>
          <Text style={styles.listItemPhone}>
            {item.phone || item.mobile}
          </Text>
        </View>
      </View>

      <View style={styles.listItemActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEdit(item)}
          activeOpacity={0.7}
        >
          <EditIcon />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onRemove(item.id)}
          activeOpacity={0.7}
        >
          <TrashIcon />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <Text style={styles.headerTitle}>
                  {title}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <CloseIcon />
                </TouchableOpacity>
              </View>
              <Text style={styles.headerSubtitle}>
                إجمالي: {list.length} {type === "guest" ? "ضيف" : "مشرف"}
              </Text>
            </View>

            {/* List */}
            {list.length > 0 ? (
              <FlatList
                data={list}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  لا يوجد {type === "guest" ? "ضيوف" : "مشرفين"} حتى الآن
                </Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Modal */}
      {editingItem && (
        <EditGuestOrModeratorsModal
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingItem(null);
          }}
          item={editingItem}
          type={type}
          onSave={handleSaveEdit}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end"
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%"
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0"
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C"
  },  closeButton: {
    padding: 4
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    textAlign: "right"
  },
  headerSublistContent: {
    padding: 24
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#F9F4EF",
    borderRadius: 12,
    marginBottom: 12
  },
  listItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center"
  },
  listItemInfo: {
    flex: 1
  },
  listItemName: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C",
    marginBottom: 4,
    textAlign: "right"
  },  listItemPhone: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    textAlign: "right"
  },  listItemActions: {
    flexDirection: "row",
    gap: 12
  },
  actionButton: {
    padding: 8
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: "Cairo_400Regular",
    color: "#999"
  }
});

export default ListOfGuestsORModerators;
