# asbplayer Clip Editor

Personalização do editor de trechos do asbplayer para Brave/Chrome.

Este repositório usa GitHub Actions para compilar automaticamente a extensão. O código original é obtido de [asbplayer/asbplayer](https://github.com/asbplayer/asbplayer), licenciado sob AGPL-3.0-or-later.

Quando a compilação estiver concluída, abra **Actions → Compilar extensão para Brave → execução mais recente → Artifacts** e baixe `ASBPLAYER-CLIP-EDITOR-BRAVE`. Extraia o ZIP e carregue a pasta que contém `manifest.json` em `brave://extensions` → Modo desenvolvedor → Carregar sem compactação.

Não instale o código-fonte como extensão; somente o artefato gerado pela compilação contém um `manifest.json` pronto.
