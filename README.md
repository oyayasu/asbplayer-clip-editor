# asbplayer Fluency Multi — Brave / Chrome

Extensão personalizada do asbplayer para montar cartões no Anki com áudio e imagem originais de filmes, séries e vídeos, com vários termos no mesmo cartão.

## Preenchimento automático, sem IA e sem listas prontas

1. Abra uma cena no editor do asbplayer.
2. Em **Vocabulary**, digite **qualquer palavra, phrasal verb ou expressão idiomática** no campo Expressão 1. O termo não precisa aparecer na legenda.
3. Depois que você para de digitar, a extensão consulta dicionários na internet automaticamente:
   - **Wiktionary**, **Datamuse** e **Free Dictionary API**: classe gramatical, definição em inglês e IPA quando encontrado;
   - **MyMemory**: significado em português.
4. Confira os dados e exporte o cartão ao Anki. **Adicionar expressão** permite incluir mais termos na mesma cena, até cinco.
5. Se houver falha de rede ou termo não encontrado, você verá um aviso e poderá usar **Buscar novamente**. O campo permanece editável.

Nenhuma definição, palavra ou expressão vem de uma lista local. Não é necessário ter uma conta de IA, uma chave de API ou digitar a frase da legenda. A legenda é usada apenas para o conteúdo de texto e mídia do cartão; não é enviada para escolher os significados.

**Limites dos dicionários:** nenhuma base de dados cobre literalmente todas as palavras, gírias e expressões. Em expressões com vários significados, o primeiro resultado pode não ser o desejado. IPA de expressões completas nem sempre existe. A API de tradução MyMemory pode ter limitações de qualidade e cota. Nenhum campo deve ser inventado quando não houver informação adequada.

## Cartão no Anki

O modelo **asbplayer Fluency Multi v1** exibe áudio e imagem da cena na frente. O verso mostra a frase da legenda e cada termo digitado, com classe gramatical, IPA quando disponível, definição em inglês e português.

O modelo é separado das notas anteriores. Não sobrescreve cartões existentes.

## Instalação

1. Vá a [Actions](https://github.com/oyayasu/asbplayer-clip-editor/actions) e baixe o artefato da última compilação bem-sucedida.
2. Extraia o ZIP. Em `brave://extensions`, ative **Modo desenvolvedor**, clique em **Carregar sem compactação** e selecione a pasta contendo `manifest.json`.
3. Abra o Anki desktop com [AnkiConnect](https://ankiweb.net/shared/info/2055492159).
4. Nas configurações do asbplayer, seção Anki, clique **Ativar modelo multi-expressões no Anki** apenas se ainda não configurou esse modelo.

## Privacidade

Os termos que você pesquisar são enviados aos provedores públicos de dicionário e tradução. Não são usados serviços de IA. Nenhuma chave pessoal é necessária.

## Desenvolvimento

Compilação automatizada no GitHub Actions com Node.js 24 e pnpm 11.27.0. A compilação valida tipos e manifesto, mas não substitui teste manual no navegador com o Anki aberto.

Este projeto modifica o [asbplayer](https://github.com/asbplayer/asbplayer), distribuído sob a licença AGPL-3.0-or-later. Não é afiliado ao projeto original.
