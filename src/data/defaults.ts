import type { PhotoMemory, VaultSecuritySettings } from '../types';

export const DEFAULT_START_DATE = '2026-09-23T00:00:00';

export const DEFAULT_NOTE =
  'إنتي أحلى حاجة حصلتلي.\nكل يوم معاكي بيبقى أحلى من اللي قبله،\nوبحبك أكتر من إمبارح وأقل من بكرة.\n\nمن yoyo ليكي، من قلبي.';

export const DEFAULT_SONG_URL = '/media/default-song.mp3';

export const DEFAULT_SECURITY_SETTINGS: VaultSecuritySettings = {
  idleTimeoutMinutes: 5,
  blurOnHide: true,
};

export const SEED_MEMORIES: PhotoMemory[] = [
  {
    id: 'seed-1',
    image: '/media/seed-1.jpg',
    caption:
      'لو قعدت من هنا لبكرة مش هعرف أوصفلك بحبك إزاي. من أول مرة شوفتك وأنا اتشديت ليكي بجد، عملتي عشاني كتير وبتعملي حاجات عشاني مع إنك مش مجبورة تعملي كده، بس أثبتلي بجد إنك بنت جدعة وأقدر أسند فيكي وأنا مغمض. بحبك يا نور عيني ❤',
    createdAt: 1,
    isSeed: true,
  },
  {
    id: 'seed-2',
    image: '/media/seed-2.jpg',
    caption:
      'على طول معايا في كل حاجة، مبتحبيش تشوفيني مضايق، على طول بتعملي اللي عليكي وزيادة عشاني. I love you ❤',
    createdAt: 2,
    isSeed: true,
  },
];
