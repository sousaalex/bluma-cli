// Ficheiro: src/tools/natives/todo.ts

/**
 * Estrutura de uma tarefa individual
 */
export interface TodoItem {
  id: number;
  description: string;
  isComplete: boolean;
}

/**
 * Argumentos aceites pela função `todo`
 */
export interface TodoArgs {
  tasks: {
    description: string;
    isComplete: boolean;
  }[];
}

/**
 * Implementação principal da ferramenta TODO
 * Recebe uma lista de tarefas com o campo `isComplete`
 */
export async function todo({ tasks }: TodoArgs): Promise<TodoItem[]> {
  const todos: TodoItem[] = tasks.map((task, index) => ({
    id: index + 1,
    description: task.description,
    isComplete: task.isComplete,
  }));

  return todos;
}
