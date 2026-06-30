export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: '書道部について', href: '/about' },
  { label: '作品紹介', href: '/activities' },
  { label: 'お知らせ', href: '/news' },
  { label: '入部案内', href: '/about#join' },
];

export const SITE = {
  name: '京都大学書道部',
  nameEn: 'Kyoto University Calligraphy Club',
  domain: 'kushodo.club',
  url: 'https://kushodo.club',
  description:
    '京都大学公認の書道部。漢字・かな・篆刻の練習、年2回の学外書展、書道パフォーマンスなどを行っています。経験不問。',
};
