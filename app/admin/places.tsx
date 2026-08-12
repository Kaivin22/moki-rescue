import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView,
  Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { AppButton } from '@/src/components/atoms/AppButton';
import { useAuthStore } from '@/src/stores/authStore';
import type { Place } from '@/src/types/place';
import { CATEGORIES, SUITABLE_FOR, categoryLabel } from '@/src/utils/format';
import { MAX_PLACE_IMAGES, uploadPlaceImage, storagePathFromPublicUrl, removePlaceImages } from '@/src/features/places/api/placeImageStorage';
import {
  useAdminAllPlaces,
  useDeletePlace,
  useTogglePlaceActive,
  useUpsertPlace,
} from '@/src/features/places/api/adminPlaceQueries';
import { PLANNING_LIMITS } from '@/src/features/itinerary/config/planningPolicy';

// ─── Constants ────────────────────────────────────────────────────────────────
const BEST_TIME_OPTIONS = ['morning', 'afternoon', 'evening', 'night', 'anytime'];
const WEEKDAYS = [
  { value: 1, label: 'T2' }, { value: 2, label: 'T3' }, { value: 3, label: 'T4' },
  { value: 4, label: 'T5' }, { value: 5, label: 'T6' }, { value: 6, label: 'T7' },
  { value: 7, label: 'CN' },
];

// ─── Hooks ───────────────────────────────────────────────────────────────────
// ─── Place Form Modal ────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '',
  description: '',
  source_name: '',
  source_url: '',
  address: '',
  city: 'Đà Nẵng',
  lat: '',
  lng: '',
  category: 'beach',
  tags: '',
  suitable_for: [] as string[],
  avg_duration_min: '',
  opening_time: '',
  closing_time: '',
  opening_days: [] as number[],
  best_time_of_day: '',
  image_urls: [] as string[],
  is_active: true,
};

type FormData = typeof EMPTY_FORM;

function PlaceFormModal({
  visible,
  place,
  onClose,
}: {
  visible: boolean;
  place: Place | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const upsert = useUpsertPlace();
  const { user, profile } = useAuthStore();

  React.useEffect(() => {
    if (visible) {
      if (place) {
        setForm({
          name: place.name ?? '',
          description: place.description ?? '',
          source_name: place.source_name ?? '',
          source_url: place.source_url ?? '',
          address: place.address ?? '',
          city: place.city ?? 'Đà Nẵng',
          lat: String(place.lat ?? ''),
          lng: String(place.lng ?? ''),
          category: place.category ?? 'beach',
          tags: (place.tags ?? []).join(', '),
          suitable_for: place.suitable_for ?? [],
          avg_duration_min: String(place.avg_duration_min ?? ''),
          opening_time: place.opening_time?.slice(0, 5) ?? '',
          closing_time: place.closing_time?.slice(0, 5) ?? '',
          opening_days: place.opening_days ?? [],
          best_time_of_day: place.best_time_of_day ?? '',
          image_urls: place.image_urls ?? [],
          is_active: place.is_active ?? true,
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [visible, place]);

  const set = useCallback((key: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleSuitable = (val: string) => {
    setForm(prev => ({
      ...prev,
      suitable_for: prev.suitable_for.includes(val)
        ? prev.suitable_for.filter(s => s !== val)
        : [...prev.suitable_for, val],
    }));
  };

  const pickImages = async () => {
    const remaining = MAX_PLACE_IMAGES - form.image_urls.length;
    if (remaining <= 0) {
      Alert.alert('Tối đa 10 ảnh', 'Hãy xóa một ảnh trước khi thêm ảnh mới.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập ảnh', 'Hãy cho phép truy cập thư viện ảnh để tiếp tục.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });
    if (!result.canceled) {
      set('image_urls', [...form.image_urls, ...result.assets.map(asset => asset.uri)].slice(0, MAX_PLACE_IMAGES));
    }
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= form.image_urls.length) return;
    const next = [...form.image_urls];
    [next[index], next[target]] = [next[target], next[index]];
    set('image_urls', next);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim() || !form.category || !form.source_name.trim() || !/^https?:\/\//i.test(form.source_url.trim())) {
      Alert.alert('Thiếu thông tin', 'Hãy điền tên, địa chỉ, thể loại và nguồn kiểm chứng có liên kết http(s).');
      return;
    }
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    const duration = Number(form.avg_duration_min);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      Alert.alert('Tọa độ không hợp lệ', 'Vĩ độ phải từ -90 đến 90 và kinh độ từ -180 đến 180.');
      return;
    }
    if (!Number.isFinite(duration)
      || duration < PLANNING_LIMITS.minPlaceDurationMin
      || duration > PLANNING_LIMITS.maxPlaceDurationMin) {
      Alert.alert(
        'Thời lượng không hợp lệ',
        `Thời gian tham quan phải từ ${PLANNING_LIMITS.minPlaceDurationMin} đến ${PLANNING_LIMITS.maxPlaceDurationMin} phút.`,
      );
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.opening_time) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.closing_time)) {
      Alert.alert('Giờ hoạt động không hợp lệ', 'Hãy nhập giờ thật theo định dạng HH:mm.');
      return;
    }
    if (form.opening_days.length === 0) {
      Alert.alert('Thiếu ngày hoạt động', 'Hãy chọn ít nhất một ngày mở cửa.');
      return;
    }
    const uploadedPaths: string[] = [];
    try {
      if (!user?.id) throw new Error('Phiên đăng nhập không hợp lệ.');
      const editorId = user.id;
      const imageUrls: string[] = [];
      for (const uri of form.image_urls) {
        if (/^https?:\/\//i.test(uri)) {
          imageUrls.push(uri);
        } else {
          const uploaded = await uploadPlaceImage(uri, editorId);
          uploadedPaths.push(uploaded.path);
          imageUrls.push(uploaded.url);
        }
      }
      const payload: Partial<Place> & { id?: string } = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        source_name: form.source_name.trim(),
        source_url: form.source_url.trim(),
        address: form.address.trim(),
        city: form.city.trim() || 'Đà Nẵng',
        lat,
        lng,
        category: form.category as Place['category'],
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        suitable_for: form.suitable_for,
        avg_duration_min: duration,
        opening_time: form.opening_time,
        closing_time: form.closing_time,
        opening_days: form.opening_days,
        best_time_of_day: form.best_time_of_day || null,
        // Editors submit a draft. Only an admin can publish/unpublish it.
        is_active: profile?.role === 'admin' ? form.is_active : place?.is_active ?? false,
        content_status: profile?.role === 'admin'
          ? (form.is_active ? 'published' : 'draft')
          : 'pending_review',
        image_urls: imageUrls,
        best_months: place?.best_months ?? [],
      };
      if (place?.id) payload.id = place.id;
      await upsert.mutateAsync(payload);
      const removedPaths = profile?.role === 'admin' ? (place?.image_urls ?? [])
        .filter(url => !imageUrls.includes(url))
        .map(storagePathFromPublicUrl)
        .filter((path): path is string => !!path) : [];
      if (removedPaths.length > 0) {
        await removePlaceImages(removedPaths);
      }
      Alert.alert('Thành công', profile?.role === 'editor' ? 'Nội dung đã được gửi tới hàng chờ duyệt.' : (place ? 'Đã cập nhật địa điểm.' : 'Đã tạo địa điểm mới.'));
      onClose();
    } catch (e: any) {
      if (uploadedPaths.length > 0) {
        await removePlaceImages(uploadedPaths);
      }
      Alert.alert('Lỗi', e.message ?? 'Không thể lưu địa điểm.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={formStyles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={formStyles.header}>
          <TouchableOpacity onPress={onClose} style={formStyles.headerBtn}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: Colors.primaryDark }]}>
            {place ? 'Chỉnh sửa địa điểm' : 'Thêm địa điểm mới'}
          </Text>
          <TouchableOpacity onPress={handleSave} style={formStyles.saveBtn} disabled={upsert.isPending}>
            {upsert.isPending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={formStyles.saveBtnText}>Lưu</Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={formStyles.body} showsVerticalScrollIndicator={false}>
            {/* Thông tin cơ bản */}
            <Text style={formStyles.sectionTitle}>📍 Thông tin cơ bản</Text>

            <FormField label="Tên địa điểm *" value={form.name} onChangeText={v => set('name', v)} placeholder="VD: Bãi biển Mỹ Khê" />
            <FormField label="Địa chỉ *" value={form.address} onChangeText={v => set('address', v)} placeholder="Số nhà, đường, phường..." />
            <FormField label="Thành phố" value={form.city} onChangeText={v => set('city', v)} placeholder="Đà Nẵng" />
            <FormField label="Mô tả" value={form.description} onChangeText={v => set('description', v)} placeholder="Giới thiệu về địa điểm..." multiline />
            <FormField label="Tên nguồn kiểm chứng *" value={form.source_name} onChangeText={v => set('source_name', v)} placeholder="Ví dụ: Website chính thức" />
            <FormField label="Liên kết nguồn *" value={form.source_url} onChangeText={v => set('source_url', v)} placeholder="https://..." keyboardType="url" />

            {/* Tọa độ */}
            <Text style={formStyles.sectionTitle}>🗺️ Tọa độ</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <FormField label="Vĩ độ (Lat)" value={form.lat} onChangeText={v => set('lat', v)} placeholder="16.0471" keyboardType="numeric" style={{ flex: 1 }} />
              <FormField label="Kinh độ (Lng)" value={form.lng} onChangeText={v => set('lng', v)} placeholder="108.2068" keyboardType="numeric" style={{ flex: 1 }} />
            </View>

            {/* Thể loại */}
            <Text style={formStyles.sectionTitle}>🏷️ Thể loại *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingVertical: 4 }}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[formStyles.chip, form.category === cat.id && formStyles.chipActive]}
                  onPress={() => set('category', cat.id)}
                >
                  <Text style={[formStyles.chipText, form.category === cat.id && formStyles.chipTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Tags */}
            <FormField
              label="Tags (cách nhau bởi dấu phẩy)"
              value={form.tags}
              onChangeText={v => set('tags', v)}
              placeholder="photo, beach, check-in, family..."
            />

            {/* Phù hợp cho */}
            <Text style={formStyles.sectionTitle}>👥 Phù hợp cho</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {SUITABLE_FOR.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[formStyles.chip, form.suitable_for.includes(opt.id) && formStyles.chipActive]}
                  onPress={() => toggleSuitable(opt.id)}
                >
                  <Text style={[formStyles.chipText, form.suitable_for.includes(opt.id) && formStyles.chipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={formStyles.sectionTitle}>🕐 Thời gian tham quan</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <FormField label="Mở cửa" value={form.opening_time} onChangeText={v => set('opening_time', v)} placeholder="07:00" style={{ flex: 1 }} />
              <FormField label="Đóng cửa" value={form.closing_time} onChangeText={v => set('closing_time', v)} placeholder="21:00" style={{ flex: 1 }} />
            </View>
            <FormField label="Thời gian tham quan (phút)" value={form.avg_duration_min} onChangeText={v => set('avg_duration_min', v)} placeholder="90" keyboardType="numeric" />
            <Text style={formStyles.fieldLabel}>Ngày mở cửa *</Text>
            <View style={formStyles.weekdays}>
              {WEEKDAYS.map(day => (
                <TouchableOpacity
                  key={day.value}
                  style={[formStyles.dayChip, form.opening_days.includes(day.value) && formStyles.chipActive]}
                  onPress={() => set('opening_days', form.opening_days.includes(day.value)
                    ? form.opening_days.filter(value => value !== day.value)
                    : [...form.opening_days, day.value].sort())}
                >
                  <Text style={[formStyles.chipText, form.opening_days.includes(day.value) && formStyles.chipTextActive]}>{day.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={formStyles.imagesHeader}>
              <Text style={formStyles.sectionTitle}>🖼️ Hình ảnh ({form.image_urls.length}/{MAX_PLACE_IMAGES})</Text>
              {profile?.role === 'admin' && <TouchableOpacity style={formStyles.addImageButton} onPress={pickImages}>
                <Ionicons name="images-outline" size={18} color={Colors.white} />
                <Text style={formStyles.addImageText}>Thêm ảnh</Text>
              </TouchableOpacity>}
            </View>
            <Text style={formStyles.imageHint}>{profile?.role === 'admin' ? 'Ảnh đầu tiên là ảnh bìa. Tối đa 10 ảnh, mỗi ảnh dưới 8 MB.' : 'Biên tập viên giữ nguyên ảnh đã duyệt; quản trị viên quản lý media công khai.'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={formStyles.imageList}>
              {form.image_urls.map((uri, index) => (
                <View key={`${uri}-${index}`} style={formStyles.imageItem}>
                  <Image source={{ uri }} style={formStyles.imagePreview} contentFit="cover" />
                  {profile?.role === 'admin' && <TouchableOpacity style={formStyles.removeImage} onPress={() => set('image_urls', form.image_urls.filter((_, i) => i !== index))} accessibilityLabel={`Xóa ảnh ${index + 1}`}>
                    <Ionicons name="close-circle" size={24} color={Colors.error} />
                  </TouchableOpacity>}
                  {profile?.role === 'admin' && <View style={formStyles.imageOrder}>
                    <TouchableOpacity disabled={index === 0} onPress={() => moveImage(index, -1)}><Ionicons name="chevron-back" size={20} color={index === 0 ? Colors.textMuted : Colors.primary} /></TouchableOpacity>
                    <Text style={formStyles.imageNumber}>{index + 1}</Text>
                    <TouchableOpacity disabled={index === form.image_urls.length - 1} onPress={() => moveImage(index, 1)}><Ionicons name="chevron-forward" size={20} color={index === form.image_urls.length - 1 ? Colors.textMuted : Colors.primary} /></TouchableOpacity>
                  </View>}
                </View>
              ))}
            </ScrollView>

            {/* Thời điểm tốt nhất */}
            <Text style={formStyles.sectionTitle}>🌅 Thời điểm lý tưởng</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingVertical: 4 }}>
              {BEST_TIME_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[formStyles.chip, form.best_time_of_day === opt && formStyles.chipActive]}
                  onPress={() => set('best_time_of_day', opt)}
                >
                  <Text style={[formStyles.chipText, form.best_time_of_day === opt && formStyles.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Trạng thái */}
            <Text style={formStyles.sectionTitle}>⚙️ Trạng thái</Text>
            <View style={formStyles.switchRow}>
              <Text style={Typography.body}>Công khai (chỉ Admin)</Text>
              <Switch
                value={form.is_active}
                onValueChange={v => set('is_active', v)}
                disabled={profile?.role !== 'admin'}
                trackColor={{ true: Colors.accent, false: Colors.divider }}
                thumbColor={Colors.white}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Form Field Helper ────────────────────────────────────────────────────────
function FormField({
  label, value, onChangeText, placeholder, multiline, keyboardType, style,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
  style?: any;
}) {
  return (
    <View style={[formStyles.field, style]}>
      <Text style={formStyles.fieldLabel}>{label}</Text>
      <TextInput
        style={[formStyles.fieldInput, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        numberOfLines={multiline ? 4 : 1}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminPlacesScreen() {
  const { profile } = useAuthStore();
  const role = profile?.role;
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [formVisible, setFormVisible] = useState(false);

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const placesQuery = useAdminAllPlaces(debouncedSearch, statusFilter);
  const places = useMemo(() => placesQuery.data?.pages.flat() ?? [], [placesQuery.data]);
  const toggleActive = useTogglePlaceActive();
  const deletePlace = useDeletePlace();

  const openEdit = (place: Place) => {
    setEditingPlace(place);
    setFormVisible(true);
  };

  const openCreate = () => {
    setEditingPlace(null);
    setFormVisible(true);
  };

  const handleToggleActive = (place: Place) => {
    Alert.alert(
      place.is_active ? 'Ẩn địa điểm?' : 'Công khai địa điểm?',
      `"${place.name}" sẽ ${place.is_active ? 'bị ẩn khỏi người dùng' : 'được hiển thị lại'}.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => toggleActive.mutate({ id: place.id, isActive: !place.is_active }),
        },
      ]
    );
  };

  const handleDelete = (place: Place) => {
    Alert.alert(
      'Xóa địa điểm?',
      `Hành động này không thể hoàn tác. "${place.name}" sẽ bị xóa vĩnh viễn.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => deletePlace.mutate(place.id),
        },
      ]
    );
  };

  const activeCount = places.filter(p => p.is_active).length;
  const inactiveCount = places.length - activeCount;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Quản lý Địa điểm</Text>
          <Text style={styles.headerSub}>
            {places.length} địa điểm · {activeCount} active · {inactiveCount} ẩn
          </Text>
        </View>
        <TouchableOpacity style={styles.exitBtn} onPress={() => router.replace('/(tabs)')}>
          <Ionicons name="exit-outline" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm địa điểm..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={Colors.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Chips */}
        <View style={styles.filterRow}>
          {(['all', 'active', 'inactive'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>
                {f === 'all' ? 'Tất cả' : f === 'active' ? 'Đang mở' : 'Đã ẩn'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      {placesQuery.isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : placesQuery.error ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={[Typography.body, { color: Colors.error, marginTop: 12 }]}>Không tải được dữ liệu</Text>
          <AppButton title="Thử lại" onPress={() => placesQuery.refetch()} loading={placesQuery.isRefetching} style={{ marginTop: 16 }} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {places.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={56} color={Colors.divider} />
              <Text style={[Typography.h3, { color: Colors.secondary, marginTop: 16 }]}>
                Không có địa điểm nào
              </Text>
            </View>
          ) : (
            places.map(place => (
              <PlaceRow
                key={place.id}
                place={place}
                onEdit={() => openEdit(place)}
                onToggle={() => handleToggleActive(place)}
                onDelete={() => handleDelete(place)}
                canPublish={role === 'admin'}
                canDelete={role === 'admin'}
              />
            ))
          )}
          {placesQuery.hasNextPage && (
            <AppButton title={placesQuery.isFetchingNextPage ? 'Đang tải…' : 'Tải thêm'} onPress={() => placesQuery.fetchNextPage()} loading={placesQuery.isFetchingNextPage} variant="outline" />
          )}
        </ScrollView>
      )}

      {/* FAB Add */}
      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Ionicons name="add" size={28} color={Colors.primaryDark} />
      </TouchableOpacity>

      {/* Edit / Create Modal */}
      <PlaceFormModal
        visible={formVisible}
        place={editingPlace}
        onClose={() => setFormVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Place Row Card ───────────────────────────────────────────────────────────
function PlaceRow({
  place,
  onEdit,
  onToggle,
  onDelete,
  canPublish,
  canDelete,
}: {
  place: Place;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  canPublish: boolean;
  canDelete: boolean;
}) {
  const CATEGORY_ICONS: Record<string, string> = {
    beach: 'water', mountain: 'triangle', food: 'restaurant', historical: 'business',
    viewpoint: 'eye', entertainment: 'game-controller', shopping: 'bag',
    wellness: 'leaf', nature: 'leaf',
  };

  return (
    <View style={styles.placeCard}>
      {/* Status Indicator */}
      <View style={[styles.statusDot, { backgroundColor: place.is_active ? Colors.accent : Colors.textMuted }]} />

      {/* Icon */}
      <View style={[styles.placeIcon, { backgroundColor: place.is_active ? Colors.primary + '20' : Colors.textMuted + '20' }]}>
        <Ionicons name={(CATEGORY_ICONS[place.category] ?? 'location') as any} size={20} color={place.is_active ? Colors.primary : Colors.textMuted} />
      </View>

      {/* Info */}
      <View style={styles.placeInfo}>
        <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
        <View style={styles.placeMeta}>
          <View style={[styles.categoryBadge, { backgroundColor: Colors.sky + '60' }]}>
            <Text style={styles.categoryText}>{categoryLabel(place.category)}</Text>
          </View>
          <Text style={styles.placeAddress} numberOfLines={1}>{place.address}</Text>
        </View>
        <View style={styles.placeStats}>
          <Ionicons name="star" size={12} color={Colors.warning} />
          <Text style={styles.placeStatText}>{place.rating_avg?.toFixed(1) ?? '—'}</Text>
          <Text style={styles.placeStatText}> · {place.rating_count ?? 0} đánh giá</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.placeActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
          <Ionicons name="create-outline" size={18} color={Colors.primary} />
        </TouchableOpacity>
        {canPublish && (
          <TouchableOpacity style={styles.actionBtn} onPress={onToggle}>
            <Ionicons
              name={place.is_active ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={place.is_active ? Colors.warning : Colors.success}
            />
          </TouchableOpacity>
        )}
        {canDelete && (
          <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    backgroundColor: Colors.primaryDark,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  headerTitle: { ...Typography.h3, color: Colors.white },
  headerSub: { ...Typography.caption, color: Colors.accentSoft, marginTop: 2 },
  exitBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },

  searchSection: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.background, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.divider,
  },
  searchInput: { flex: 1, ...Typography.body, color: Colors.textPrimary },

  filterRow: { flexDirection: 'row', gap: Spacing.sm },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.divider, backgroundColor: Colors.surface,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { ...Typography.caption, color: Colors.secondary },
  filterChipTextActive: { color: Colors.white, fontWeight: '700' },

  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100 },

  emptyState: { alignItems: 'center', marginTop: 60 },

  placeCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  placeIcon: {
    width: 44, height: 44, borderRadius: Radius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  placeInfo: { flex: 1 },
  placeName: { ...Typography.bodyBold, color: Colors.primaryDark },
  placeMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  categoryText: { ...Typography.caption, color: Colors.primaryDark, fontSize: 10, fontWeight: '700' },
  placeAddress: { ...Typography.caption, color: Colors.textMuted, flex: 1 },
  placeStats: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  placeStatText: { ...Typography.caption, color: Colors.secondary, fontSize: 11 },

  placeActions: { flexDirection: 'column', gap: 4 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.background,
  },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 8,
  },
});

const formStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  saveBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md,
    paddingVertical: 8, borderRadius: Radius.md, minWidth: 60,
    alignItems: 'center',
  },
  saveBtnText: { ...Typography.bodyBold, color: Colors.white },

  body: { padding: Spacing.lg, paddingBottom: 60, gap: Spacing.md },

  sectionTitle: {
    ...Typography.label, color: Colors.primaryDark,
    marginTop: Spacing.md, marginBottom: Spacing.xs,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  field: { gap: 6 },
  fieldLabel: { ...Typography.caption, color: Colors.secondary, fontWeight: '600' },
  fieldInput: {
    borderWidth: 1, borderColor: Colors.divider, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    ...Typography.body, color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },

  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Typography.caption, color: Colors.secondary },
  chipTextActive: { color: Colors.white, fontWeight: '700' },

  imagesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md },
  addImageButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 8 },
  addImageText: { ...Typography.caption, color: Colors.white, fontWeight: '700' },
  imageHint: { ...Typography.caption, color: Colors.textMuted },
  imageList: { gap: Spacing.sm, paddingVertical: Spacing.sm },
  imageItem: { width: 132, borderWidth: 1, borderColor: Colors.divider, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Colors.surface },
  imagePreview: { width: 132, height: 96 },
  removeImage: { position: 'absolute', right: 4, top: 4, backgroundColor: Colors.white, borderRadius: 12 },
  imageOrder: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingVertical: 5 },
  imageNumber: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '700' },
  weekdays: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  dayChip: { minWidth: 38, alignItems: 'center', paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.divider, backgroundColor: Colors.surface },

  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: Colors.divider, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
  },
});
