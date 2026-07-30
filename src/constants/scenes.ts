import { ImageSourcePropType } from 'react-native';
import { Colors } from './colors';

export type SceneId = 'mountain' | 'beach' | 'hoian' | 'bridge' | 'city';

export interface SceneConfig {
  id: SceneId;
  label: string;
  source: ImageSourcePropType;
  tint: string;
  duration: number;
}

export const Scenes: Record<SceneId, SceneConfig> = {
  mountain: {
    id: 'mountain',
    label: 'Bà Nà Hills',
    source: require('../../assets/images/mountain_animation.png'),
    tint: Colors.sceneMountain,
    duration: 32000,
  },
  beach: {
    id: 'beach',
    label: 'Biển Mỹ Khê',
    source: require('../../assets/images/beach_animation.png'),
    tint: Colors.sceneBeach,
    duration: 28000,
  },
  hoian: {
    id: 'hoian',
    label: 'Phố cổ Hội An',
    source: require('../../assets/images/hoian_animation.png'),
    tint: Colors.sceneHoiAn,
    duration: 30000,
  },
  bridge: {
    id: 'bridge',
    label: 'Cầu Đà Nẵng về đêm',
    source: require('../../assets/images/danang_city_panorama.png'),
    tint: Colors.sceneBridge,
    duration: 34000,
  },
  city: {
    id: 'city',
    label: 'Thành phố Đà Nẵng',
    source: require('../../assets/images/danang_city_panorama.png'),
    tint: Colors.sceneBridge,
    duration: 34000,
  },
};

/** Alternate wide panorama for mountain headers */
export const MountainPanorama = require('../../assets/images/mountain_panorama.png');
