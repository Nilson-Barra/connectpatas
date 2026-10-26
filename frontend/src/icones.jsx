// Os mesmos traços do protótipo: contorno de 1.7, pontas arredondadas.
// Um componente só, caminho vindo por prop, para não carregar biblioteca.
const D = {
  paw: 'M12 13.5c2.4 0 4.3 1.9 4.3 3.8 0 1.4-1.1 2.4-2.5 2.4h-3.6c-1.4 0-2.5-1-2.5-2.4 0-1.9 1.9-3.8 4.3-3.8z',
  chart: 'M4 20V11M10 20V4M16 20v-6M2 20h20',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  chat: 'M21 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4.5 3v-4.6A7.5 7.5 0 0 1 3 11.5 7.5 7.5 0 0 1 10.5 4h3A7.5 7.5 0 0 1 21 11.5z',
  book: 'M5 4.5A1.5 1.5 0 0 1 6.5 3H19v14H6.5A1.5 1.5 0 0 0 5 18.5zM19 17v4H6.5',
  spark: 'M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9z',
  check: 'M20 6 9 17l-5-5',
  plus: 'M12 5v14M5 12h14',
  back: 'M19 12H5M12 19l-7-7 7-7',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  alert: 'M12 9v4.5M12 17.2h.01M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  shield: 'M12 21c4-1.6 7-5.4 7-9.6V6.2L12 3.4 5 6.2v5.2C5 15.6 8 19.4 12 21z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  edit: 'M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z',
  pin: 'M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 1.8',
  x: 'M18 6 6 18M6 6l12 12',
  image: 'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 20',
};

// A pata é a única com mais de um traço: a almofada e os três dedos.
const DEDOS = [[7.3, 10.4], [11, 7.6], [15.6, 8.6]];

export default function Icone({ nome, tamanho = 18, traco = 1.7 }) {
  return (
    <svg
      width={tamanho} height={tamanho} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={traco}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <path d={D[nome]} />
      {nome === 'paw' && DEDOS.map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="1.9" />
      ))}
    </svg>
  );
}
