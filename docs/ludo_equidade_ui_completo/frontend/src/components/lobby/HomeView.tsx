// frontend/src/components/lobby/HomeView.tsx
// Tela inicial do "Ludo Equidade (UFRRJ)" — seleção de avatar, nickname e ações.
// Compatível com React Compiler. Sem shadow* no StyleSheet.

import { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";

import {
  AVATAR_IDS,
  getAvatarMeta,
  type ThemePalette,
} from "../../constants/duoTheme";
import {
  AvatarMedallion,
  DuoButton,
  DuoCard,
} from "../ui/DuoComponents";

export interface HomeViewProps {
  playerName: string;
  onChangeName: (name: string) => void;
  avatarId: string;
  onChangeAvatar: (id: string) => void;
  onJoinPublicRoom: () => void;
  onJoinPrivateRoom: () => void;
  onCreateRoom: () => void;
  palette: ThemePalette;
}

const HOW_TO_PLAY_STEPS: { icon: string; text: string }[] = [
  { icon: "➕", text: "Crie ou entre em uma sala com seu avatar." },
  { icon: "🎲", text: "Jogue os dados e avance pelo tabuleiro." },
  { icon: "🚧", text: "Supere os obstáculos respondendo aos quizzes." },
];

export function HomeView({
  playerName,
  onChangeName,
  avatarId,
  onChangeAvatar,
  onJoinPublicRoom,
  onJoinPrivateRoom,
  onCreateRoom,
  palette,
}: HomeViewProps) {
  const trimmedName = playerName.trim();
  const canCreate = trimmedName.length >= 2;

  const avatarList = useMemo(() => AVATAR_IDS.slice(), []);
  const selectedMeta = getAvatarMeta(avatarId);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { backgroundColor: palette.background },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View
        entering={FadeIn.duration(400)}
        style={styles.headerWrap}
      >
        <Text style={[styles.title, { color: palette.textMain }]}>
          🎲 LUDO EQUIDADE
        </Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          Jogo educativo multiplayer • UFRRJ
        </Text>
      </Animated.View>

      <Animated.View
        entering={SlideInDown.duration(420)}
        style={styles.mainCardWrap}
      >
        <DuoCard palette={palette} variant="default" padding={18}>
          {/* Seção 1: Vitrine de avatares */}
          <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
            Escolha seu avatar
          </Text>
          <View style={styles.avatarGrid}>
            {avatarList.map((id) => {
              const meta = getAvatarMeta(id);
              return (
                <AvatarMedallion
                  key={id}
                  avatarId={id}
                  size="md"
                  selected={id === avatarId}
                  showLabel
                  onPress={() => onChangeAvatar(id)}
                  palette={palette}
                />
              );
            })}
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: palette.cardBorder },
            ]}
          />

          {/* Seção 2: Nickname */}
          <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
            Seu apelido
          </Text>
          <View
            style={[
              styles.nicknamePreview,
              {
                backgroundColor: selectedMeta.bgTint,
                borderColor: selectedMeta.borderColor,
              },
            ]}
          >
            <Text style={styles.nicknameEmoji}>{selectedMeta.emoji}</Text>
            <TextInput
              value={playerName}
              onChangeText={onChangeName}
              placeholder={`Ex.: ${selectedMeta.label}`}
              placeholderTextColor={palette.textMuted}
              maxLength={16}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              accessibilityLabel="Apelido do jogador"
              style={[
                styles.nicknameInput,
                {
                  backgroundColor: palette.inputBg,
                  borderColor: palette.inputBorder,
                  color: palette.textMain,
                },
              ]}
            />
          </View>
          <Text style={[styles.helperText, { color: palette.textMuted }]}>
            {trimmedName.length === 0
              ? "Digite pelo menos 2 caracteres para criar uma sala."
              : `${trimmedName.length}/16 caracteres`}
          </Text>

          <View
            style={[
              styles.divider,
              { backgroundColor: palette.cardBorder },
            ]}
          />

          {/* Seção 3: Ações principais */}
          <Text style={[styles.sectionTitle, { color: palette.textMain }]}>
            Entrar na partida
          </Text>

          <View style={styles.actionsWrap}>
            <DuoButton
              title="🔍 Explorar Salas Públicas"
              subtitle="Veja quem está online agora"
              variant="secondary"
              size="md"
              onPress={onJoinPublicRoom}
              palette={palette}
              accessibilityHint="Abre a lista de salas públicas disponíveis"
            />
            <DuoButton
              title="🔑 Entrar com Código"
              subtitle="Use o código compartilhado pelo anfitrião"
              variant="ghost"
              size="md"
              onPress={onJoinPrivateRoom}
              palette={palette}
              accessibilityHint="Abre a tela para digitar o código da sala"
            />
            <DuoButton
              title="➕ Criar Nova Sala"
              subtitle={canCreate ? "Você será o anfitrião" : "Informe seu apelido antes"}
              icon="🚀"
              variant="primary"
              size="lg"
              fullWidth
              disabled={!canCreate}
              onPress={onCreateRoom}
              palette={palette}
              accessibilityHint="Cria uma nova sala privada com você como anfitrião"
            />
          </View>
        </DuoCard>
      </Animated.View>

      {/* Como jogar */}
      <View style={styles.howToPlayWrap}>
        <Text style={[styles.howToPlayTitle, { color: palette.textMain }]}>
          Como jogar
        </Text>
        <View style={styles.stepList}>
          {HOW_TO_PLAY_STEPS.map((step, index) => (
            <View
              key={step.text}
              style={[
                styles.stepRow,
                {
                  backgroundColor: palette.surfaceAlt,
                  borderColor: palette.cardBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.stepIconBadge,
                  {
                    backgroundColor: palette.cardBg,
                    borderColor: palette.cardBorder,
                  },
                ]}
              >
                <Text style={styles.stepIcon}>{step.icon}</Text>
              </View>
              <Text style={[styles.stepText, { color: palette.textMain }]}>
                {`${index + 1}. ${step.text}`}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={[styles.footer, { color: palette.textMuted }]}>
        Feito com 💚 para debater equidade e acessibilidade.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 20,
  },
  headerWrap: {
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  mainCardWrap: {
    width: "100%",
    maxWidth: 520,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 14,
  },
  divider: {
    height: 2,
    width: "100%",
    borderRadius: 999,
    marginVertical: 16,
    opacity: 0.7,
  },
  nicknamePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 2,
  },
  nicknameEmoji: {
    fontSize: 22,
  },
  nicknameInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "800",
  },
  helperText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  actionsWrap: {
    gap: 12,
    marginTop: 4,
  },
  howToPlayWrap: {
    width: "100%",
    maxWidth: 520,
    gap: 10,
  },
  howToPlayTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  stepList: {
    gap: 8,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stepIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepIcon: {
    fontSize: 16,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  footer: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
});
