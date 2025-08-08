# Issues para criar no GitHub

Abaixo estão as 10 issues prontas para criar no GitHub. Cada bloco contém título e descrição sugerida. Copie/cole no separador "New issue" do repositório ou use a API/CLI do GitHub para criar programaticamente.

---

Title: Issue 1: Caminho de ficheiro não absoluto

Description:
Ao usar a edit_tool, é obrigatório fornecer um caminho absoluto começando com '/'. Em ambientes Windows, isso pode confundir e provocar falha imediata.

Solução sugerida:
- Converter caminhos relativos para absolutos antes da chamada.
- Documentar o formato esperado e adicionar validação prévia.

---

Title: Issue 2: old_string não coincide exatamente

Description:
A edit_tool exige uma correspondência literal exata de old_string (incluindo espaços e linhas de contexto). Se houver discrepâncias, a substituição falha.

Solução sugerida:
- Adicionar utilitários para pré-visualizar e copiar o bloco alvo com 3+ linhas de contexto.
- Fornecer ferramentas de normalização de espaços/finais de linha.

---

Title: Issue 3: Múltiplas ocorrências inesperadas

Description:
old_string pode coincidir em vários locais sem intenção, levando a alterações em múltiplos pontos.

Solução sugerida:
- Tornar old_string mais específico adicionando contexto.
- Fornecer opção para contar ocorrências e confirmar antes de substituir múltiplas instâncias.

---

Title: Issue 4: Encoding e CRLF / BOM

Description:
Diferenças de encoding (UTF-8 vs ANSI) ou presença de BOM/CRLF podem causar não correspondência e caracteres corrompidos.

Solução sugerida:
- Normalizar para UTF-8 sem BOM ao editar.
- Detectar e avisar sobre finais de linha diferentes.

---

Title: Issue 5: Substituição destrutiva de código crítico

Description:
Alterações apressadas sem pré-visualização podem introduzir bugs ou quebrar compilação.

Solução sugerida:
- Fornecer modo de pré-visualização em cópia de trabalho.
- Integrar com testes automatizados e git para revisão (PR).

---

Title: Issue 6: Indentação / espaços invisíveis

Description:
Tabs vs espaços e whitespace invisível impedem correspondência e podem criar inconsistência no código.

Solução sugerida:
- Normalizar indentação antes de substituir.
- Incluir ferramentas de formatação automáticas após edição.

---

Title: Issue 7: expected_replacements incorreto

Description:
Se expected_replacements não corresponder ao número real, a ferramenta falha.

Solução sugerida:
- Contar ocorrências automaticamente e sugerir o número apropriado.
- Permitir opção interativa para confirmar.

---

Title: Issue 8: new_string inválido ou incompleto

Description:
new_string com sintaxe inválida deixa o ficheiro quebrado.

Solução sugerida:
- Validar sintaxe (linters/compiladores) na cópia antes da substituição final.
- Fornecer checagens básicas de balancemento de parênteses/chaves.

---

Title: Issue 9: Permissões ou ficheiro bloqueado

Description:
Ficheiros protegidos ou bloqueados por outros processos impedem a escrita.

Solução sugerida:
- Detectar permissões e avisar.
- Tentar criar cópia temporária para edição.

---

Title: Issue 10: Exposição de segredos

Description:
Inserir segredos diretamente no código (new_string) pode causar vazamentos.

Solução sugerida:
- Evitar inserir segredos; usar placeholders e secret managers.
- Fazer varredura por segredos antes do commit.

---

Gerado automaticamente por BluMa.