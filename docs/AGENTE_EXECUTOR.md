# PROMPT PARA O AGENTE EXECUTOR

Implemente as correções finais de qualidade e acessibilidade:

Em frontend/src/app/index.tsx:

Importe useSafeAreaInsets de react-native-safe-area-context.
No componente principal, obtenha const insets = useSafeAreaInsets().
Aplique no SafeAreaView:
paddingTop: insets.top + 8
paddingBottom: insets.bottom + 8
Preserve os demais estilos e comportamentos existentes.
Ajuste o layout de frontend/src/components/game/PlayersSidebar.tsx:

Evite quebra de texto nos chips de posição.
Considere o novo FINISH_HOUSE = 30 e textos como Pos: 30/30.
Preserve legibilidade, responsividade e acessibilidade em telas estreitas.
Crie database/perguntas_expansao.sql:

Inclua pelo menos 15 novos INSERTs.
Distribua perguntas entre Fundamental, Médio e Superior.
Cubra os níveis estruturais 1, 2 e 3.
Use perguntas variadas e desafiadoras, com alternativas, resposta correta, explicação e tags.
Siga exatamente o schema existente da tabela perguntas.
Não inclua credenciais ou dados sensíveis.
Valide ao final com os testes do backend, TypeScript e lint do frontend.#