<?php
/* =====================================================================
   inscricao.php – recebe o formulário da landing page e envia por e-mail
   Fica na mesma pasta do index.html, na hospedagem (precisa de PHP).
   Fluxo: valida os dados → monta o e-mail → envia → responde em JSON
   para o script.js mostrar "sucesso" ou "erro" na tela.
   ===================================================================== */

/* =========================== CONFIGURAÇÃO =========================== */
// Caixa de e-mail que vai RECEBER as inscrições (a da Yvira / do Marcelo)
const EMAIL_DESTINO = 'contato@yvira.eco.br';

// Remetente: precisa ser um e-mail que EXISTA no mesmo domínio do site.
// Se usar um endereço de fora (ex.: gmail), o e-mail costuma cair no spam ou ser bloqueado.
const EMAIL_REMETENTE = 'inscricoes@yvira.eco.br';

const ASSUNTO = 'Nova inscrição – Gestão Ambiental Estratégica na Prática';


/* =========================== FUNÇÕES DE APOIO =========================== */

// Toda resposta sai em JSON, que é o formato que o script.js espera
header('Content-Type: application/json; charset=utf-8');

// Responde ao navegador e encerra o script ali mesmo (por causa do exit).
function responder(int $codigoHttp, bool $ok, string $mensagem): void
{
    http_response_code($codigoHttp);
    echo json_encode(['ok' => $ok, 'mensagem' => $mensagem], JSON_UNESCAPED_UNICODE);
    exit;
}

// Lê um campo de UMA linha: tira espaços das pontas, remove quebras de linha
// (impede alguém de "injetar" cabeçalhos extras no e-mail) e limita o tamanho.
function campoLinha(string $nome, int $limite = 200): string
{
    $valor = trim((string) ($_POST[$nome] ?? ''));
    $valor = str_replace(["\r", "\n", "\0"], ' ', $valor);
    return mb_substr($valor, 0, $limite);
}

// Lê um campo de VÁRIAS linhas (textarea): mantém as quebras de linha normais.
function campoTexto(string $nome, int $limite = 2000): string
{
    $valor = trim((string) ($_POST[$nome] ?? ''));
    $valor = str_replace(["\r\n", "\r", "\0"], ["\n", "\n", ''], $valor);
    return mb_substr($valor, 0, $limite);
}


/* =========================== 1. CHECAGENS INICIAIS =========================== */

// Só aceita envio pelo formulário (POST). Abrir o arquivo direto no navegador cai aqui.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, false, 'Método não permitido.');
}

// Armadilha para robôs: pessoa nunca vê o campo "site". Se veio preenchido, é spam.
// Respondemos "ok" para o robô não perceber que foi barrado, mas nada é enviado.
if (campoLinha('site') !== '') {
    responder(200, true, 'Inscrição recebida.');
}


/* =========================== 2. LEITURA DOS CAMPOS =========================== */

$dados = [
    'nome'          => campoLinha('nome', 120),
    'documento'     => campoLinha('documento', 30),
    'email'         => campoLinha('email', 120),
    'whatsapp'      => campoLinha('whatsapp', 20),
    'cidade'        => campoLinha('cidade', 80),
    'cargo'         => campoLinha('cargo', 80),
    'empresa'       => campoLinha('empresa', 120),
    'relacao'       => campoTexto('relacao', 1000),
    'demanda'       => campoTexto('demanda', 2000),
    'origem'        => campoLinha('origem', 40),
    'consentimento' => isset($_POST['consentimento']) ? 'Sim' : 'Não',
];


/* =========================== 3. VALIDAÇÃO =========================== */
// O navegador já valida, mas o servidor SEMPRE valida de novo:
// qualquer pessoa pode enviar dados direto para este arquivo, sem passar pelo formulário.

$obrigatorios = [
    'nome'      => 'nome completo',
    'documento' => 'documento',
    'email'     => 'e-mail',
    'whatsapp'  => 'WhatsApp',
    'cidade'    => 'cidade/UF',
    'cargo'     => 'cargo/função',
    'origem'    => 'como conheceu o curso',
];

foreach ($obrigatorios as $campo => $rotulo) {
    if ($dados[$campo] === '') {
        responder(422, false, "Preencha o campo {$rotulo}.");
    }
}

if (!filter_var($dados['email'], FILTER_VALIDATE_EMAIL)) {
    responder(422, false, 'Confira o e-mail informado.');
}

// Conta só os números do WhatsApp: DDD + 8 ou 9 dígitos = 10 ou 11 números
$digitosWhatsApp = preg_replace('/\D/', '', $dados['whatsapp']);
if (strlen($digitosWhatsApp) < 10 || strlen($digitosWhatsApp) > 11) {
    responder(422, false, 'Confira o número de WhatsApp com DDD.');
}

// Aceita só as opções que existem no formulário
$origensValidas = ['Grupo de WhatsApp', 'Instagram', 'LinkedIn', 'Indicação', 'Outro'];
if (!in_array($dados['origem'], $origensValidas, true)) {
    responder(422, false, 'Escolha como você conheceu o curso.');
}


/* =========================== 4. MONTAGEM DO E-MAIL =========================== */

// "—" no lugar de campo opcional vazio deixa o e-mail mais fácil de ler
$mostrar = fn (string $valor): string => $valor !== '' ? $valor : '—';

// Link direto para responder no WhatsApp: 55 + DDD + número
$linkWhatsApp = 'https://wa.me/55' . $digitosWhatsApp;

$corpo = <<<TEXTO
Nova inscrição recebida pela landing page do curso
Gestão Ambiental Estratégica na Prática (10 e 11/11, 19h)

SEUS DADOS
Nome (certificado): {$dados['nome']}
Documento: {$dados['documento']}
E-mail: {$dados['email']}
WhatsApp: {$dados['whatsapp']}  ({$linkWhatsApp})
Cidade/UF: {$dados['cidade']}

PERFIL PROFISSIONAL
Cargo/função: {$dados['cargo']}
Empresa: {$mostrar($dados['empresa'])}
Relação com a área ambiental hoje:
{$mostrar($dados['relacao'])}

SUA DEMANDA
Temas que preocupam / maior dúvida:
{$mostrar($dados['demanda'])}

Como conheceu o curso: {$dados['origem']}
Consentimento LGPD (comunicação sobre o curso e conteúdos da Yvira): {$dados['consentimento']}

Enviado em: %DATA%
TEXTO;

// Data e hora no fuso de Brasília
$agora = new DateTime('now', new DateTimeZone('America/Sao_Paulo'));
$corpo = str_replace('%DATA%', $agora->format('d/m/Y H:i'), $corpo);

// Cabeçalhos do e-mail.
// Reply-To: ao clicar em "Responder", o e-mail vai direto para o participante.
$cabecalhos = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    // o nome do remetente tem acento, então também passa pelo mb_encode_mimeheader
    'From: ' . mb_encode_mimeheader('Yvira – Inscrições', 'UTF-8') . ' <' . EMAIL_REMETENTE . '>',
    'Reply-To: ' . $dados['email'],
];

// mb_encode_mimeheader: permite acentos no assunto ("inscrição", "Estratégica")
$assuntoCodificado = mb_encode_mimeheader(ASSUNTO . ' – ' . $dados['nome'], 'UTF-8');


/* =========================== 5. ENVIO =========================== */

// O 5º parâmetro (-f) define o "envelope" do remetente; ajuda o e-mail a não cair no spam
$enviado = mail(
    EMAIL_DESTINO,
    $assuntoCodificado,
    $corpo,
    implode("\r\n", $cabecalhos),
    '-f' . EMAIL_REMETENTE
);

if (!$enviado) {
    responder(500, false, 'Não foi possível enviar agora.');
}

responder(200, true, 'Inscrição recebida.');
