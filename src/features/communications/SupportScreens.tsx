import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { NavigationCard } from '@/src/components/atoms/NavigationCard';
import { useAuthStore } from '@/src/stores/authStore';
import { useI18n } from '@/src/i18n';
import { communicationApi as api, nextCursor, type Cursor, type TicketStatus } from './api';
import {
  CommunicationPage,
  QueryState,
  More,
  dateText,
  s,
  useLiveScreen,
  errorText,
  statusLabel,
  audienceLabel,
} from './shared';

// Reuse the identifier when retrying the same payload after a timeout.
function submissionId(ref: { current: { key: string; id: string } | null }, payload: unknown) {
  const key = JSON.stringify(payload);
  if (!ref.current || ref.current.key !== key) ref.current = { key, id: randomUUID() };
  return ref.current.id;
}
export function SupportListScreen() {
  const en = useI18n((state) => state.language === 'en');
  const profile = useAuthStore((state) => state.profile);
  const admin = profile?.role === 'admin';
  const [status, setStatus] = useState('all');
  const live = useLiveScreen();
  const query = useInfiniteQuery({
    queryKey: ['communication', profile?.id, 'tickets', status],
    initialPageParam: undefined as Cursor | undefined,
    queryFn: ({ pageParam }) => api.tickets(status, pageParam),
    getNextPageParam: nextCursor,
    enabled: !!profile && live,
    refetchInterval: live ? 15000 : false,
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <CommunicationPage
      title={
        admin
          ? en
            ? 'Support queue'
            : 'Quản lý phiếu hỗ trợ'
          : en
            ? 'My support tickets'
            : 'Phiếu hỗ trợ của tôi'
      }
      fallback={admin ? '/operator' : '/help'}
    >
      <Text style={s.body}>
        {en
          ? 'Discuss app/account issues here. Rescue complaints already have a linked conversation; do not submit the same issue twice. Not an emergency channel.'
          : 'Trao đổi vấn đề ứng dụng/tài khoản tại đây. Khiếu nại trong ca đã có cuộc trao đổi tương ứng, không cần gửi trùng. Đây không phải kênh cấp cứu.'}
      </Text>
      {!admin && (
        <AppButton
          title={en ? 'Create support ticket' : 'Tạo phiếu hỗ trợ'}
          onPress={() => router.push('/support/new' as Href)}
        />
      )}
      <View style={s.filters}>
        {['all', 'open', 'waiting_user', 'resolved', 'dismissed'].map((value) => (
          <AppButton
            key={value}
            title={statusLabel(value, en)}
            fullWidth={false}
            variant={status === value ? 'primary' : 'outline'}
            onPress={() => setStatus(value)}
          />
        ))}
      </View>
      <QueryState query={query} empty={!items.length} />
      {items.map((item) => (
        <NavigationCard
          key={item.id}
          icon="chatbubbles-outline"
          title={item.subject}
          description={`${statusLabel(item.status, en)}${admin ? ` · ${item.ownerName}` : ''}\n${dateText(item.updatedAt, en)}`}
          onPress={() => router.push(`/support/${item.id}` as Href)}
        />
      ))}
      <More query={query} />
    </CommunicationPage>
  );
}

export function NewSupportScreen() {
  const en = useI18n((state) => state.language === 'en');
  const admin = useAuthStore((state) => state.profile?.role === 'admin');
  const client = useQueryClient();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const draft = useRef<{ key: string; id: string } | null>(null);
  const mutation = useMutation({
    mutationFn: () => {
      const payload = { subject: subject.trim(), description: description.trim() };
      return api.createTicket({ ...payload, id: submissionId(draft, payload) });
    },
    onSuccess: (ticket) => {
      void client.invalidateQueries({ queryKey: ['communication'] });
      router.replace(`/support/${ticket.id}` as Href);
    },
  });
  if (admin) return <Redirect href={'/operator/support' as Href} />;
  return (
    <CommunicationPage
      title={en ? 'Create support ticket' : 'Tạo phiếu hỗ trợ'}
      fallback={'/support' as Href}
    >
      <Text style={s.body}>
        {en
          ? 'Describe the issue. Do not send passwords, OTP codes or payment credentials.'
          : 'Mô tả vấn đề cần hỗ trợ. Không gửi mật khẩu, mã OTP hoặc thông tin thanh toán nhạy cảm.'}
      </Text>
      <AppInput
        label={en ? 'Subject (5–160 characters)' : 'Tiêu đề (5–160 ký tự)'}
        value={subject}
        onChangeText={setSubject}
        maxLength={160}
        editable={!mutation.isPending}
      />
      <AppInput
        label={en ? 'Description (10–4000 characters)' : 'Mô tả (10–4000 ký tự)'}
        value={description}
        onChangeText={setDescription}
        maxLength={4000}
        multiline
        editable={!mutation.isPending}
      />
      {mutation.isError && (
        <Text accessibilityRole="alert" style={s.error}>
          {errorText(mutation.error, en)}
        </Text>
      )}
      <AppButton
        title={en ? 'Submit ticket' : 'Gửi phiếu'}
        disabled={subject.trim().length < 5 || description.trim().length < 10}
        loading={mutation.isPending}
        onPress={() => mutation.mutate()}
      />
    </CommunicationPage>
  );
}

export function IncidentConversationLink({ incidentId }: { incidentId: string }) {
  const en = useI18n((state) => state.language === 'en');
  return (
    <AppButton
      title={en ? 'Discuss this complaint' : 'Trao đổi về khiếu nại này'}
      variant="outline"
      onPress={() => router.push(`/support/incidents/${incidentId}` as Href)}
    />
  );
}
export function IncidentConversationScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const en = useI18n((state) => state.language === 'en');
  const userId = useAuthStore((state) => state.user?.id);
  const query = useQuery({
    queryKey: ['communication', userId, 'incident', id],
    queryFn: () => api.incident(id),
    enabled: !!userId && !!id,
  });
  if (query.data) return <Redirect href={`/support/${query.data.id}` as Href} />;
  return (
    <CommunicationPage title={en ? 'Complaint conversation' : 'Trao đổi khiếu nại'}>
      <QueryState query={query} />
    </CommunicationPage>
  );
}

export function SupportDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  return <SupportDetail key={id} id={id} />;
}
function SupportDetail({ id }: { id: string }) {
  const en = useI18n((state) => state.language === 'en');
  const profile = useAuthStore((state) => state.profile);
  const admin = profile?.role === 'admin';
  const client = useQueryClient();
  const live = useLiveScreen();
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [note, setNote] = useState('');
  const decisionVersion = useRef<number | null>(null);
  const draft = useRef<{ key: string; id: string } | null>(null);
  const query = useQuery({
    queryKey: ['communication', profile?.id, 'ticket', id],
    queryFn: () => api.ticket(id),
    enabled: !!profile && !!id && live,
    refetchInterval: live ? 10000 : false,
  });
  const messages = useInfiniteQuery({
    queryKey: ['communication', profile?.id, 'messages', id],
    initialPageParam: undefined as Cursor | undefined,
    queryFn: ({ pageParam }) => api.messages(id, pageParam),
    getNextPageParam: nextCursor,
    enabled: !!query.data && live,
    refetchInterval: live ? 10000 : false,
  });
  const refresh = () => client.invalidateQueries({ queryKey: ['communication'] });
  const reply = useMutation({
    mutationFn: () => {
      const payload = { body: body.trim(), internal: admin && internal };
      return api.reply(id, { ...payload, id: submissionId(draft, payload) });
    },
    onSuccess: () => {
      setBody('');
      draft.current = null;
      void refresh();
    },
  });
  const decision = useMutation({
    mutationFn: (status: TicketStatus) =>
      api.status(id, { version: decisionVersion.current ?? query.data!.version, status, note: note.trim() }),
    onSuccess: () => {
      setNote('');
      decisionVersion.current = null;
      void refresh();
    },
    onError: () => {
      decisionVersion.current = null;
      void refresh();
    },
  });
  const ticket = query.data;
  const closed = ticket?.status === 'resolved' || ticket?.status === 'dismissed';
  const busy = reply.isPending || decision.isPending;
  const rows = [
    ...new Map(
      (messages.data?.pages.flatMap((page) => page.items) ?? []).map((item) => [item.id, item]),
    ).values(),
  ].reverse();
  return (
    <CommunicationPage
      title={en ? 'Support conversation' : 'Trao đổi hỗ trợ'}
      fallback={(admin ? '/operator/support' : '/support') as Href}
    >
      <QueryState query={query} />
      {ticket && (
        <>
          <View style={s.card}>
            <Text style={s.title}>{ticket.subject}</Text>
            <Text style={s.body}>
              {statusLabel(ticket.status, en)} · {ticket.ownerName}
            </Text>
            <Text style={s.body}>{dateText(ticket.createdAt, en)}</Text>
            <Text selectable style={s.body}>
              {ticket.description}
            </Text>
            {ticket.incidentId && admin && (
              <AppButton
                title={en ? 'Related complaint' : 'Khiếu nại liên quan'}
                variant="outline"
                onPress={() => router.push(`/operator/incidents/${ticket.incidentId}` as Href)}
              />
            )}
          </View>
          <Text style={s.body}>
            {en
              ? 'Refreshes every 10 seconds while this page is open. Public replies are visible to the requester and administrators.'
              : 'Tự cập nhật mỗi 10 giây khi đang mở trang. Phản hồi công khai trong phiếu chỉ người gửi phiếu và admin được xem.'}
          </Text>
          <QueryState query={messages} empty={!rows.length} />
          <More query={messages} />
          {rows.map((message) => (
            <View key={message.id} style={[s.card, message.internal && s.private]}>
              <Text style={s.title}>
                {message.internal ? (en ? '[Internal note] ' : '[Ghi chú nội bộ] ') : ''}
                {message.authorRole === 'system'
                  ? en
                    ? 'Resolution / status update'
                    : 'Kết quả / cập nhật trạng thái'
                  : `${message.authorName ?? audienceLabel(message.authorRole, en)} · ${audienceLabel(message.authorRole, en)}`}
              </Text>
              <Text style={s.body}>{dateText(message.createdAt, en)}</Text>
              <Text selectable style={s.body}>
                {message.body}
              </Text>
            </View>
          ))}
          {closed ? (
            <Text style={s.body}>
              {en
                ? 'This ticket is closed. For a new issue, create a new ticket.'
                : 'Phiếu đã đóng. Nếu có vấn đề mới, hãy tạo phiếu mới.'}
            </Text>
          ) : (
            <View style={s.card}>
              {admin && (
                <>
                  <Text style={s.title}>
                    {en ? 'Internal note (administrators only)' : 'Ghi chú nội bộ (chỉ admin xem)'}
                  </Text>
                  <Switch
                    value={internal}
                    onValueChange={setInternal}
                    disabled={busy}
                    accessibilityLabel={en ? 'Internal note' : 'Ghi chú nội bộ'}
                  />
                </>
              )}
              <AppInput
                label={
                  internal && admin
                    ? en
                      ? 'Internal note'
                      : 'Nội dung ghi chú nội bộ'
                    : en
                      ? 'Reply to the conversation'
                      : 'Nội dung phản hồi'
                }
                value={body}
                onChangeText={setBody}
                maxLength={4000}
                multiline
                editable={!busy}
              />
              {reply.isError && (
                <Text accessibilityRole="alert" style={s.error}>
                  {errorText(reply.error, en)}
                </Text>
              )}
              <AppButton
                title={
                  internal && admin
                    ? en
                      ? 'Save internal note'
                      : 'Lưu ghi chú nội bộ'
                    : en
                      ? 'Send reply'
                      : 'Gửi phản hồi'
                }
                loading={reply.isPending}
                disabled={!body.trim() || decision.isPending}
                onPress={() => reply.mutate()}
              />
            </View>
          )}
          {admin && !closed && (
            <View style={s.card}>
              <Text style={s.title}>
                {en ? 'Update status / close ticket' : 'Cập nhật trạng thái / đóng phiếu'}
              </Text>
              <AppInput
                label={
                  en
                    ? 'Reason visible to the user (5–500 characters)'
                    : 'Lý do gửi cho người dùng (5–500 ký tự)'
                }
                value={note}
                onChangeText={(value) => {
                  if (decisionVersion.current == null) decisionVersion.current = ticket.version;
                  setNote(value);
                }}
                maxLength={500}
                multiline
                editable={!busy}
              />
              {decision.isError && (
                <Text accessibilityRole="alert" style={s.error}>
                  {errorText(decision.error, en)}
                </Text>
              )}
              {(['open', 'waiting_user', 'resolved', 'dismissed'] as const)
                .filter((value) => value !== ticket.status)
                .map((value) => (
                  <AppButton
                    key={value}
                    title={statusLabel(value, en)}
                    variant={value === 'resolved' ? 'primary' : 'outline'}
                    loading={decision.isPending}
                    disabled={note.trim().length < 5 || reply.isPending}
                    onPress={() => decision.mutate(value)}
                  />
                ))}
            </View>
          )}
        </>
      )}
    </CommunicationPage>
  );
}
