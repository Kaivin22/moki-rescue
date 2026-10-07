import { Redirect, useLocalSearchParams } from 'expo-router';
import { OperatorPage } from '@/src/features/operator/OperatorPage';
import { ServiceCatalogEditor } from '@/src/features/rescue/components/ServiceCatalogEditor';
import { useI18n } from '@/src/i18n';

export default function EditServiceScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const english = useI18n((state) => state.language === 'en');
  if (typeof code !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(code))
    return <Redirect href="/operator/services" />;
  return (
    <OperatorPage title={english ? 'Edit service' : 'Chỉnh sửa dịch vụ'} fallback="/operator/services">
      <ServiceCatalogEditor key={code} serviceCode={code} />
    </OperatorPage>
  );
}
