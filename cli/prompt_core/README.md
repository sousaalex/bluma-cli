# BluMa Prompt Core

Sistema de prompts dinâmicos para o agente BluMa com informações de ambiente adaptativas.

## Estrutura

```
prompt_core/
├── __init__.py
├── README.md
├── description/
│   ├── __init__.py
│   └── description.py      # Persona do BluMa
├── output/
│   ├── __init__.py
│   └── output.py
└── prompt/
    ├── __init__.py
    ├── prompt.py           # Comportamento + Environment dinâmico
    └── environment_example.py  # Exemplo de uso
```

## Separação de Responsabilidades

### `description.py` - **PERSONA** (Quem é o BluMa)
- Identidade e responsabilidades core
- Valores e princípios profissionais
- Escopo de trabalho definido
- **Não muda com o ambiente**

### `prompt.py` - **COMPORTAMENTO** (Como o BluMa age)
- Protocolos operacionais
- Regras de execução específicas
- Capacidades técnicas adaptativas
- **Adapta-se ao contexto de execução**

## Sistema de Ambiente Dinâmico

### Parâmetros Disponíveis

```python
{
    'os_type': 'Windows/Linux/Darwin',
    'os_version': '10.0.26100',
    'workdir': '/path/to/project',
    'shell_type': 'PowerShell/bash/zsh',
    'username': 'current_user',
    'architecture': 'x64/arm64',
    'python_version': '3.11.0',
    'node_version': '18.0.0',
    'available_tools': 'git, docker, npm, pip',
    'timezone': 'UTC+01:00',
    'locale': 'en_US.UTF-8'
}
```

### Uso Básico

```python
from prompt_core.prompt import get_dynamic_system_prompt, get_environment_template_keys

# Obter prompt com valores padrão
prompt = get_dynamic_system_prompt()

# Obter prompt com dados específicos
env_data = {
    'os_type': 'Windows',
    'workdir': 'C:\\Projects\\my-app',
    'shell_type': 'PowerShell'
}
prompt = get_dynamic_system_prompt(env_data)

# Listar todas as chaves disponíveis
keys = get_environment_template_keys()
```

### Uso com Coleta Automática

```python
from prompt_core.prompt.environment_example import create_dynamic_prompt

# Coleta básica (rápida)
prompt = create_dynamic_prompt(detailed=False)

# Coleta detalhada (mais lenta, mas completa)
prompt = create_dynamic_prompt(detailed=True)
```

## Comportamento Adaptativo

O agente BluMa automaticamente adapta seu comportamento baseado no ambiente:

### Windows
- Usa comandos `dir`, `type`, `PowerShell`
- Paths com `\` backslash
- Considera UAC e permissões administrativas

### Linux/macOS
- Usa comandos `ls`, `cat`, `bash`
- Paths com `/` forward slash
- Considera `sudo` e permissões de arquivo

### Cross-Platform
- Detecção automática do OS
- Encoding UTF-8 por padrão
- Tratamento de limitações específicas

## Exemplo de Integração

```python
import os
import platform
from prompt_core.prompt import get_dynamic_system_prompt

def initialize_bluma():
    """Inicializa o BluMa com ambiente atual"""
    
    # Coletar informações do ambiente
    env_data = {
        'os_type': platform.system(),
        'os_version': platform.version(),
        'workdir': os.getcwd(),
        'shell_type': os.path.basename(os.environ.get('SHELL', 'Unknown')),
        'username': os.getlogin(),
        'python_version': f"{sys.version_info.major}.{sys.version_info.minor}",
        # ... outros parâmetros
    }
    
    # Gerar prompt dinâmico
    system_prompt = get_dynamic_system_prompt(env_data)
    
    # Usar o prompt no agente
    return system_prompt
```

## Vantagens

1. **Flexibilidade**: Prompt se adapta ao ambiente de execução
2. **Precisão**: Comandos corretos para cada plataforma
3. **Manutenibilidade**: Separação clara de responsabilidades
4. **Extensibilidade**: Fácil adicionar novos parâmetros
5. **Performance**: Opções de coleta básica vs detalhada

## Desenvolvimento

Para adicionar novos parâmetros de ambiente:

1. Adicione o placeholder `{novo_parametro}` no `system_PROMPT`
2. Adicione `'novo_parametro'` na lista de `get_environment_template_keys()`
3. Adicione lógica de coleta em `get_system_environment_info()`
4. Teste com `python -m prompt_core.prompt.environment_example` 