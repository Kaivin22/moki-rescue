export type SceneId = 'mountain' | 'beach' | 'hoian' | 'bridge' | 'city';

export interface SceneConfig {
  id: SceneId;
  label: string;
  /** Gradient nền (3 điểm: đỉnh → giữa → chân trời). */
  sky: readonly [string, string, string];
}

export const Scenes: Record<SceneId, SceneConfig> = {
  mountain: {
    id: 'mountain',
    label: 'Bà Nà Hills',
    sky: ['#254A4A', '#3E6E63', '#6E9A7E'],
  },
  beach: {
    id: 'beach',
    label: 'Biển Mỹ Khê',
    sky: ['#0D3A4A', '#1C726F', '#E8C24A'],
  },
  hoian: {
    id: 'hoian',
    label: 'Phố cổ Hội An',
    sky: ['#1A1206', '#3A2A10', '#6E4A1E'],
  },
  bridge: {
    id: 'bridge',
    label: 'Cầu Rồng Đà Nẵng về đêm',
    sky: ['#050D1A', '#0A1A2E', '#173252'],
  },
  city: {
    id: 'city',
    label: 'Thành phố Đà Nẵng',
    sky: ['#050D1A', '#0A1A2E', '#173252'],
  },
};
