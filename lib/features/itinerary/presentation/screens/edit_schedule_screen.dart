import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/tokens/app_colors.dart';
import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';

import '../../../../shared/widgets/molecules/place_timeline_tile.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-29: EditScheduleScreen
/// Existing timeline với inline edit: time picker, note, delete
/// Floating "+ Add place" button
/// ═══════════════════════════════════════════════════════

class EditScheduleScreen extends StatefulWidget {
  const EditScheduleScreen({
    super.key,
    required this.itineraryId,
    required this.itineraryTitle,
    required this.numDays,
  });

  final String itineraryId;
  final String itineraryTitle;
  final int numDays;

  @override
  State<EditScheduleScreen> createState() => _EditScheduleScreenState();
}

class _EditScheduleScreenState extends State<EditScheduleScreen> {
  int _selectedDay = 0;
  bool _hasChanges = false;

  late List<List<_EditablePlace>> _dayPlaces;

  @override
  void initState() {
    super.initState();
    _dayPlaces = [
      [
        _EditablePlace(
          id: 'p1',
          name: 'Bãi biển Mỹ Khê',
          emoji: '🏖',
          timeStart: TimeOfDay(hour: 7, minute: 0),
          durationMin: 120,
          note: '',
        ),
        _EditablePlace(
          id: 'p2',
          name: 'Ngũ Hành Sơn',
          emoji: '⛰',
          timeStart: TimeOfDay(hour: 10, minute: 0),
          durationMin: 90,
          note: 'Mua vé trước',
        ),
      ],
      [
        _EditablePlace(
          id: 'p3',
          name: 'Bà Nà Hills',
          emoji: '🎡',
          timeStart: TimeOfDay(hour: 8, minute: 0),
          durationMin: 360,
          note: '',
        ),
      ],
      if (widget.numDays > 2)
        [
          _EditablePlace(
            id: 'p4',
            name: 'Phố cổ Hội An',
            emoji: '🏮',
            timeStart: TimeOfDay(hour: 9, minute: 0),
            durationMin: 180,
            note: 'Thuê đèn lồng',
          ),
        ],
    ];
  }

  Future<void> _editTime(int placeIndex) async {
    final place = _dayPlaces[_selectedDay][placeIndex];
    final picked = await showTimePicker(
      context: context,
      initialTime: place.timeStart,
      builder: (ctx, child) => MediaQuery(
        data: MediaQuery.of(ctx).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() {
        _dayPlaces[_selectedDay][placeIndex] = place.copyWith(
          timeStart: picked,
        );
        _hasChanges = true;
      });
    }
  }

  Future<void> _editNote(int placeIndex) async {
    final place = _dayPlaces[_selectedDay][placeIndex];
    final controller = TextEditingController(text: place.note);
    final result = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(
          'Ghi chú',
          style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w600),
        ),
        content: TextField(
          controller: controller,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'Thêm ghi chú cho địa điểm này...',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Huỷ'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Lưu'),
          ),
        ],
      ),
    );
    if (result != null) {
      setState(() {
        _dayPlaces[_selectedDay][placeIndex] = place.copyWith(note: result);
        _hasChanges = true;
      });
    }
    controller.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final current = _selectedDay < _dayPlaces.length
        ? _dayPlaces[_selectedDay]
        : <_EditablePlace>[];

    return Scaffold(
      backgroundColor: AppColors.backgroundPrimary,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Chỉnh sửa',
              style: AppTextStyles.h4.copyWith(fontWeight: FontWeight.w700),
            ),
            Text(
              widget.itineraryTitle,
              style: AppTextStyles.caption.copyWith(
                color: AppColors.textSecondary,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
        backgroundColor: AppColors.backgroundPrimary,
        surfaceTintColor: Colors.transparent,
        actions: [
          if (_hasChanges)
            TextButton(
              onPressed: () {
                setState(() => _hasChanges = false);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('✅ Đã lưu lịch trình!')),
                );
                Navigator.pop(context);
              },
              child: Text(
                'Lưu',
                style: AppTextStyles.bodyMd.copyWith(
                  color: AppColors.actionPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          // ── Day tab selector ──
          SizedBox(
            height: 48,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.layoutSm,
              ),
              itemCount: widget.numDays,
              itemBuilder: (_, i) {
                final isActive = _selectedDay == i;
                return GestureDetector(
                  onTap: () => setState(() => _selectedDay = i),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    margin: const EdgeInsets.only(
                      right: AppSpacing.space2,
                      top: 4,
                      bottom: 4,
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.space4,
                    ),
                    decoration: BoxDecoration(
                      color: isActive
                          ? AppColors.actionPrimary
                          : AppColors.backgroundSecondary,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isActive
                            ? AppColors.actionPrimary
                            : AppColors.borderDefault,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        'Ngày ${i + 1}',
                        style: AppTextStyles.bodySm.copyWith(
                          color: isActive
                              ? AppColors.textOnPrimary
                              : AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // ── Editable timeline ──
          Expanded(
            child: ReorderableListView.builder(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.layoutSm,
                vertical: AppSpacing.space2,
              ),
              itemCount: current.length,
              onReorder: (old, fresh) => setState(() {
                final item = _dayPlaces[_selectedDay].removeAt(old);
                _dayPlaces[_selectedDay].insert(
                  fresh > old ? fresh - 1 : fresh,
                  item,
                );
                _hasChanges = true;
              }),
              itemBuilder: (_, i) {
                final place = current[i];
                final time =
                    '${place.timeStart.hour.toString().padLeft(2, '0')}:${place.timeStart.minute.toString().padLeft(2, '0')}';
                return Padding(
                  key: ValueKey(place.id + _selectedDay.toString()),
                  padding: const EdgeInsets.only(bottom: AppSpacing.space2),
                  child: GestureDetector(
                    onLongPress: () => _editNote(i),
                    child: PlaceTimelineTile(
                      placeName: '${place.emoji} ${place.name}',
                      arrivalTime: time,
                      durationMin: place.durationMin,
                      note: place.note.isNotEmpty ? place.note : null,
                      isLast: i == current.length - 1,
                      onTap: () => _editTime(i),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          context.push(AppRoutes.addPlaces);
        },
        backgroundColor: AppColors.actionPrimary,
        icon: const Icon(Icons.add_location_alt_rounded, color: Colors.white),
        label: Text(
          'Thêm địa điểm',
          style: AppTextStyles.bodyMd.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _EditablePlace {
  const _EditablePlace({
    required this.id,
    required this.name,
    required this.emoji,
    required this.timeStart,
    required this.durationMin,
    required this.note,
  });

  final String id;
  final String name;
  final String emoji;
  final TimeOfDay timeStart;
  final int durationMin;
  final String note;

  _EditablePlace copyWith({
    TimeOfDay? timeStart,
    String? note,
    int? durationMin,
  }) => _EditablePlace(
    id: id,
    name: name,
    emoji: emoji,
    timeStart: timeStart ?? this.timeStart,
    durationMin: durationMin ?? this.durationMin,
    note: note ?? this.note,
  );
}
