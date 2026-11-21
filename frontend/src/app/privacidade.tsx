import { Link, type Href } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getThemePalette } from "../constants/duoTheme";
import { DuoCard, InfoPill } from "../components/ui/DuoComponents";

export default function PrivacidadeScreen() {
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
            <InfoPill text="🔒 LGPD (Lei nº 13.709/2018)" tone="purple" palette={palette} />
          </View>

          <Text style={[styles.title, { color: palette.textMain }]}>
            Política de Privacidade — Ludo Equidade (UFRRJ)
          </Text>
          <Text style={[styles.updated, { color: palette.textMuted }]}>
            Última atualização: 21 de novembro de 2026
          </Text>

          <Text style={[styles.heading, { color: palette.textMain }]}>
            1. Sobre o Aplicativo
          </Text>
          <Text style={[styles.body, { color: palette.textMain }]}>
            O Ludo Equidade é um jogo educativo multiplayer desenvolvido no âmbito
            acadêmico do Instituto de Ciências Exatas (ICE) da Universidade Federal
            Rural do Rio de Janeiro (UFRRJ), com finalidade exclusivamente
            educacional, pedagógica e científica voltada ao debate sobre equidade,
            acessibilidade e ensino de matemática.
          </Text>

          <Text style={[styles.heading, { color: palette.textMain }]}>
            2. Dados Coletados e Finalidade
          </Text>
          <Text style={[styles.body, { color: palette.textMain }]}>
            • Modo Convidado: é possível jogar sem cadastro nem login. Nenhum dado
            pessoal identificável (como nome real ou e-mail) é exigido para jogar.
          </Text>
          <Text style={[styles.body, { color: palette.textMain }]}>
            • Login com Google (OAuth 2.0 — opcional): quando você opta por entrar
            com sua conta Google, coletamos apenas os dados básicos de identidade
            fornecidos pelo Google OpenID Connect: identificador único da conta
            (`sub`), nome de exibição, endereço de e-mail verificado e URL da foto
            de perfil. Não solicitamos acesso a arquivos do Google Drive, contatos,
            calendário ou mensagens.
          </Text>
          <Text style={[styles.body, { color: palette.textMain }]}>
            • Uso dos dados de conta: os dados de login são utilizados apenas para
            autenticar sua sessão, salvar seu apelido/avatar padrão, exibir seu
            histórico pessoal de partidas e permitir acesso ao Painel de
            Professores para contas docentes autorizadas.
          </Text>

          <Text style={[styles.heading, { color: palette.textMain }]}>
            3. Pesquisa Acadêmica, Consentimento e Anonimização (LGPD)
          </Text>
          <Text style={[styles.body, { color: palette.textMain }]}>
            A inclusão de registros de partidas (rolagens de dado, respostas ao
            quiz, tempos de resposta e perspectivas vivenciadas no jogo) em
            relatórios e datasets de pesquisa em Estatística, Probabilidade e
            Educação é estritamente opcional (opt-in) e controlada pelo marcador de
            consentimento de pesquisa, que pode ser ativado ou revogado a qualquer
            momento pelo participante.
          </Text>
          <Text style={[styles.body, { color: palette.textMain }]}>
            Todas as exportações científicas (CSV/JSON) são 100% pseudonimizadas e
            anonimizadas: nunca incluem nome, e-mail, foto ou qualquer dado capaz
            de identificar diretamente o jogador, utilizando exclusivamente um
            identificador aleatório por participação (`participante_anon_id`).
          </Text>

          <Text style={[styles.heading, { color: palette.textMain }]}>
            4. Compartilhamento, Retenção e Segurança
          </Text>
          <Text style={[styles.body, { color: palette.textMain }]}>
            O Ludo Equidade não vende, aluga nem compartilha dados pessoais com
            terceiros para fins comerciais ou publicitários. As comunicações
            utilizam criptografia HTTPS/TLS, validação criptográfica RS256 dos
            tokens Google via JWKS oficial e controle de acesso baseado em papéis
            (RBAC).
          </Text>

          <Text style={[styles.heading, { color: palette.textMain }]}>
            5. Direitos do Titular e Contato
          </Text>
          <Text style={[styles.body, { color: palette.textMain }]}>
            Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº
            13.709/2018), você pode solicitar acesso, correção, revogação do
            consentimento de pesquisa ou exclusão da sua conta e dados associados
            pelo e-mail de contato do projeto: ryandultra@gmail.com.
          </Text>

          <View style={styles.linksRow}>
            <Link
              href="/"
              style={[styles.linkText, { color: palette.secondaryBorder }]}
            >
              ← Voltar ao Ludo Equidade
            </Link>
            <Link
              href={"/termos" as Href}
              style={[styles.linkText, { color: palette.purpleBorder }]}
            >
              Ver Termos de Uso →
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
