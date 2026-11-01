# Fluency — versão para Firefox (desktop)

Este branch foi copiado de `main`, sem modificar a versão original do Chrome/Brave.

Mantém o editor de trechos, vários termos por cartão, consulta a dicionários online e integração com AnkiConnect. Não inclui o painel AI Sister.

## Compilar automaticamente

As mudanças neste branch iniciam o workflow `.github/workflows/build.yml`.
Em [GitHub Actions](https://github.com/oyayasu/asbplayer-clip-editor/actions), abra a execução **Compilar Fluency para Firefox** e, depois de concluída com sucesso, baixe o artefato **ASBPLAYER-FLUENCY-FIREFOX**.

A compilação usa a versão fixada do asbplayer upstream, aplica as personalizações locais e chama `pnpm --filter @project/extension run build:firefox`, preservando a configuração nativa Firefox do WXT. O resultado está em `extension/.output/firefox-mv2/`. São conferidos o manifesto V2, a barra lateral e o ID Gecko exclusivo desta variante.

## Testar no Firefox

1. Descompacte o artefato de GitHub Actions.
2. No Firefox desktop, abra `about:debugging#/runtime/this-firefox`.
3. Clique em **Carregar extensão temporária...** e selecione o `manifest.json` da pasta descompactada.
4. Para exportar cartões, abra o Anki desktop com AnkiConnect.

**Importante:** extensões carregadas dessa forma são temporárias e desaparecem ao reiniciar o Firefox. Para instalação permanente no Firefox estável, o pacote precisa ser assinado pela Mozilla (AMO). O build de CI não equivale à assinatura.

## Compatibilidade e limitações

- Firefox de computador, compilação Manifest V2; Firefox Android não está incluído nesta variante.
- A versão Firefox do asbplayer não captura áudio de vídeos protegidos por DRM.
- Dicionários online dependem da disponibilidade de seus serviços externos.
- A execução de CI valida o código e o manifesto, mas não substitui um teste interativo no Firefox.
- O código do asbplayer é licenciado sob AGPL-3.0-or-later.
