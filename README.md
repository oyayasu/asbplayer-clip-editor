# asbplayer Clip Editor — Fluency Audio v2

Extensão personalizada para criar cartões no Anki com áudio real, imagem da cena e definições.

## O que esta versão adiciona

- Editor de trecho ampliado com começo/fim em milissegundos, controles de ±0.1s e ±0.5s e legendas completas.
- Modelo de Anki **asbplayer Fluency Audio v1**: frente com imagem e áudio original; verso com frase, palavra, classe gramatical, IPA (quando disponível), definição em inglês e significado em português.
- Botão **Configurar modelo automaticamente** nas configurações Anki do asbplayer: usa AnkiConnect e cria o tipo de nota sem substituir os tipos anteriores.
- Editor **Vocabulário automático**: escolha uma palavra da legenda ou escreva uma expressão no campo Word. Consulta automática no Dictionary API e tradução MyMemory; expressões comuns também têm glossário incorporado.
- Campos individuais editáveis para revisar significados antes da exportação. Os dados não encontrados ficam vazios; traduções automáticas não são definitivas.

## Como instalar no Brave

1. Abra a [última compilação bem-sucedida](https://github.com/oyayasu/asbplayer-clip-editor/actions), baixe o artefato `ASBPLAYER-CLIP-EDITOR-BRAVE` e extraia.
2. Visite `brave://extensions`, ative Modo do desenvolvedor, clique em **Carregar sem compactação** e selecione a pasta extraída que contém `manifest.json`. Desative outra versão do asbplayer durante os testes.
3. Abra o **Anki desktop** com [AnkiConnect](https://ankiweb.net/shared/info/2055492159).
4. Nas configurações Anki do asbplayer, clique **Configurar modelo automaticamente**.
5. Numa cena com legendas, abra o editor do Anki, selecione uma palavra nos chips ou escreva uma expressão no campo Word; confira a definição, tradução e IPA e exporte.

## Privacidade e precisão

As palavras/expressões consultadas são enviadas aos provedores [Free Dictionary API](https://dictionaryapi.dev/) e [MyMemory](https://mymemory.translated.net/), exceto as expressões cobertas pelo glossário local. Isso depende de internet. O MyMemory tem limites diários para uso anônimo. A classe gramatical ou primeira definição do dicionário pode não corresponder ao contexto; **revise sempre**. O IPA pode estar indisponível para expressões completas.

## Compilação

O GitHub Actions instala Node.js 24 e pnpm 11.27.0, aplica os patches à revisão fixada do código original e produz um artefato para Brave/Chrome. A compilação valida sintaxe e TypeScript, mas não substitui testes interativos em serviços de streaming.

O asbplayer original usa licença AGPL-3.0-or-later. Esta personalização não é afiliada ao projeto original.
