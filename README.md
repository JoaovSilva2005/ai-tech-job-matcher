# AI Tech Job Matcher

Aplicacao em TypeScript para comparar um curriculo com vagas reais de tecnologia, ranquear as melhores oportunidades e gerar um relatorio Excel com evidencias de QA.

O projeto foi construido para demonstrar habilidades de QA Jr / Dev Jr: automacao com Playwright, testes automatizados, validacao de dados, scraping responsavel, tratamento de arquivos e organizacao de codigo.

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-tests%20%2B%20automation-2EAD33?logo=playwright&logoColor=white)
![Tests](https://img.shields.io/badge/tests-80%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## O que o app faz

1. Le um curriculo em `.txt`, `.md`, `.pdf` ou `.docx`.
2. Mascara dados pessoais antes da analise.
3. Busca vagas reais em fontes publicas.
4. Valida qualidade dos dados coletados.
5. Compara curriculo e vaga por skills, senioridade, idioma e requisitos.
6. Gera ranking de compatibilidade.
7. Exporta relatorio Excel, resumo Markdown e JSONs de evidencia.

Funciona sem API key usando o modo local de analise. Se quiser, tambem aceita Gemini, OpenAI ou Anthropic por variaveis de ambiente.

## Destaques para QA

- Playwright Test com testes unitarios e E2E.
- Automacao de scraping em ambiente controlado com Playwright.
- Validacao de campos obrigatorios, URL, descricao, senioridade, work mode e duplicidade.
- Relatorio de problemas na aba `QA Issues`.
- Pipeline com fallback quando uma fonte externa ou IA falha.
- Evidencias geradas em Excel, Markdown e JSON.
- 80 testes automatizados passando.

## Stack

- Node.js
- TypeScript strict
- Playwright e Playwright Test
- ExcelJS
- Express
- Zod
- ESLint
- Prettier
- pdf-parse
- mammoth

## Como rodar

```bash
npm install
npx playwright install chromium
```

Rodar pela CLI usando a Gupy:

```bash
npm run dev -- -- --resume ./samples/sample-resume.txt --role qa --source gupy --limit 5 --fallback
```

Rodar a interface web:

```bash
npm run web
```

Acesse:

```text
http://localhost:4180
```

Na interface, envie um curriculo, escolha a area e a fonte de vagas. Por padrao, a fonte selecionada e `Gupy Brazil`.

## Comandos principais

```bash
npm run build
npm run lint
npm test
npm run test:unit
npm run test:e2e
```

Atalho de demo:

```bash
npm run demo:qa
npm run demo:all
```

## Fontes de vagas

| Fonte | Tipo | Precisa de chave? | Observacao |
|---|---|---:|---|
| `gupy` | Paginas publicas brasileiras | Nao | Fonte padrao da Web UI e CLI |
| `remoteok` | API publica | Nao | Vagas remotas |
| `remotive` | API publica | Nao | Vagas remotas |
| `themuse` | API publica | Nao | Vagas internacionais |
| `greenhouse` | API publica de ATS | Nao | Usa boards publicos |
| `lever` | API publica de ATS | Nao | Requer slugs publicos em `LEVER_COMPANY_SLUGS` |
| `all` | Agregador | Nao | Consulta as fontes publicas configuradas |

Exemplo com uma vaga brasileira de QA:

```bash
npm run dev -- -- --resume ./samples/sample-resume.txt --role qa --source gupy --limit 8 --fallback
```

## Saidas geradas

Os arquivos sao salvos em `output/`:

```text
output/job-match-report.xlsx
output/execution-summary.md
output/job-matches.json
output/jobs-analyzed.json
output/jobs-raw.json
output/resume-analysis.json
```

O Excel possui seis abas:

- `Ranking`: vagas ordenadas por score.
- `Details`: detalhes da analise de cada vaga.
- `QA Issues`: problemas encontrados nos dados.
- `Resume Analysis`: perfil tecnico extraido do curriculo.
- `Market Insights`: skills mais pedidas nas vagas.
- `Execution Summary`: resumo da execucao.

## Variaveis de ambiente

O app roda sem `.env`. Para configurar fontes ou IA, copie `.env.example` para `.env`.

| Variavel | Uso |
|---|---|
| `AI_PROVIDER` | `fallback`, `gemini`, `openai` ou `anthropic` |
| `GEMINI_API_KEY` | Chave opcional do Gemini |
| `OPENAI_API_KEY` | Chave opcional da OpenAI |
| `ANTHROPIC_API_KEY` | Chave opcional da Anthropic |
| `GUPY_CAREER_URLS` | URLs publicas da Gupy separadas por virgula |
| `GREENHOUSE_BOARD_TOKENS` | Boards publicos do Greenhouse |
| `LEVER_COMPANY_SLUGS` | Slugs publicos do Lever |

## Estrutura do projeto

```text
src/
  ai/        adaptadores de IA e fallback local
  cli/       parse e validacao dos argumentos
  config/    variaveis de ambiente
  matcher/   score, recomendacao e classificacao
  qa/        regras de qualidade dos dados
  reports/   Excel e Markdown
  resume/    leitura e sanitizacao do curriculo
  scraper/   fontes de vagas e validacao
  web/       interface web e API Express
```

## Privacidade e seguranca

- Curriculos enviados pela Web UI sao apagados apos a analise.
- Dados pessoais sao mascarados antes da analise.
- `.env`, `output/` e `uploads/` ficam fora do Git.
- O app usa apenas dados publicos, sem login, captcha bypass ou coleta agressiva.

## Como apresentar em entrevista

Pitch curto:

> "Eu criei uma aplicacao em TypeScript que coleta vagas publicas, analisa um curriculo, valida a qualidade dos dados e gera um relatorio Excel ranqueando as melhores oportunidades. Usei Playwright para testes automatizados e automacao, implementei regras de QA para dados inconsistentes e mantive o projeto rodando sem API key por fallback local."

Pontos para destacar:

- Playwright aplicado em testes e automacao.
- 80 testes automatizados passando.
- Fontes reais de vagas, incluindo Gupy.
- Excel com aba de QA Issues.
- Tratamento de erro e fallback.
- Codigo modular, tipado e documentado.

## Licenca

MIT
