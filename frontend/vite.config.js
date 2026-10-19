import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O proxy faz o navegador enxergar a API no mesmo endereço do frontend.
// Com isso o cookie de sessão vai junto sem depender de CORS, que é a
// origem mais comum de "funciona no Postman mas não no navegador".
//
// host: true faz o servidor escutar em todas as interfaces, e allowedHosts
// aceita o endereço aleatório que o túnel cria. Só vale em desenvolvimento;
// quando o projeto for publicado, nada disso entra no build.
//
// usePolling: o Vite normalmente espera o sistema avisar que um arquivo
// mudou. Arquivo gravado de fora — por uma pasta compartilhada, por uma
// máquina virtual ou por uma ferramenta remota — às vezes não gera esse
// aviso, e a tela fica parada numa versão velha sem ninguém entender por quê.
// Com a varredura ligada o Vite confere sozinho a cada 300ms.

// Política de conteúdo das telas. As fontes vêm do Google Fonts; todo o resto
// é do próprio endereço. É a mesma que o Express vai mandar quando passar a
// servir o build em produção — o preview usa ela para o DAST da esteira
// examinar o que de fato vai ao ar.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const PROTECAO = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    watch: { usePolling: true, interval: 300 },
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  // `vite preview` serve o build de produção. É ele que o túnel e o DAST
  // devem expor, nunca o servidor de desenvolvimento: o servidor de dev tem
  // falhas conhecidas (o SCA aponta) que não existem no build.
  preview: {
    port: 4173,
    headers: PROTECAO,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
