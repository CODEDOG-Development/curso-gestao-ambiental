/* =====================================================================
   LANDING PAGE – Gestão Ambiental Estratégica na Prática (Yvira)
   O que este arquivo faz:
   1. Monta os links de WhatsApp a partir de um único lugar (CONFIG)
   2. Inscrição em etapas (inscricao.html): dados → pagamento PIX → confirmação
   3. Mostra/esconde a barra fixa de inscrição no celular
   4. Faz os blocos aparecerem suavemente ao rolar a página
   5. Mostra um espaço reservado quando uma foto ainda não existe
   O mesmo arquivo serve as duas páginas: cada função confere se os elementos
   dela existem na página e, se não existirem, simplesmente não faz nada.
   ===================================================================== */


/* =========================== CONFIGURAÇÃO =========================== */
/* O único trecho que você precisa editar. */
const CONFIG = {
  // Número do WhatsApp só com dígitos: 55 (Brasil) + DDD + número.
  whatsapp: '555196930821'
};

/* MODO DE TESTE: no GitHub Pages o PHP não roda, então o envio do formulário falharia.
   Quando o endereço do site termina em "github.io", o formulário pula o envio e vai
   direto para a etapa do PIX. Na Hostinger (yvira.eco.br) isso fica desligado sozinho. */
const MODO_TESTE = location.hostname.endsWith('github.io');


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


/* =========================== 2. INSCRIÇÃO EM ETAPAS =========================== */

// Mostra a etapa pedida (1, 2 ou 3), esconde as outras e atualiza o indicador do topo.
function mostrarEtapa(numero) {
  // Blocos de conteúdo: só o da etapa atual fica visível
  document.querySelectorAll('[data-etapa]').forEach((etapa) => {
    // dataset.etapa vem como texto ("2"); Number() converte para comparar com o número
    etapa.hidden = Number(etapa.dataset.etapa) !== numero;
  });

  // Indicador do topo: etapas anteriores ficam "feitas", a atual ganha aria-current
  document.querySelectorAll('[data-indicador]').forEach((item) => {
    const numeroItem = Number(item.dataset.indicador);
    item.classList.toggle('etapas__item--feita', numeroItem < numero);

    if (numeroItem === numero) {
      item.setAttribute('aria-current', 'step');
    } else {
      item.removeAttribute('aria-current');
    }
  });

  // Volta para o topo e põe o foco no título da etapa: quem usa leitor de tela
  // ouve o novo título, e ninguém fica olhando o fim de uma página que mudou
  window.scrollTo(0, 0);
  document.querySelector(`[data-etapa="${numero}"] [tabindex="-1"]`).focus();
}

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

  // O evento "submit" só dispara se todos os campos "required" estiverem válidos:
  // o próprio navegador já mostra o aviso no campo que falta.
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault(); // impede o recarregamento da página; o envio é feito pelo fetch

    // No GitHub Pages: simula um envio que deu certo e segue para o PIX (nenhum e-mail sai)
    if (MODO_TESTE) {
      console.info('Modo de teste: envio simulado, nenhum e-mail foi enviado.');
      prepararLinkComprovante(document.getElementById('nome').value.trim());
      mostrarEtapa(2);
      return; // "return" encerra a função aqui: o código do fetch abaixo não roda
    }

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

      // Deu certo: o e-mail já foi para a Yvira. Prepara o link do comprovante com o nome
      // da pessoa (usado na etapa 3) e avança para o pagamento.
      prepararLinkComprovante(document.getElementById('nome').value.trim());
      mostrarEtapa(2);
    } catch (erro) {
      // Erro de rede ou do servidor: avisa a pessoa e oferece o WhatsApp como alternativa
      mostrarStatus(`${erro.message} Tente novamente ou fale com a gente pelo WhatsApp.`, true);
    } finally {
      // "finally" roda dando certo ou errado: o botão sempre volta ao normal
      definirEnviando(false);
    }
  });
}

// Monta o link do WhatsApp da etapa 3 já com o nome de quem se inscreveu,
// para a Yvira saber de quem é o comprovante sem precisar perguntar.
function prepararLinkComprovante(nome) {
  const botaoComprovante = document.getElementById('botao-comprovante');
  const mensagem = `Olá! Sou ${nome} e fiz o PIX da inscrição no curso Gestão Ambiental Estratégica na Prática. Segue o comprovante.`;
  botaoComprovante.href = montarLinkWhatsApp(mensagem);
}

// Etapa 2: botão "Copiar código PIX" e botão "Já fiz o pagamento"
function configurarPagamento() {
  const botaoCopiar = document.getElementById('botao-copiar');
  if (!botaoCopiar) return; // não estamos na página de inscrição

  const campoCodigo = document.getElementById('pix-codigo');
  const textoOriginal = botaoCopiar.textContent;

  botaoCopiar.addEventListener('click', async () => {
    campoCodigo.select(); // seleciona o texto: se a cópia automática falhar, basta Ctrl+C

    try {
      // API da área de transferência. Só funciona em site com https (ou no próprio computador).
      await navigator.clipboard.writeText(campoCodigo.value);
      botaoCopiar.textContent = 'Código copiado!';
    } catch {
      botaoCopiar.textContent = 'Código selecionado: copie com Ctrl+C';
    }

    // Depois de 3 segundos, o botão volta ao texto original
    setTimeout(() => {
      botaoCopiar.textContent = textoOriginal;
    }, 3000);
  });

  document.getElementById('botao-paguei').addEventListener('click', () => {
    mostrarEtapa(3);
  });
}


/* =========================== 3. BARRA FIXA (CELULAR) =========================== */
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
configurarPagamento();
configurarBarraFixa();
configurarRevelacao();
configurarFotosAusentes();
