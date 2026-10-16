/* =====================================================================
   LANDING PAGE – Gestão Ambiental Estratégica na Prática (Yvira)
   O que este arquivo faz:
   1. Monta os links de WhatsApp a partir de um único lugar (CONFIG)
   2. Envia o formulário de inscrição sem recarregar a página
   3. Mostra/esconde a barra fixa de inscrição no celular
   4. Faz os blocos aparecerem suavemente ao rolar a página
   5. Mostra um espaço reservado quando uma foto ainda não existe
   A página funciona mesmo sem este arquivo; ele só melhora a experiência.
   ===================================================================== */


/* =========================== CONFIGURAÇÃO =========================== */
/* O único trecho que você precisa editar. */
const CONFIG = {
  // Número do WhatsApp só com dígitos: 55 (Brasil) + DDD + número.
  whatsapp: '555196930821',

  // Link de pagamento (Mercado Pago, PagSeguro, Sympla...). Se for preenchido,
  // aparece um botão "Ir para o pagamento" depois que a inscrição é enviada.
  // Deixe vazio ('') para só mostrar a mensagem de que a Yvira vai entrar em contato.
  linkPagamento: ''
};


/* Avisa ao CSS que o JS está ativo (libera a animação de entrada).
   Se este arquivo não carregar, a classe não existe e nada fica escondido. */
document.documentElement.classList.add('js');


/* =========================== 1. LINKS DE WHATSAPP =========================== */

// Monta o endereço do WhatsApp com a mensagem pronta.
// encodeURIComponent troca espaços e acentos por códigos que a URL aceita.
function montarLinkWhatsApp(mensagem) {
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensagem)}`;
}

function configurarLinksWhatsApp() {
  // Cada link leva a sua própria mensagem no atributo data-whatsapp
  document.querySelectorAll('[data-whatsapp]').forEach((link) => {
    link.href = montarLinkWhatsApp(link.dataset.whatsapp);
    link.target = '_blank';
    link.rel = 'noopener'; // a nova aba não ganha acesso a esta página
  });
}


/* =========================== 2. FORMULÁRIO DE INSCRIÇÃO =========================== */

// Máscara do WhatsApp: transforma "51999998888" em "(51) 99999-8888" enquanto a pessoa digita.
// Aceita fixo (8 dígitos) e celular (9 dígitos) depois do DDD.
function mascararTelefone(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 11); // \D = tudo que não é número

  if (digitos.length === 0) return '';
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

function configurarFormulario() {
  const formulario = document.getElementById('form-inscricao');
  if (!formulario) return;

  const botaoEnviar = formulario.querySelector('button[type="submit"]');
  const status = document.getElementById('form-status');
  const caixaSucesso = document.getElementById('form-sucesso');
  const campoWhatsApp = document.getElementById('whatsapp');
  const textoOriginalBotao = botaoEnviar.textContent;

  campoWhatsApp.addEventListener('input', () => {
    campoWhatsApp.value = mascararTelefone(campoWhatsApp.value);
  });

  // Liga/desliga o estado "enviando": evita que a pessoa clique duas vezes
  function definirEnviando(enviando) {
    botaoEnviar.disabled = enviando;
    botaoEnviar.textContent = enviando ? 'Enviando…' : textoOriginalBotao;
  }

  function mostrarStatus(texto, ehErro) {
    status.textContent = texto;
    status.classList.toggle('form__status--erro', ehErro);
  }

  function mostrarSucesso() {
    formulario.hidden = true;
    caixaSucesso.hidden = false;

    if (CONFIG.linkPagamento) {
      const linkPagamento = document.getElementById('link-pagamento');
      linkPagamento.href = CONFIG.linkPagamento;
      linkPagamento.hidden = false;
    }

    // Leva o foco (e a tela) até a mensagem, para ninguém ficar olhando um espaço vazio
    caixaSucesso.focus();
    caixaSucesso.scrollIntoView({ block: 'center' });
  }

  // O evento "submit" só dispara se todos os campos "required" estiverem válidos:
  // o próprio navegador já mostra o aviso no campo que falta.
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault(); // impede o recarregamento da página; o envio é feito pelo fetch

    definirEnviando(true);
    mostrarStatus('', false);

    try {
      // FormData pega todos os campos do formulário pelo atributo "name"
      const resposta = await fetch(formulario.action, {
        method: 'POST',
        body: new FormData(formulario),
        headers: { Accept: 'application/json' }
      });

      // Se o servidor não devolver JSON (ex.: erro 500 em HTML), seguimos com um objeto vazio
      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok || !dados.ok) {
        throw new Error(dados.mensagem || 'Não foi possível enviar agora.');
      }

      mostrarSucesso();
    } catch (erro) {
      // Erro de rede ou do servidor: avisa a pessoa e oferece o WhatsApp como alternativa
      mostrarStatus(`${erro.message} Tente novamente ou fale com a gente pelo WhatsApp.`, true);
    } finally {
      // "finally" roda dando certo ou errado: o botão sempre volta ao normal
      definirEnviando(false);
    }
  });
}


/* =========================== 3. BARRA FIXA (CELULAR) =========================== */
/* Regra: a barra aparece enquanto a pessoa rola o meio da página e some quando
   o Topo, o Investimento, o Formulário ou a Chamada final estão na tela (lá já existe botão). */
function configurarBarraFixa() {
  const barra = document.getElementById('barra-fixa');
  const secoesComBotao = ['topo', 'investimento', 'inscricao', 'chamada-final']
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


/* =========================== 4. ANIMAÇÃO AO ROLAR =========================== */
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


/* =========================== 5. FOTOS AUSENTES =========================== */
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
configurarLinksWhatsApp();
configurarFormulario();
configurarBarraFixa();
configurarRevelacao();
configurarFotosAusentes();
