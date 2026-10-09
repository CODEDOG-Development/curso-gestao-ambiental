/* =====================================================================
   LANDING PAGE – Gestão Ambiental Estratégica na Prática (Yvira)
   O que este arquivo faz:
   1. Monta os links de WhatsApp e de inscrição a partir de um único lugar (CONFIG)
   2. Mostra/esconde a barra fixa de inscrição no celular
   3. Faz os blocos aparecerem suavemente ao rolar a página
   4. Mostra um espaço reservado quando uma foto ainda não existe
   A página funciona mesmo sem este arquivo; ele só melhora a experiência.
   ===================================================================== */


/* =========================== CONFIGURAÇÃO =========================== */
/* O único trecho que você precisa editar. */
const CONFIG = {
  // Link da plataforma de inscrição/pagamento (Sympla, Hotmart, Mercado Pago...).
  // Enquanto estiver vazio (''), os botões de inscrição abrem o WhatsApp.
  linkInscricao: '',

  // Número do WhatsApp só com dígitos: 55 (Brasil) + DDD + número.
  whatsapp: '555196930821',

  // Mensagem que já vem escrita quando a pessoa clica para se inscrever pelo WhatsApp
  mensagemInscricao: 'Olá! Quero garantir minha vaga no curso Gestão Ambiental Estratégica na Prática (10 e 11/11, às 19h).'
};


/* Avisa ao CSS que o JS está ativo (libera a animação de entrada).
   Se este arquivo não carregar, a classe não existe e nada fica escondido. */
document.documentElement.classList.add('js');


/* =========================== 1. LINKS =========================== */

// Monta o endereço do WhatsApp com a mensagem pronta.
// encodeURIComponent troca espaços e acentos por códigos que a URL aceita.
function montarLinkWhatsApp(mensagem) {
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensagem)}`;
}

// Abre o link numa nova aba sem dar à outra página acesso a esta (noopener)
function abrirEmNovaAba(link) {
  link.target = '_blank';
  link.rel = 'noopener';
}

function configurarLinks() {
  // Links de contato: cada um leva a sua própria mensagem no atributo data-whatsapp
  document.querySelectorAll('[data-whatsapp]').forEach((link) => {
    link.href = montarLinkWhatsApp(link.dataset.whatsapp);
    abrirEmNovaAba(link);
  });

  // Botões de inscrição: usam o link de pagamento, ou o WhatsApp se ele ainda não existir
  const destino = CONFIG.linkInscricao || montarLinkWhatsApp(CONFIG.mensagemInscricao);

  document.querySelectorAll('[data-inscricao]').forEach((botao) => {
    botao.href = destino;
    abrirEmNovaAba(botao);
  });
}


/* =========================== 2. BARRA FIXA (CELULAR) =========================== */
/* Regra: a barra aparece enquanto a pessoa rola o meio da página e some quando
   o Topo, o Investimento ou a Chamada final estão na tela (lá já existe botão). */
function configurarBarraFixa() {
  const barra = document.getElementById('barra-fixa');
  const secoesComBotao = ['topo', 'investimento', 'chamada-final']
    .map((id) => document.getElementById(id))
    .filter(Boolean); // descarta alguma seção que não exista

  // IntersectionObserver avisa quando um elemento entra ou sai da tela,
  // sem precisar ficar "escutando" cada pixel de rolagem.
  if (!barra || !('IntersectionObserver' in window)) return;

  const secoesVisiveis = new Set();

  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        secoesVisiveis.add(entrada.target);
      } else {
        secoesVisiveis.delete(entrada.target);
      }
    });

    // Nenhuma seção com botão na tela → mostra a barra
    barra.classList.toggle('barra-fixa--ativa', secoesVisiveis.size === 0);
  });

  secoesComBotao.forEach((secao) => observador.observe(secao));
}


/* =========================== 3. ANIMAÇÃO AO ROLAR =========================== */
function configurarRevelacao() {
  const elementos = document.querySelectorAll('.revelar');

  // Navegador antigo sem IntersectionObserver: mostra tudo de uma vez
  if (!('IntersectionObserver' in window)) {
    elementos.forEach((elemento) => elemento.classList.add('visivel'));
    return;
  }

  const observador = new IntersectionObserver((entradas, obs) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add('visivel');
        obs.unobserve(entrada.target); // já apareceu, não precisa mais vigiar
      }
    });
  }, {
    rootMargin: '0px 0px -10% 0px' // dispara um pouco antes do fim da tela
  });

  elementos.forEach((elemento) => observador.observe(elemento));
}


/* =========================== 4. FOTOS AUSENTES =========================== */
/* Se img/campo-residuos.jpg ou img/marcelo.jpg ainda não existirem,
   troca o ícone de imagem quebrada por um espaço reservado com legenda. */
function configurarFotosAusentes() {
  document.querySelectorAll('.foto img').forEach((imagem) => {
    const marcarComoVazia = () => imagem.closest('.foto').classList.add('foto--vazia');

    // complete + naturalWidth 0 = a imagem já tentou carregar e falhou antes deste script rodar
    if (imagem.complete && imagem.naturalWidth === 0) {
      marcarComoVazia();
    } else {
      imagem.addEventListener('error', marcarComoVazia, { once: true });
    }
  });
}


/* =========================== INICIALIZAÇÃO =========================== */
/* Com o "defer" no <script>, o HTML já está todo pronto quando chegamos aqui. */
configurarLinks();
configurarBarraFixa();
configurarRevelacao();
configurarFotosAusentes();
