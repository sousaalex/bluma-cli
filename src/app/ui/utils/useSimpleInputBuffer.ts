// Ficheiro: utils/useCustomInput.ts
import { useReducer } from 'react';
import { useInput, type Key } from 'ink';

// O Estado (inalterado)
interface InputState {
  text: string;
  cursorPosition: number;
  viewStart: number;
}

// As Ações (inalterado)
type InputAction =
  | { type: 'INPUT'; payload: string }
  | { type: 'MOVE_CURSOR'; direction: 'left' | 'right' }
  | { type: 'BACKSPACE' }
  | { type: 'SUBMIT' };

// O Reducer (inalterado)
function inputReducer(state: InputState, action: InputAction, viewWidth: number): InputState {
  const adjustView = (newCursorPos: number, currentViewStart: number): number => {
    if (newCursorPos < currentViewStart) {
      return newCursorPos;
    }
    if (newCursorPos >= currentViewStart + viewWidth) {
      return newCursorPos - viewWidth + 1;
    }
    return currentViewStart;
  };

  switch (action.type) {
    case 'INPUT': {
      const cleanInput = action.payload.replace(/(\r\n|\n|\r)/gm, "");
      const newText =
        state.text.slice(0, state.cursorPosition) +
        cleanInput +
        state.text.slice(state.cursorPosition);
      const newCursorPosition = state.cursorPosition + cleanInput.length;
      const newViewStart = adjustView(newCursorPosition, state.viewStart);
      return { text: newText, cursorPosition: newCursorPosition, viewStart: newViewStart };
    }
    case 'MOVE_CURSOR': {
      let newCursorPosition = state.cursorPosition;
      if (action.direction === 'left' && state.cursorPosition > 0) newCursorPosition--;
      if (action.direction === 'right' && state.cursorPosition < state.text.length) newCursorPosition++;
      const newViewStart = adjustView(newCursorPosition, state.viewStart);
      return { ...state, cursorPosition: newCursorPosition, viewStart: newViewStart };
    }
    case 'BACKSPACE': {
      if (state.cursorPosition > 0) {
        const newText =
          state.text.slice(0, state.cursorPosition - 1) +
          state.text.slice(state.cursorPosition);
        const newCursorPosition = state.cursorPosition - 1;
        const newViewStart = adjustView(newCursorPosition, state.viewStart);
        return { text: newText, cursorPosition: newCursorPosition, viewStart: newViewStart };
      }
      return state;
    }
    case 'SUBMIT': {
      return { text: '', cursorPosition: 0, viewStart: 0 };
    }
    default:
      return state;
  }
}

// O Hook
interface UseCustomInputProps {
  onSubmit: (value: string) => void;
  viewWidth: number;
  isReadOnly: boolean;
  onInterrupt: () => void;
}

export const useCustomInput = ({ onSubmit, viewWidth, isReadOnly, onInterrupt }: UseCustomInputProps) => {
  const [state, dispatch] = useReducer(
    (s: InputState, a: InputAction) => inputReducer(s, a, viewWidth),
    { text: '', cursorPosition: 0, viewStart: 0 }
  );

  useInput(
    (input, key: Key) => {
      // SEMPRE permite que ESC interrompa, independentemente de isReadOnly
      if (key.escape) {
        onInterrupt();
        return; // Não processa mais nada se ESC for pressionado
      }

      // Em modo read-only (processing):
      // - Permite digitação e backspace para atualizar buffer visual
      // - ENTER submete conteúdo para onSubmit (InputPrompt fará overlay [hint]) e limpa buffer
      if (isReadOnly) {
        if (key.return) {
          if (state.text.trim().length > 0) {
            onSubmit(state.text);
            dispatch({ type: 'SUBMIT' });
          }
          return;
        }
        if (key.backspace || key.delete) return dispatch({ type: 'BACKSPACE' });
        if (key.leftArrow) return dispatch({ type: 'MOVE_CURSOR', direction: 'left' });
        if (key.rightArrow) return dispatch({ type: 'MOVE_CURSOR', direction: 'right' });
        if (key.ctrl || key.meta || key.tab) return;
        return dispatch({ type: 'INPUT', payload: input });
      }

      // Lógica existente para outras teclas (modo editável)
      if (key.return) {
        if (state.text.trim().length > 0) {
          onSubmit(state.text);
          dispatch({ type: 'SUBMIT' });
        }
        return;
      }
      if (key.backspace || key.delete) return dispatch({ type: 'BACKSPACE' });
      if (key.leftArrow) return dispatch({ type: 'MOVE_CURSOR', direction: 'left' });
      if (key.rightArrow) return dispatch({ type: 'MOVE_CURSOR', direction: 'right' });
      if (key.ctrl || key.meta || key.tab) return;
      
      dispatch({ type: 'INPUT', payload: input });
    },
    // useInput está SEMPRE ativo para capturar todas as teclas
    { isActive: true } 
  );

  return {
    text: state.text,
    cursorPosition: state.cursorPosition,
    viewStart: state.viewStart
  };
};