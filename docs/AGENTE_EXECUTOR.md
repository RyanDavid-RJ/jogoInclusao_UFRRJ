Siga estritamente as regras de #file:docs/AGENTE_EXECUTOR.md.

Objetivo: Implementar a física de arremesso do dado (Drag & Drop com GestureHandler), a animação POV do dado caindo no tabuleiro para todos os jogadores, e o funcionamento correto do botão de "Sair da Sala" no backend e frontend.

Arquivos permitidos:
- #file:backend/lobby.js
- #file:frontend/src/app/_layout.tsx
- #file:frontend/src/app/index.tsx
- #file:frontend/src/components/game/DicePanel.tsx

Especificação Técnica:

1. Rota de Saída no Backend (`backend/lobby.js`):
   - Dentro de `io.on("connection", (socket) => {`, adicione um listener explícito para `leave_room`:
     `socket.on("leave_room", () => { removeSocketFromRoom(socket); });`
   - Isso permite que o jogador volte ao lobby sem precisar fechar a conexão WebSocket inteira.

2. Configuração do Gesture Handler (`frontend/src/app/_layout.tsx` e `frontend/src/app/index.tsx`):
   - Em `_layout.tsx`, importe `GestureHandlerRootView` de `react-native-gesture-handler`.
   - Envolva o `<Stack />` retornado com `<GestureHandlerRootView style={{ flex: 1, backgroundColor: "transparent" }}>`.
   - Em `index.tsx`, na prop `onLeaveRoom` do `RoomsView`, altere para disparar `socketRef.current?.emit("leave_room"); setIsInRoom(false); setGameState(null); setRoomCode("");`.

3. Arremesso do Dado com Física (`frontend/src/components/game/DicePanel.tsx`):
   - Importe `Gesture, GestureDetector` de `react-native-gesture-handler`.
   - Importe `runOnJS` de `react-native-reanimated`.
   - Crie `translateX` e `translateY` com `useSharedValue(0)`.
   - Crie a lógica do gesto `pan`:
     * Habilitado apenas se `isMyTurn` for `true`.
     * No `.onUpdate`, atualize `translateX` e `translateY`.
     * No `.onEnd`, se o dado for arremessado para cima (`e.translationY < -50`), chame `runOnJS(onRollDice)()` para enviar o comando ao servidor. Independentemente de arremessar ou não, use `withSpring(0)` para retornar o dado ao centro.
   - Atualize a animação de recebimento do dado (POV coletivo):
     * No `useEffect` que escuta `diceResult`, quando um resultado chegar, faça o dado "cair do céu": defina `translateY.value = -300` imediatamente e depois anime para `0` usando `withSpring(0, { damping: 5, stiffness: 100 })` simultaneamente à rotação de 360 graus.
   - Envolva a face do dado (`Animated.View`) com o `<GestureDetector gesture={pan}>`.
   - Atualize a UI: Onde estiver escrito "Rolar dado", mude para "Arraste o dado para cima para jogar!" (quando for a vez do jogador).

Validação obrigatória no terminal (em uma única chamada):
Push-Location backend; npm test; Pop-Location; Push-Location frontend; npx tsc --noEmit; npm run lint; Pop-Location; git diff --check