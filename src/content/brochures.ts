/**
 * 旧サイト（works.html）に載っていた書展パンフレットのうち、
 * 会期・会場が分からず microCMS の「書展」に登録できない回の一覧。
 * 会期が分かった回は microCMS に登録し、ここから消す。
 */
export interface Brochure {
  number: number;
  url: string;
}

const bib = (book: string) => `https://www.kushodo.club/bib/i/?book=${book}`;

const numbers = [
  134, 130, 128, 127, 126, 120, 119, 118, 117, 116, 115, 114, 113, 112, 111, 110, 109, 108, 107,
  106, 105, 104, 103, 102, 101, 100, 99, 98,
];

export const brochures: Brochure[] = numbers.map((number) => ({
  number,
  url: bib(number === 134 ? '134.epub' : String(number).padStart(3, '0')),
}));
