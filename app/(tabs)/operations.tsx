import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';
import { OperationsWorkspace } from '@/src/features/rescue/screens/OperationsWorkspace';

export default function OperationsScreen() {
  const role = useAuthStore((state) => state.profile?.role);
  if (role !== 'admin') return <Redirect href="/(tabs)" />;
  return <OperationsWorkspace />;
}
