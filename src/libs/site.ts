export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: '書道部について', href: '/about' },
  { label: '書展', href: '/exhibitions' },
  { label: 'お知らせ', href: '/news' },
  { label: '入部案内', href: '/about#join' },
];

export const SITE = {
  name: '京都大学書道部',
  nameEn: 'Kyoto University Calligraphy Club',
  domain: 'kushodo.club',
  url: 'https://kushodo.club',
  founded: 1949,
  description:
    '京都大学公認の書道サークル。漢字・かな・篆刻を中心に、年2回の学外書展を建仁寺で開催。経験不問。',
};
