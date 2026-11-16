// frontend/src/app/_layout.tsx
// Layout raiz do Expo Router — cabeçalho nativo desativado para o jogo ocupar a tela.

import "../global.css";

import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    />
  );
}
