import { Link, type Href } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getThemePalette } from "../constants/duoTheme";
import { DuoCard, InfoPill } from "../components/ui/DuoComponents";

export default function TermosScreen() {
  const insets = useSafeAreaInsets();
  const palette = getThemePalette("light", false);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <View style={styles.wrap}>
        <DuoCard palette={palette} padding={24}>
          <View style={styles.header}>
            <InfoPill text="🎓 ICE • UFRRJ" tone="secondary" palette={palette} />
            <InfoPill text="📜 Termos de Uso" tone="primary" palette={palette} />
          </View>

          <Text style={[styles.title, { color: palette.textMain }]}>
            Termos de Uso — Ludo Equidade (UFRRJ)
          </Text>
          <Text style={[styles.updated, { color: palette.textMuted }]}>
            Última atualização: 21 de novembro de 2026
          </Text>

          <Text style={[styles.heading, { color: palette.textMain }]}>
            1. Aceitação e Finalidade Educacional
          </Text>
          <Text style={[styles.body, { color: palette.textMain }]}>
            O Ludo Equidade é uma plataforma gratuita e sem fins lucrativos criada
            para fins educacionais, de extensão e pesquisa acadêmica no âmbito do
            Instituto de Ciências Exatas (ICE — UFRRJ). Ao acessar o jogo, você
            concorda em utilizá-lo de forma respeitosa e compatível com seus
            objetivos pedagógicos.
          </Text>

          <Text style={[styles.heading, { color: palette.textMain }]}>
            2. Conduta nas Salas Multiplayer
          </Text>
          <Text style={[styles.body, { color: palette.textMain }]}>
            É proibido utilizar apelidos ofensivos, discriminatórios ou que violem
            direitos de terceiros, bem como tentar explorar falhas técnicas ou
            sobrecarregar os serviços da plataforma.
          </Text>

          <Text style={[styles.heading, { color: palette.textMain }]}>
            3. Nota Pedagógica sobre as Dinâmicas de Inclusão
          </Text>
          <Text style={[styles.body, { color: palette.textMain }]}>
            As perspectivas e obstáculos simulados no tabuleiro têm caráter
            didático para estimular o debate coletivo sobre barreiras estruturais e
            acessibilidade, não substituindo nem representando de forma universal
            as vivências reais de pessoas com deficiência ou pessoas neuroatípicas.
          </Text>

          <Text style={[styles.heading, { color: palette.textMain }]}>
            4. Disponibilidade e Privacidade
          </Text>
          <Text style={[styles.body, { color: palette.textMain }]}>
            A plataforma é mantida em infraestrutura acadêmica/nuvem em evolução
            contínua, podendo passar por manutenções programadas. O tratamento de
            dados pessoais e consentimento para pesquisa segue integralmente nossa
            Política de Privacidade.
          </Text>

          <Text style={[styles.heading, { color: palette.textMain }]}>
            5. Contato
          </Text>
          <Text style={[styles.body, { color: palette.textMain }]}>
            Dúvidas, sugestões pedagógicas ou solicitações relacionadas à conta
            podem ser enviadas para: ryandultra@gmail.com.
          </Text>

          <View style={styles.linksRow}>
            <Link
              href="/"
              style={[styles.linkText, { color: palette.secondaryBorder }]}
            >
              ← Voltar ao Ludo Equidade
            </Link>
            <Link
              href={"/privacidade" as Href}
              style={[styles.linkText, { color: palette.purpleBorder }]}
            >
              Ver Política de Privacidade →
            </Link>
          </View>
        </DuoCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  wrap: {
    width: "100%",
    maxWidth: 780,
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 4,
  },
  updated: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 16,
  },
  heading: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 14,
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 22,
    marginBottom: 8,
  },
  linksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 2,
    borderTopColor: "#DCE3EC",
  },
  linkText: {
    fontSize: 14,
    fontWeight: "900",
  },
});
