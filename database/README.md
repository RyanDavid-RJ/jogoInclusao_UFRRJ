# Banco de Dados — Scripts e Migrações (`database/`)

Este diretório contém os scripts SQL versionados do **Ludo Equidade (UFRRJ)** para **MySQL 8.0 / 8.4** (`utf8mb4_unicode_ci`).

> **Segurança:** nunca salve backups reais (`backup*.sql`), dumps com dados pessoais, senhas ou certificados aqui dentro do controle de versão. O `.gitignore` da raiz ignora `database/backup*.sql`.

## Estrutura de Arquivos

- `schema_e_seed.sql`: criação inicial da tabela `perguntas` + 9 questões seed (1 por combinação `etapa_escolar × nivel_estrutural`), idempotente.
- `perguntas_expansao.sql`: +18 questões idempotentes totalizando **27 perguntas únicas balanceadas** (3 por combinação).
- `migrations/001_schema_base_perguntas.sql`: cria a tabela de controle `schema_migrations` e garante a estrutura base de `perguntas`.
- `migrations/002_usuarios_turmas_partidas_analytics.sql`: adiciona contas (`usuarios`), turmas (`turmas`), versionamento da matriz (`matrizes_equidade` com seed `v1.0-baseline`), colunas de governança/deduplicação em `perguntas` e telemetria analítica (`partidas`, `partida_participantes`, `partida_turnos`, `quiz_rodadas`, `quiz_respostas`).
- `migrations/003_views_analiticas.sql`: cria/atualiza as 5 views analíticas e datasets anonimizados prontos para o Painel de Professores e estudos estatísticos (R / Python).

## Ordem de Aplicação

### A) Em um banco já existente com `perguntas` populada (ex.: `defaultdb` atual)
1. Faça um backup lógico antes de alterar o schema.
2. Confirme o banco selecionado e que não há duplicatas em `perguntas`:
   ```sql
   SELECT DATABASE() AS banco_ativo, VERSION() AS versao_mysql;
   SELECT etapa_escolar, nivel_estrutural, LOWER(TRIM(enunciado)) AS norm, COUNT(*) AS qtd
   FROM perguntas
   GROUP BY etapa_escolar, nivel_estrutural, norm
   HAVING qtd > 1;
   ```
3. Execute em ordem:
   - `migrations/001_schema_base_perguntas.sql`
   - `migrations/002_usuarios_turmas_partidas_analytics.sql`
   - `migrations/003_views_analiticas.sql`

### B) Em um banco novo do zero (migração futura ou ambiente local)
Execute em ordem:
1. `migrations/001_schema_base_perguntas.sql`
2. `schema_e_seed.sql`
3. `perguntas_expansao.sql`
4. `migrations/002_usuarios_turmas_partidas_analytics.sql`
5. `migrations/003_views_analiticas.sql`

## Validação Pós-Aplicação

```sql
SELECT * FROM schema_migrations ORDER BY applied_at;
SHOW FULL TABLES;
SELECT etapa_escolar, nivel_estrutural, COUNT(*) AS total
FROM perguntas
WHERE ativa = 1 AND status_revisao = 'aprovada'
GROUP BY etapa_escolar, nivel_estrutural
ORDER BY etapa_escolar, nivel_estrutural;
SELECT codigo, nome, ativa FROM matrizes_equidade;
```

## Boas Práticas de Privilégios Mínimos (Produção)

Evite usar a conta administrativa (`avnadmin` / `root`) na aplicação Node.js em produção. Crie um usuário dedicado (ex.: `ludo_app`) somente com `SELECT, INSERT, UPDATE` nas tabelas da aplicação e `SELECT` nas views analíticas, sem `DROP`, `ALTER` ou `GRANT OPTION`.
