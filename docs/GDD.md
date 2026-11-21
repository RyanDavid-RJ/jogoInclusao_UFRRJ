# 🎲 GDD — Ludo Equidade (v2.0)

- **Instituição de referência:** Instituto de Ciências Exatas (ICE) — Departamento de Matemática — UFRRJ
- **Repositório:** [jogoInclusao_UFRRJ](https://github.com/RyanDavid-RJ/jogoInclusao_UFRRJ)
- **Última revisão:** 2026-11-21
- **Estágio atual:** MVP web publicado em produção (v1.0) · Arquitetura v2.0 especificada para evolução de produto, painel docente e pesquisa científica (IC)

---

## 1. Visão Geral e Proposta de Valor

O **Ludo Equidade** é um jogo de tabuleiro educativo, multiplayer online e assimétrico, voltado ao ensino de **matemática** e à reflexão crítica sobre **inclusão, acessibilidade e equidade**.

### 1.1 Origem e Vocação Institucional (ICE — UFRRJ)
Idealizado a partir de experiências na Semana Nacional de Ciência e Tecnologia (SNCT) da UFRRJ e em estudos de educação especial em turmas de licenciatura, o projeto foi concebido para atuar em **duas frentes complementares**:

1. **Produto Educacional & Social:** um jogo rápido, envolvente e acessível para salas de aula (Ensino Fundamental, Médio e Superior), oficinas, feiras de ciências e grupos de amigos.
2. **Plataforma de Pesquisa & Iniciação Científica (ICE-UFRRJ):** um ambiente experimental controlado que gera dados estruturados e anonimizados de alto valor para áreas do Instituto de Ciências Exatas:
   - **Educação Matemática:** resolução de problemas em 3 etapas escolares e 3 níveis estruturais, com feedback imediato e explicação pedagógica.
   - **Probabilidade e Processos Estocásticos:** tabuleiro linear modelável como uma *Cadeia de Markov absorvente* (estados `0..30`, transições por dado, impulsos determinísticos e bônus condicionais), permitindo comparar distribuições teóricas com trajetórias empíricas.
   - **Estatística e Inferência:** atribuição aleatória de papéis, medição de tempo de resposta em milissegundos, taxas de acerto por item (Teoria Clássica dos Testes / base para TRI), análise de distratores e modelos inferenciais (*ex.: probabilidade de vitória condicionada a sorte no dado, exposição a barreiras e desempenho matemático*).
   - **Ciência da Computação e Acessibilidade Digital:** arquitetura multiplayer autoritativa em tempo real, conformidade WCAG e governança ética de dados (LGPD).

### 1.2 Princípio Ético-Pedagógico Inegociável
> A condição sorteada representa uma **perspectiva ambiental no jogo**, nunca a capacidade cognitiva, a inteligência ou o potencial de aprendizagem de uma pessoa real. A matriz de obstáculos é uma abstração didática de barreiras do cotidiano criada para evidenciar que *o mesmo ambiente impõe esforços diferentes a pessoas diferentes* e que **equidade significa remover barreiras e oferecer apoios adequados**.

- Nenhum avatar durante a partida sugere deficiência ou estereótipo.
- A matriz de equidade é versionada (`v1.0-baseline`) e tratada como hipótese pedagógica aberta à validação comunitária com pessoas com deficiência, educadores e especialistas.
- Os indicadores pós-jogo apresentam apenas **fatos observados na partida**, sem afirmar causalidade absoluta nem generalizar a vivência de pessoas reais.

---

## 2. Público-Alvo e Modos de Uso

| Perfil | Objetivo principal | Acesso |
| --- | --- | --- |
| **Jogador Convidado** | Entrar em segundos via link ou código de sala, sem barreira de cadastro (ideal para feiras, SNCT e uso rápido em sala). | Sem login (sessão temporária) |
| **Jogador Autenticado (Google)** | Salvar apelido/avatar, consultar histórico de partidas, acompanhar perspectivas já vivenciadas e optar pelo consentimento de pesquisa. | Login Google (OAuth 2.0) |
| **Professor / Pesquisador** | Criar salas vinculadas a turmas, gerenciar e revisar o banco de perguntas, acompanhar indicadores empíricos por questão e exportar datasets anonimizados (CSV/JSON). | Login Google + papel `professor` |
| **Administrador** | Promover professores, moderar o acervo institucional e publicar novas versões calibradas da Matriz de Equidade. | Login Google + papel `admin` |

---

## 3. Core Loop e Rejogabilidade

### 3.1 Ciclo Principal da Partida
```text
Lobby (Convidado ou Google)
   ↓
Criar / Entrar em Sala (Pública, Privada ou Turma)
   ↓
Configuração pelo Anfitrião (Etapa Escolar + Regras da Sala) → Início Manual (4 a 8 jogadores)
   ↓
Sorteio Secreto de Papéis (garantindo os 4 papéis) + Ordem de Turnos
   ↓
Loop de Turnos (até chegada à casa 30 ou fim do limite de rodadas):
   ├── Rolar Dado (1–6) → Avanço na trilha (0–30)
   ├── Pouso em Impulso (5, 10, 15, 20, 25) → +2 casas
   └── Pouso em Obstáculo (7, 14, 21, 28) → Pausa Coletiva + Quiz Simultâneo Assimétrico
          ├── Cada jogador recebe questão inédita calibrada pela matriz (etapa × nível 1/2/3)
          ├── Validação autoritativa no servidor (gabarito privado)
          ├── Pontuação N..1 por ordem de acerto + Bônus de Avanço (v2.0)
          └── Feedback individual (gabarito + explicação) → Retomada do turno
   ↓
Encerramento ("A Virada da Equidade"):
   ├── Pódio (Vencedor da Corrida + Destaque de Conhecimento)
   ├── Revelação dos Papéis + Métricas Observadas
   ├── Momento de Reflexão Pedagógica
   └── Revanche Instantânea ("Jogar Novamente" na mesma sala com rotação de papéis)
```

### 3.2 Diagnóstico de Engajamento e Decisões v2.0 para Rejogabilidade
Para transformar o protótipo em um jogo que **as pessoas queiram jogar repetidamente** (referência de ritmo social do *Gartic.io* e clareza tátil do *Duolingo*), o GDD v2.0 consolida cinco pilares:

1. **Quiz que importa de verdade na corrida (*Avanço por Equidade* — v2.0):**
   - Na v1.0, os pontos do quiz serviam apenas como critério de desempate após 8 rodadas.
   - Na **v2.0**, além dos pontos `N..1`, o **primeiro jogador a acertar** na rodada de quiz ganha **+1 casa de avanço** no tabuleiro (limitado à casa 30, sem acionar novo obstáculo em cascata). Assim, todo obstáculo gera tensão real na corrida e torna a assimetria das barreiras imediatamente perceptível no avanço dos peões.
2. **Duplo Reconhecimento no Pódio (v2.0):**
   - 🏆 **Vencedor da Corrida:** primeiro a alcançar a casa 30 (ou maior posição ao fim das rodadas, desempatado por pontos de quiz).
   - ⭐ **Destaque do Quiz:** jogador com maior pontuação acumulada nos desafios matemáticos da partida. Isso valoriza quem enfrentou barreiras Nível 3 e brilhou nos cálculos, mesmo sem sorte nos dados.
3. **Revanche Instantânea com Rotação de Papéis (v2.0):**
   - Ao final da partida, o anfitrião pode acionar **"Jogar Novamente"** mantendo os mesmos participantes na sala (sem precisar recriar código).
   - O servidor sorteia os novos papéis secretos dando **preferência para que cada jogador receba uma perspectiva diferente da partida anterior**, incentivando várias partidas em sequência para experimentar os 4 papéis.
4. **Narrativa Viva do Turno (v2.0):**
   - Barra/feed discreto de eventos em tempo real (*"🦊 Ana tirou 5 e ativou 🚀 Impulso (+2)!"*, *"🦉 João encontrou a 🪜 Escada — desafio coletivo!"*) mantém todos engajados mesmo aguardando a própria vez.
5. **Configurações de Sala Acessíveis e Flexíveis (v2.0):**
   - O anfitrião escolhe, antes de iniciar:
     - **Etapa Escolar:** `Fundamental`, `Médio` ou `Superior` (obrigatória).
     - **Duração da Partida:** `Rápida (6 rodadas)` ou `Padrão (8 rodadas)` (padrão: `8`).
     - **Tempo do Quiz (Acessibilidade):** `30s` (padrão), `45s` ou `60s` (fundamental para turmas iniciantes, usuários de leitor de tela ou estudantes que precisem de tempo estendido).
     - **Vínculo de Turma (opcional, para professores):** código da turma para agrupar os resultados analíticos daquela aula no Painel de Professores.

---

## 4. Papéis, Condições e Matriz de Equidade

### 4.1 Papéis Privados
- `cadeirante` — **Pessoa Cadeirante** (perspectiva de mobilidade física)
- `cego` — **Pessoa com Deficiência Visual** (cegueira / baixa visão)
- `surdo` — **Pessoa Surda** (perspectiva de comunicação visual)
- `neuroatipico` — **Pessoa Neuroatípica** (perspectiva de processamento sensorial)

**Regra de distribuição (implementada):** em partidas de 4 a 8 jogadores, os quatro papéis aparecem obrigatoriamente ao menos uma vez; do 5º ao 8º participante, os papéis adicionais são sorteados com reposição. Na revanche (v2.0), o sorteio prioriza atribuir papéis ainda não vivenciados por cada jogador naquela sessão.

### 4.2 Matriz de Equidade — Versão `v1.0-baseline` (versionada no banco)

| Casa | Obstáculo | Domínio da barreira | Cadeirante | Surdo | Cego / baixa visão | Neuroatípico |
| --- | --- | --- | :---: | :---: | :---: | :---: |
| `7` | **Escada** | Mobilidade | **Nível 3** | Nível 1 | Nível 2 | Nível 1 |
| `14` | **Alerta Sonoro** | Audição | Nível 1 | **Nível 3** | Nível 1 | Nível 2 |
| `21` | **Multidão e Barulho** | Sensorial | Nível 1 | Nível 1 | Nível 2 | **Nível 3** |
| `28` | **Placa Ilegível** | Visão | Nível 1 | Nível 1 | **Nível 3** | Nível 1 |

- **Nível 1:** operações básicas diretas / leitura imediata para a etapa escolhida.
- **Nível 2:** problemas em etapas ou raciocínio intermediário.
- **Nível 3:** modelagem, equações ou inferência de maior complexidade estrutural dentro da mesma etapa escolar.
- **Calibração científica:** a tabela `matrizes_equidade` no banco permite criar e comparar versões futuras (ex.: `v1.1`, `v2.0`) após validação com pessoas com deficiência, professores de educação especial e análise estatística das partidas.

---

## 5. Regras Formais do Jogo

1. **Sala e Participantes:** 4 a 8 jogadores; sala pública (listada no lobby) ou privada (código de 4 caracteres). Início manual exclusivamente pelo anfitrião. Se o anfitrião sair/desconectar antes do início, a liderança transfere ao próximo jogador; o anfitrião pode fechar a sala com confirmação. Salas de espera ociosas expiram após 30 minutos.
2. **Sigilo e Revelação:** cada jogador vê apenas o próprio papel durante a partida; o estado público nunca expõe condições nem níveis estruturais dos demais. Tudo é revelado no evento `game_over`.
3. **Movimento e Tabuleiro (`0..30`):**
   - Ordem de turnos sorteada uma vez por partida (registrada para análise de possível vantagem posicional).
   - Dado criptograficamente uniforme de 6 lados (`1..6`) rolado no servidor.
   - Movimento excedente é limitado à casa `30`.
   - **Impulso (+2):** pouso exato em `5, 10, 15, 20, 25` avança +2 casas (limitado à chegada `30`) e não aciona obstáculo ultrapassado.
   - **Obstáculo:** pouso exato em `7, 14, 21, 28` pausa o tabuleiro e inicia a rodada de quiz simultâneo.
4. **Quiz Simultâneo:**
   - Todos os $N$ participantes conectados recebem individualmente uma questão inédita compatível com `etapa_escolar` e `nivel_estrutural` (sem repetição na rodada ou na partida, com fallback automático apenas se o acervo daquela célula se esgotar).
   - Gabarito permanece exclusivamente no servidor até o encerramento da rodada.
   - Janela comum controlada pelo servidor (`30s` padrão; `45s` ou `60s` configuráveis na v2.0), com no máximo 1 resposta por jogador e medição da latência em milissegundos (`tempo_resposta_ms`).
   - Falha ou indisponibilidade de questão não inicia rodada parcial: emite `quiz_error`, pontua zero e libera o turno.
5. **Pontuação e Avanço:**
   - Para $N$ participantes fixados no início do quiz, respostas corretas recebem $N, N-1, \dots, 1$ pontos pela ordem de chegada ao servidor.
   - Erro, prazo esgotado ou desconexão valem `0` pontos sem recalcular $N$.
   - **v2.0 (Avanço por Equidade):** o 1º participante a acertar avança `+1` casa (limitado à casa `30`, sem reativar obstáculo). Se isso levar alguém à casa `30`, a partida encerra ao final do quiz.
6. **Reconexão:** quedas transitórias preservam a vaga por até `60` segundos via `sessionToken` (`resume_room`), inclusive remapeando perguntas e respostas em quiz ativo.
7. **Fim de Partida e Desempate:**
   - Encerra imediatamente quando alguém atinge a casa `30` (por dado, Impulso ou Avanço por Equidade) ou após completar o limite de rodadas (`8` padrão / `6` rápido).
   - Desempate no limite de rodadas: maior posição → maiores pontos de quiz → vitória compartilhada.
8. **Revelação e Reflexão ("A Virada da Equidade"):**
   - Exibe pódio (Vencedor da Corrida + Destaque do Quiz), revelação jogador–papel, métricas observadas individuais (média do dado, impulsos, acertos, distribuição `N1/N2/N3`), síntese do grupo, perguntas norteadoras para debate e botão de revanche (v2.0).

---

## 6. Painel de Professores, Contas e Pesquisa Científica (v2.0)

### 6.1 Autenticação e Perfis
- **Entrada sem atrito:** tela inicial oferece **Entrar com Google** e **Jogar como Convidado**.
- **Perfil persistente (Google):** guarda apelido preferido, avatar lúdico escolhido, histórico de partidas, estatísticas pessoais (partidas jogadas, taxa de acerto por etapa, perspectivas já vivenciadas) e preferência explícita de **consentimento para pesquisa acadêmica**.

### 6.2 Painel de Professores
Área dedicada para usuários com papel `professor` ou `admin`:
1. **Gestão Pedagógica de Questões:**
   - Listagem com filtros (`etapa_escolar`, `nivel_estrutural`, `area_tematica`, `status_revisao`, busca textual).
   - Criação, edição, revisão/aprovação e ativação/arquivamento de questões (com prevenção de duplicatas garantida no banco).
   - **Diagnóstico psicométrico por questão:** número de aplicações, taxa de acerto ($p$), tempo médio de resposta, taxa de timeout e distribuição das marcações (`A/B/C/D`) para identificar questões mal formuladas ou distratores ineficazes.
2. **Gestão de Turmas / Experimentos:**
   - Criação de códigos de turma (ex.: `MAT101-2026A`) para vincular partidas aplicadas em aula ou oficina.
3. **Laboratório Estatístico & Exportação:**
   - Resumo descritivo de partidas, comparação de indicadores entre papéis e validação empírica da Matriz de Equidade (`obstáculo × papel × nível`).
   - Exportação de datasets **100% anonimizados** em **CSV** e **JSON** (prontos para R, Python/pandas ou planilhas), contendo exclusivamente registros com consentimento explícito de pesquisa (`consentiu_pesquisa = 1`).

### 6.3 Ética, LGPD e Anonimização
- Dados civis (`email`, `nome`, `google_sub`) vivem isolados na tabela `usuarios` e **nunca** aparecem nas views analíticas nem nas exportações.
- Cada participação recebe um `participante_anon_id` pseudonimizado; relatórios estatísticos exigem consentimento explícito (*opt-in*), alinhando o projeto desde a origem às boas práticas da LGPD e de submissão a Comitê de Ética em Pesquisa (CEP).

---

## 7. Direção Visual, UX e Acessibilidade

- **Identidade base — Duo-Equidade (evoluível na Etapa 5):**
  - Estética acolhedora, tátil e legível, com hierarquia clara entre área de ação, tabuleiro e placar (inspirada na agilidade social do *Gartic.io* e no polimento tátil do *Duolingo*).
  - **Restrição técnica obrigatória (RN Web):** profundidade via `borderWidth` e `borderBottomWidth`, nunca propriedades `shadow*` depreciadas.
  - Evolução prevista para a v2.0: substituir emojis críticos por ícones/ilustrações vetoriais consistentes (incluindo figuras humanas diversas validadas na tela de revelação, respeitando debates comunitários sobre símbolos como a peça de quebra-cabeça).
- **Acessibilidade (WCAG 2.1 AA como meta):**
  - Tema claro, tema escuro (contraste verificado) e modo daltônico (informação nunca dependente apenas de cor).
  - Respeito nativo a `useReducedMotion`.
  - Navegação completa por teclado na Web (`Tab`, foco visível, `A/B/C/D` e `Enter` no quiz, `Esc` nos modais) e semântica rigorosa para leitores de tela (`accessibilityRole`, `accessibilityLabel`, `accessibilityLiveRegion`).
  - Tempo de quiz configurável na sala (`30s / 45s / 60s`).
  - Alternativas textuais/visuais obrigatórias para quaisquer alertas sonoros futuros.

---

## 8. Mapa de Evolução: MVP v1.0 vs. v2.0

| Capacidade | v1.0 (Em produção hoje) | v2.0 (Alvo institucional ICE-UFRRJ) |
| --- | --- | --- |
| Lobby, 4–8 jogadores, salas públicas/privadas | ✅ Entregue | ✅ Mantido + vínculo opcional de turma + regras configuráveis |
| Tabuleiro 0–30, Impulso (+2), Obstáculos, Quiz 30s | ✅ Entregue | 🔜 +1 casa no 1º acerto, tempo configurável (`30/45/60s`), feed de turno |
| Perguntas sem repetição na partida | ✅ Entregue | 🔜 Governança editorial, `area_tematica`, deduplicação no banco, expansão do acervo |
| Revelação pós-jogo e métricas observadas | ✅ Entregue | 🔜 Duplo pódio (Corrida + Quiz), Revanche instantânea com rotação de papéis |
| Contas e Login Google + Modo Convidado | ⏳ Planejado | 🔜 OAuth Google + JWT + Convidado sem atrito + histórico pessoal |
| Persistência de Partidas e Telemetria Estatística | ⏳ Em memória | 🔜 Gravação transacional ao fim da partida (9 tabelas + 4 views analíticas) |
| Painel de Professores & Exportação CSV/JSON | ⏳ Planejado | 🔜 CRUD/revisão de questões + diagnósticos empíricos + exportação anonimizada |
| UX/UI Profissional + Teclado/WCAG completo | 🟡 Parcial | 🔜 Redesign visual, feedback vivo, atalhos de teclado e auditoria WCAG |
