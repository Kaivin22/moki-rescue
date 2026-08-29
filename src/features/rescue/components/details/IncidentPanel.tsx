import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { Colors } from '@/src/constants/colors';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { useIncidentActions } from '@/src/features/rescue/hooks/useRescueActions';
import type { ProfileRole } from '@/src/types/profile';
import type { IncidentReport, RequestDetails } from '@/src/types/rescue';
import { useRescueDetailsCopy } from './rescueDetailsCopy';
import { rescueDetailsStyles as styles } from './rescueDetailsStyles';

export function IncidentPanel({ request, role }: { request: RequestDetails; role: ProfileRole }) {
  const actions = useIncidentActions(request.id);
  const c = useRescueDetailsCopy();
  const isStaff = role === 'dispatcher' || role === 'admin';
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<IncidentReport['category'] | null>(null);
  const [description, setDescription] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const busy = actions.report.isPending || actions.resolve.isPending;
  const categories = (Object.keys(c.incidentCategories) as IncidentReport['category'][]).filter(
    (value) => !request.incidentReports.some((report) => report.category === value),
  );

  const submit = async () => {
    if (!category || description.trim().length < 10) {
      setMessage(c.incidentRequired);
      return;
    }
    setMessage(null);
    try {
      await actions.report.mutateAsync({ category, description: description.trim() });
      setCategory(null);
      setDescription('');
      setOpen(false);
      setMessage(c.incidentSent);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.incidentError);
    }
  };

  const resolve = async (incidentId: string, decision: 'resolved' | 'dismissed') => {
    if (resolution.trim().length < 5) {
      setMessage(c.reasonRequired);
      return;
    }
    setMessage(null);
    try {
      await actions.resolve.mutateAsync({ incidentId, decision, note: resolution.trim() });
      setSelectedIncident(null);
      setResolution('');
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.actionError);
    }
  };

  return (
    <View style={styles.incidentPanel}>
      <Text style={styles.section}>{c.incidentTitle}</Text>
      <Text style={styles.infoLabel}>{c.incidentIntro}</Text>
      {request.incidentReports.map((incident) => (
        <View key={incident.id} style={styles.incidentCard}>
          <View style={styles.summaryTitleRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
            <Text style={styles.infoValue}>{c.incidentCategories[incident.category]}</Text>
          </View>
          <Text style={styles.infoLabel}>{incident.description}</Text>
          <Text style={styles.incidentStatus}>{c.incidentStatuses[incident.status]}</Text>
          {incident.resolutionNote ? <Text style={styles.infoLabel}>{incident.resolutionNote}</Text> : null}
          {isStaff && incident.status === 'open' ? (
            selectedIncident === incident.id ? (
              <View style={styles.actions}>
                <AppInput
                  label={c.incidentResolution}
                  value={resolution}
                  onChangeText={setResolution}
                  maxLength={500}
                  multiline
                />
                <AppButton
                  title={c.resolveIncident}
                  loading={busy}
                  onPress={() => void resolve(incident.id, 'resolved')}
                />
                <AppButton
                  title={c.dismissIncident}
                  variant="outline"
                  disabled={busy}
                  onPress={() => void resolve(incident.id, 'dismissed')}
                />
              </View>
            ) : (
              <AppButton
                title={c.incidentResolution}
                variant="outline"
                onPress={() => {
                  setSelectedIncident(incident.id);
                  setResolution('');
                  setMessage(null);
                }}
              />
            )
          ) : null}
        </View>
      ))}
      {!isStaff && categories.length > 0 ? (
        open ? (
          <View style={styles.actions}>
            <Text style={styles.fieldLabel}>{c.incidentCategory}</Text>
            <View accessibilityRole="radiogroup" style={styles.reasonList}>
              {categories.map((value) => {
                const selected = category === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={c.incidentCategories[value]}
                    accessibilityState={{ checked: selected }}
                    style={[styles.reasonOption, selected && styles.reasonOptionSelected]}
                    onPress={() => setCategory(value)}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={21}
                      color={selected ? Colors.primary : Colors.textMuted}
                    />
                    <Text style={styles.reasonOptionText}>{c.incidentCategories[value]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <AppInput
              label={c.incidentDescription}
              value={description}
              onChangeText={setDescription}
              placeholder={c.incidentPlaceholder}
              maxLength={1000}
              multiline
            />
            <AppButton title={c.reportIncident} loading={busy} onPress={() => void submit()} />
            <AppButton title={c.keep} variant="ghost" onPress={() => setOpen(false)} />
          </View>
        ) : (
          <AppButton title={c.reportIncident} variant="outline" onPress={() => setOpen(true)} />
        )
      ) : null}
      {message ? <Text style={styles.infoLabel}>{message}</Text> : null}
    </View>
  );
}
