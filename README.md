# asbplayer Clip Editor — Fluency Audio v2

Extensão personalizada para criar cartões no Anki com áudio real, imagem da cena e definições.

## Atualização de preenchimento v3.2 — consultas exclusivamente online

A partir da v3.2, **nenhum significado ou IPA é retirado de um glossário embutido**.
A extensão consulta serviços externos ao receber uma palavra ou expressão:
- **Wiktionary** para definições e classe gramatical;
- **Datamuse** como fonte independente de definições e pronúncia IPA quando disponível;
- **Free Dictionary API** como alternativa adicional;
- **MyMemory** para tradução ao português.

As fontes de dicionário são consultadas de forma independente; se uma responder com HTTP 502, as demais ainda podem preencher o cartão. O texto da legenda pode ser enviado ao dicionário para ajudar a escolher o sentido. Se não houver resposta confiável, o campo permanece vazio com uma mensagem explícita — a extensão não inventa definições.

O botão **Buscar novamente** permite refazer a consulta. Por depender de serviços públicos gratuitos, não é possível garantir resultado para toda palavra, expressão regional ou frase idiomática. As consultas são feitas pela ponte interna da extensão para evitar bloqueios de rede em vídeos da Netflix e YouTube. Seus cartões anteriores não são reescritos.

## Novo: vários termos no mesmo cartão

A atualização do **asbplayer Fluency Multi v1** acrescenta um segundo tipo de nota no Anki; não modifica cartões antigos.

1. Instale a extensão compilada no Brave e mantenha o Anki aberto com AnkiConnect.
2. Em **Settings → Anki**, clique em **Ativar modelo multi-expressões no Anki**.
3. Ao exportar uma cena, o painel **Vocabulary — uma cena, várias expressões** identifica expressões conhecidas e permite acrescentar outras.
4. Cada termo possui **classe gramatical, IPA opcional, definição em inglês e significado em português** independentes. É possível editar ou remover itens antes de exportar.
5. No Anki, um só cartão apresenta a imagem, o áudio original e até cinco expressões no verso. Recomendamos de 1 a 3 por cena.
6. A extensão avisa quando faltam definições, em vez de exportar cartões incompletos sem confirmação.

Exemplo: **“He is such a sore loser. You heard obviously that I mopped the floor with him this afternoon.”** permite estudar **sore loser** e **mop the floor with someone** no mesmo cartão.

**Limitação:** o reconhecimento automático utiliza padrões conhecidos e dicionários online; nem todas as expressões recebem significado contextual automaticamente. Não salve sem conferir o sentido.

## O que esta versão adiciona

- Editor de trecho ampliado com começo/fim em milissegundos, controles de ±0.1s e ±0.5s e legendas completas.
- Modelo de Anki **asbplayer Fluency Audio v1**: frente com imagem e áudio original; verso com frase, palavra, classe gramatical, IPA (quando disponível), definição em inglês e significado em português.
- Botão **Configurar modelo automaticamente** nas configurações Anki do asbplayer: usa AnkiConnect e cria o tipo de nota sem substituir os tipos anteriores.
- Editor **Vocabulário automático**: escolha uma palavra da legenda ou escreva uma expressão no campo Word. Consulta automática no Dictionary API e tradução MyMemory; as definições vêm de dicionários online.
- Campos individuais editáveis para revisar significados antes da exportação. Os dados não encontrados ficam vazios; traduções automáticas não são definitivas.

## Como instalar no Brave

1. Abra a [última compilação bem-sucedida](https://github.com/oyayasu/asbplayer-clip-editor/actions), baixe o artefato `ASBPLAYER-CLIP-EDITOR-BRAVE` e extraia.
2. Visite `brave://extensions`, ative Modo do desenvolvedor, clique em **Carregar sem compactação** e selecione a pasta extraída que contém `manifest.json`. Desative outra versão do asbplayer durante os testes.
3. Abra o **Anki desktop** com [AnkiConnect](https://ankiweb.net/shared/info/2055492159).
4. Nas configurações Anki do asbplayer, clique **Configurar modelo automaticamente**.
5. Numa cena com legendas, abra o editor do Anki, selecione uma palavra nos chips ou escreva uma expressão no campo Word; confira a definição, tradução e IPA e exporte.

## Privacidade e precisão

As palavras/expressões consultadas são enviadas aos provedores [Free Dictionary API](https://dictionaryapi.dev/) e [MyMemory](https://mymemory.translated.net/), inclusive para palavras comuns; não existe mais glossário local de definições. Isso depende de internet. O MyMemory tem limites diários para uso anônimo. A classe gramatical ou primeira definição do dicionário pode não corresponder ao contexto; **revise sempre**. O IPA pode estar indisponível para expressões completas.

## Compilação

O GitHub Actions instala Node.js 24 e pnpm 11.27.0, aplica os patches à revisão fixada do código original e produz um artefato para Brave/Chrome. A compilação valida sintaxe e TypeScript, mas não substitui testes interativos em serviços de streaming.

O asbplayer original usa licença AGPL-3.0-or-later. Esta personalização não é afiliada ao projeto original.
