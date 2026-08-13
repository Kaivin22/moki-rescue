import React from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  TextInput, ActivityIndicator, Modal, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { Place } from '@/src/types/place';

interface PlaceSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  placeTab: 'all' | 'saved';
  setPlaceTab: (tab: 'all' | 'saved') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  placeSource: Place[];
  isLoadingPlaces: boolean;
  savedPlacesCount: number;
  onAddPlace: (place: Place) => void;
  selectedCount: number;
  maxSelectedCount: number;
  hasMore?: boolean;
  isFetchingMore?: boolean;
  onLoadMore?: () => void;
  loadError?: string | null;
  onRetry?: () => void;
}

export function PlaceSelectorModal({
  visible, onClose, placeTab, setPlaceTab,
  searchQuery, setSearchQuery, placeSource,
  isLoadingPlaces, savedPlacesCount, onAddPlace,
  selectedCount, maxSelectedCount, hasMore, isFetchingMore, onLoadMore,
  loadError, onRetry,
}: PlaceSelectorModalProps) {
  const limitReached = selectedCount >= maxSelectedCount;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {visible ? <StatusBar style="dark" /> : null}
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Chọn địa điểm</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Tab: Tất cả | Đã lưu */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, placeTab === 'all' && styles.tabActive]}
            onPress={() => setPlaceTab('all')}
          >
            <Ionicons name="earth" size={14} color={placeTab === 'all' ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.tabText, placeTab === 'all' && styles.tabTextActive]}>Tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, placeTab === 'saved' && styles.tabActive]}
            onPress={() => setPlaceTab('saved')}
          >
            <Ionicons name="heart" size={14} color={placeTab === 'saved' ? Colors.error : Colors.textMuted} />
            <Text style={[styles.tabText, placeTab === 'saved' && styles.tabTextActive]}>
              Đã lưu / Thích {savedPlacesCount > 0 ? `(${savedPlacesCount}${placeTab === 'saved' && hasMore ? '+' : ''})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm địa điểm..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <Text style={[styles.selectionCount, limitReached && styles.selectionCountLimit]}>
          Đã chọn {selectedCount}/{maxSelectedCount} địa điểm
          {limitReached ? ' · Hãy bỏ một địa điểm trước khi chọn thêm' : ''}
        </Text>

        {isLoadingPlaces ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : loadError ? (
          <View style={styles.errorState}>
            <Ionicons name="cloud-offline-outline" size={44} color={Colors.error} />
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={placeSource}
            keyExtractor={p => p.id}
            contentContainerStyle={{ padding: Spacing.md }}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.item, limitReached && styles.itemDisabled]}
                onPress={() => onAddPlace(item)}
                disabled={limitReached}
              >
                <View style={styles.itemLeft}>
                  <View style={styles.itemIcon}>
                    <Ionicons name="location" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemCat}>{item.category} · {item.avg_duration_min}ph</Text>
                  </View>
                </View>
                <Ionicons name="add-circle-outline" size={24} color={limitReached ? Colors.textMuted : Colors.primary} />
              </TouchableOpacity>
            )}
            onEndReached={hasMore && !isFetchingMore ? onLoadMore : undefined}
            onEndReachedThreshold={0.4}
            ListFooterComponent={isFetchingMore
              ? <ActivityIndicator size="small" color={Colors.primary} style={styles.listFooter} />
              : null}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 40, gap: Spacing.md }}>
                <Ionicons name={placeTab === 'saved' ? 'heart-outline' : 'search-outline'} size={48} color={Colors.divider} />
                <Text style={{ color: Colors.secondary, textAlign: 'center' }}>
                  {placeTab === 'saved'
                    ? 'Bạn chưa lưu địa điểm nào.\nHãy thích các địa điểm yêu thích để thêm nhanh vào lịch trình!'
                    : 'Không tìm thấy địa điểm'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
    backgroundColor: Colors.cardBg,
  },
  title: { ...Typography.h3, color: Colors.primary },
  tabBar: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.cardBg,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: 'transparent',
    backgroundColor: Colors.surfaceWarm,
  },
  tabActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '12' },
  tabText: { ...Typography.caption, color: Colors.textMuted, fontSize: 12 },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.full,
    gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.divider,
  },
  searchInput: { flex: 1, paddingVertical: Spacing.sm, ...Typography.body, color: Colors.textPrimary },
  selectionCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  selectionCountLimit: { color: Colors.error },
  item: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  itemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  itemIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  itemName: { ...Typography.bodyBold, color: Colors.textPrimary },
  itemCat: { ...Typography.caption, color: Colors.secondary },
  itemDisabled: { opacity: 0.45 },
  listFooter: { paddingVertical: Spacing.lg },
  errorState: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
  errorText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  retryButton: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.primary },
  retryText: { ...Typography.bodyBold, color: Colors.white },
});
