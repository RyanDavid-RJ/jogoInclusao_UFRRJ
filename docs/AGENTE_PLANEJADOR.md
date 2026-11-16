Siga estritamente as regras de #file:docs/AGENTE_PLANEJADOR.md.

Contexto: O Agente Executor finalizou com sucesso a expansão do "Ludo Equidade". Agora temos um tabuleiro com 30 casas, obstáculos nas casas 7, 14, 21 e 28, casas bônus de impulso (+2) nas casas 5, 10, 15, 20 e 25, e uma nova API REST (GET/POST /api/perguntas) no backend. O sistema validou 63 testes com sucesso.

Suas tarefas agora:
1. Atualize o Kanban e as seções de regras no `docs/GDD.md` (e no `README.md` se aplicável) refletindo essas novas posições, a chegada na casa 30 e a nova mecânica de casas bônus de "Impulso (+2 casas)".
2. No final, gere o "PROMPT PARA O AGENTE EXECUTOR", orientando as seguintes correções de qualidade e acessibilidade finais:
   - Em `frontend/src/app/index.tsx`, importar `useSafeAreaInsets` de `react-native-safe-area-context` e aplicar `paddingTop: insets.top + 8` e `paddingBottom: insets.bottom + 8` no `SafeAreaView` para evitar o entalhe (notch) em dispositivos móveis reais (Expo Go).
   - Ajustar o layout do `PlayersSidebar` para evitar quebra de texto nos chips, já que `FINISH_HOUSE` passou para 30 e o texto ficou maior.
   - Escrever um novo arquivo `database/perguntas_expansao.sql` com pelo menos mais 15 INSERTs variados de perguntas desafiadoras (níveis 1, 2 e 3 para as 3 etapas escolares).