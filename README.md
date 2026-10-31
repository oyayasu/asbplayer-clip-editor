# asbplayer AI Sister — GroqCloud + Google AI Studio (Brave)

Esta branch implementa o editor de vocabulário do asbplayer com geração de definições por **API**, preservando o modelo de cartões do Anki, captura de áudio/imagem, frases de legenda, seleção de clipes e importação manual de JSON.

**Branch-base preservada:** `ai-sibling-prototype` (não modificada por este trabalho).

## O que mudou

- Duas opções independentes de API, **GroqCloud** e **Google AI Studio**. A extensão consulta somente **uma** delas por vez; não faz fallback automático nem mistura resultados.
- Campo para salvar/remover a chave de cada provedor, no próprio painel **AI Definitions**. A seleção do provedor fica salva ao reiniciar o Brave.
- O botão **Generate definitions** envia o prompt contextual já usado pela extensão à API selecionada, recebe um JSON estruturado e preenche os campos existentes automaticamente.
- As definições permanecem editáveis. Ainda é possível usar **Copy structured prompt** e **Import from text field** sem configurar APIs.
- O validador `parseAIResult` preserva a ordem e confere os termos exatamente; não aceita respostas para palavras diferentes.
- **Nenhuma automação de abas de ChatGPT, Claude ou Gemini** nesta branch. Não abre conversas nem acessa cookies desses sites.

### Modelos fixados nesta versão

| Provedor | Modelo | Endpoint |
| --- | --- | --- |
| GroqCloud | `openai/gpt-oss-120b` | `https://api.groq.com/openai/v1/chat/completions` |
| Google AI Studio | `gemini-3.8-flash` | `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent` |

Ambos utilizam resposta JSON estruturada e a extensão valida novamente os dados antes do preenchimento. O JSON tem a forma:
```json
{
  "version": 1,
  "entries": [
    {
      "term": "figure out",
      "partOfSpeech": "phrasal verb",
      "ipa": "",
      "definition": "To understand something after thinking about it.",
      "alternativeDefinitions": ["To find the solution to a problem."]
    }
  ]
}
```

Não se deve inventar IPA quando não houver confiança. A geração de formato válido não garante a exatidão linguística: revise os significados antes de exportar.

## Instalação

1. Abra [Actions da branch](https://github.com/oyayasu/asbplayer-clip-editor/actions/workflows/build.yml) e escolha uma execução **bem-sucedida** da branch `ai-sibling-api-groq-gemini`.
2. Baixe o artefato `ASBPLAYER-AI-SISTER-GROQ-GEMINI-BRAVE` e extraia-o.
3. Abra `brave://extensions`, ative **Modo desenvolvedor**, clique em **Carregar sem compactação** e escolha a pasta extraída que contém `manifest.json`.
4. Abra Anki desktop com [AnkiConnect](https://ankiweb.net/shared/info/2055492159) se quiser exportar cartões.

## Configurar as APIs

1. Crie uma chave em [GroqCloud](https://console.groq.com/keys) e/ou [Google AI Studio](https://aistudio.google.com/apikey).
2. Na seção **AI Definitions**, escolha o provedor desejado em **Active AI service**.
3. Cole a chave correspondente em **API key** e clique em **Save key**. Repita com o outro provedor se desejar.
4. Selecione os termos da legenda normalmente e clique em **Generate definitions with...**. Revise a definição e exporte o cartão.
5. Troque o provedor pelo seletor quando preferir. O outro serviço não será consultado nesta geração.

**Atenção a limites e cobranças:** as cotas gratuitas são determinadas por cada provedor e podem mudar. Consulte o painel do seu projeto; vincular faturamento ou passar a um plano pago pode alterar as condições de cobrança. A extensão não controla o faturamento da conta.

## Privacidade e segurança

- **Chaves são armazenadas em `browser.storage.local`**, dentro do perfil local do Brave. **Não são criptografadas pela extensão.** Proteja o perfil e não compartilhe-o.
- O código-fonte, a compilação no GitHub Actions, os campos do Anki e o JSON exportado **não incluem as chaves**. Nenhuma chave deve ser adicionada ao repositório.
- O navegador envia somente o prompt (termos e legenda) ao serviço ativo; o request é feito no background para uma URL fixa por provedor.
- A geração por API **requer internet** e envia a legenda aos servidores do provedor escolhido. Confira as políticas de privacidade e processamento de dados dos serviços, especialmente em planos gratuitos.
- Falhas de autenticação, cota e rede aparecem no painel. As chaves não são reproduzidas nas mensagens de erro.

## Desenvolvimento e validação

O GitHub Actions baixa a revisão upstream fixada do asbplayer, aplica os scripts existentes e depois `apply_ai_api_patch.mjs`. Os testes incluem validação do JSON, da integração no Anki e das permissões fixas dos dois endpoints. Nenhuma credencial real é necessária no CI.

Esta extensão deriva de [asbplayer](https://github.com/asbplayer/asbplayer), distribuído sob AGPL-3.0-or-later. Não é afiliada à Groq ou ao Google.
