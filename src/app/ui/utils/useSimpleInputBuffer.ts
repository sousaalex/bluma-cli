// Ficheiro: utils/useCustomInput.ts - PASTE ÚNICO RENDER
import { useReducer, useRef, useCallback, useEffect } from 'react';
import { useInput, type Key } from 'ink';

// O Estado
interface InputState {
  text: string;
  cursorPosition: number;
  viewStart: number;
}

// As Ações
type InputAction =
  | { type: 'INPUT'; payload: string }
  | { type: 'NEWLINE' }
  | { type: 'MOVE_CURSOR'; direction: 'left' | 'right' | 'up' | 'down' }
  | { type: 'MOVE_LINE_START' }
  | { type: 'MOVE_LINE_END' }
  | { type: 'BACKSPACE' }
  | { type: 'DELETE' }
  | { type: 'SUBMIT' }
  | { type: 'SET'; payload: { text: string; moveCursorToEnd?: boolean; cursorPosition?: number } }
  | { type: 'SET_CURSOR'; payload: number };

// Helper: encontra a posição de início da linha atual
function getLineStart(text: string, cursorPos: number): number {
  let pos = cursorPos - 1;
  while (pos >= 0 && text[pos] !== '\n') {
    pos--;
  }
  return pos + 1;
}

// Helper: encontra a posição de fim da linha atual
function getLineEnd(text: string, cursorPos: number): number {
  let pos = cursorPos;
  while (pos < text.length && text[pos] !== '\n') {
    pos++;
  }
  return pos;
}

// Helper: move cursor para linha acima/abaixo mantendo coluna
function moveToAdjacentLine(text: string, cursorPos: number, direction: 'up' | 'down'): number {
  const currentLineStart = getLineStart(text, cursorPos);
  const currentLineEnd = getLineEnd(text, cursorPos);
  const column = cursorPos - currentLineStart;

  if (direction === 'up') {
    if (currentLineStart === 0) return cursorPos;
    
    const prevLineEnd = currentLineStart - 1;
    const prevLineStart = getLineStart(text, prevLineEnd);
    const prevLineLength = prevLineEnd - prevLineStart;
    
    return prevLineStart + Math.min(column, prevLineLength);
  } else {
    if (currentLineEnd === text.length) return cursorPos;
    
    const nextLineStart = currentLineEnd + 1;
    const nextLineEnd = getLineEnd(text, nextLineStart);
    const nextLineLength = nextLineEnd - nextLineStart;
    
    return nextLineStart + Math.min(column, nextLineLength);
  }
}

// O Reducer
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
      const cleanInput = action.payload.replace(/(\r\n|\r)/gm, "\n");
      const newText =
        state.text.slice(0, state.cursorPosition) +
        cleanInput +
        state.text.slice(state.cursorPosition);
      const newCursorPosition = state.cursorPosition + cleanInput.length;
      const newViewStart = adjustView(newCursorPosition, state.viewStart);
      
      if (newText === state.text && newCursorPosition === state.cursorPosition) {
        return state;
      }
      
      return { text: newText, cursorPosition: newCursorPosition, viewStart: newViewStart };
    }
    
    case 'NEWLINE': {
      const newText =
        state.text.slice(0, state.cursorPosition) +
        '\n' +
        state.text.slice(state.cursorPosition);
      const newCursorPosition = state.cursorPosition + 1;
      const newViewStart = adjustView(newCursorPosition, state.viewStart);
      return { text: newText, cursorPosition: newCursorPosition, viewStart: newViewStart };
    }
    
    case 'MOVE_CURSOR': {
      let newCursorPosition = state.cursorPosition;
      
      if (action.direction === 'left' && state.cursorPosition > 0) {
        newCursorPosition--;
      } else if (action.direction === 'right' && state.cursorPosition < state.text.length) {
        newCursorPosition++;
      } else if (action.direction === 'up') {
        newCursorPosition = moveToAdjacentLine(state.text, state.cursorPosition, 'up');
      } else if (action.direction === 'down') {
        newCursorPosition = moveToAdjacentLine(state.text, state.cursorPosition, 'down');
      }
      
      if (newCursorPosition === state.cursorPosition) {
        return state;
      }
      
      const newViewStart = adjustView(newCursorPosition, state.viewStart);
      return { ...state, cursorPosition: newCursorPosition, viewStart: newViewStart };
    }
    
    case 'MOVE_LINE_START': {
      const newCursorPosition = getLineStart(state.text, state.cursorPosition);
      if (newCursorPosition === state.cursorPosition) {
        return state;
      }
      const newViewStart = adjustView(newCursorPosition, state.viewStart);
      return { ...state, cursorPosition: newCursorPosition, viewStart: newViewStart };
    }
    
    case 'MOVE_LINE_END': {
      const newCursorPosition = getLineEnd(state.text, state.cursorPosition);
      if (newCursorPosition === state.cursorPosition) {
        return state;
      }
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
    
    case 'DELETE': {
      if (state.cursorPosition < state.text.length) {
        const newText =
          state.text.slice(0, state.cursorPosition) +
          state.text.slice(state.cursorPosition + 1);
        return { ...state, text: newText };
      }
      return state;
    }
    
    case 'SUBMIT': {
      return { text: '', cursorPosition: 0, viewStart: 0 };
    }
    
    case 'SET': {
      const t = action.payload.text.replace(/(\r\n|\r)/gm, "\n");
      let newCursorPosition: number;
      if (typeof action.payload.cursorPosition === 'number') {
        newCursorPosition = Math.min(action.payload.cursorPosition, t.length);
      } else if (action.payload.moveCursorToEnd ?? true) {
        newCursorPosition = t.length;
      } else {
        newCursorPosition = Math.min(state.cursorPosition, t.length);
      }
      const newText = t;
      const newViewStart = adjustView(newCursorPosition, 0);
      return { text: newText, cursorPosition: newCursorPosition, viewStart: newViewStart };
    }
    
    case 'SET_CURSOR': {
      const newCursorPosition = Math.max(0, Math.min(action.payload, state.text.length));
      if (newCursorPosition === state.cursorPosition) {
        return state;
      }
      const newViewStart = adjustView(newCursorPosition, state.viewStart);
      return { ...state, cursorPosition: newCursorPosition, viewStart: newViewStart };
    }
    
    default:
      return state;
  }
}

// O Hook - COM BATCHING REAL (um único dispatch)
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

  // NOVA ESTRATÉGIA: Acumular inputs em um buffer e processar APENAS UMA VEZ
  const inputBuffer = useRef<string>('');
  const flushScheduled = useRef<boolean>(false);

  // Flush o buffer acumulado - APENAS UM DISPATCH
  const flushInputBuffer = useCallback(() => {
    if (inputBuffer.current.length > 0) {
      const buffered = inputBuffer.current;
      inputBuffer.current = '';
      dispatch({ type: 'INPUT', payload: buffered });
    }
    flushScheduled.current = false;
  }, []);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (flushScheduled.current) {
        flushInputBuffer();
      }
    };
  }, [flushInputBuffer]);

  useInput(
    (input, key: Key) => {
      // Se há buffer pendente e não é input de texto, flush primeiro
      if (inputBuffer.current.length > 0 && (key.ctrl || key.meta || key.escape || 
          key.return || key.backspace || key.delete || key.leftArrow || 
          key.rightArrow || key.upArrow || key.downArrow || key.tab)) {
        flushInputBuffer();
      }

      // SEMPRE permite que ESC interrompa
      if (key.escape) {
        onInterrupt();
        return;
      }

      // Em modo read-only
      if (isReadOnly) {
        if (key.ctrl && key.return) {
          if (state.text.trim().length > 0) {
            onSubmit(state.text);
            dispatch({ type: 'SUBMIT' });
          }
          return;
        }
        if (key.return) {
          dispatch({ type: 'NEWLINE' });
          return;
        }
        if (key.backspace) return dispatch({ type: 'BACKSPACE' });
        if (key.delete) return dispatch({ type: 'DELETE' });
        if (key.leftArrow) return dispatch({ type: 'MOVE_CURSOR', direction: 'left' });
        if (key.rightArrow) return dispatch({ type: 'MOVE_CURSOR', direction: 'right' });
        if (key.upArrow) return dispatch({ type: 'MOVE_CURSOR', direction: 'up' });
        if (key.downArrow) return dispatch({ type: 'MOVE_CURSOR', direction: 'down' });
        if (key.ctrl || key.meta || key.tab) return;
        
        // Input normal em read-only: acumula no buffer
        inputBuffer.current += input;
        if (!flushScheduled.current) {
          flushScheduled.current = true;
          // Usa queueMicrotask para processar no próximo tick - CRÍTICO
          queueMicrotask(flushInputBuffer);
        }
        return;
      }

      // Modo editável
      if (key.ctrl && key.return) {
        if ((globalThis as any).__BLUMA_AT_OPEN__) return;
        if ((globalThis as any).__BLUMA_SUPPRESS_SUBMIT__) {
          (globalThis as any).__BLUMA_SUPPRESS_SUBMIT__ = false;
          return;
        }
        if (state.text.trim().length > 0) {
          onSubmit(state.text);
          dispatch({ type: 'SUBMIT' });
        }
        return;
      }
      
      if (key.shift && key.return) {
        dispatch({ type: 'NEWLINE' });
        return;
      }
      
      if (key.return) {
        if ((globalThis as any).__BLUMA_AT_OPEN__) return;
        if ((globalThis as any).__BLUMA_SUPPRESS_SUBMIT__) {
          (globalThis as any).__BLUMA_SUPPRESS_SUBMIT__ = false;
          return;
        }
        
        if (state.text.trim().length > 0) {
          onSubmit(state.text);
          dispatch({ type: 'SUBMIT' });
        }
        return;
      }
      
      // Navegação
      if (key.backspace) return dispatch({ type: 'BACKSPACE' });
      if (key.delete) return dispatch({ type: 'DELETE' });
      if (key.leftArrow) return dispatch({ type: 'MOVE_CURSOR', direction: 'left' });
      if (key.rightArrow) return dispatch({ type: 'MOVE_CURSOR', direction: 'right' });
      if (key.upArrow) return dispatch({ type: 'MOVE_CURSOR', direction: 'up' });
      if (key.downArrow) return dispatch({ type: 'MOVE_CURSOR', direction: 'down' });
      
      // Home/End
      if (key.ctrl && input === 'a') {
        return dispatch({ type: 'MOVE_LINE_START' });
      }
      if (key.ctrl && input === 'e') {
        return dispatch({ type: 'MOVE_LINE_END' });
      }
      
      // Ignora outros ctrl/meta/tab
      if (key.ctrl || key.meta || key.tab) return;
      
      // Input normal: acumula no buffer
      inputBuffer.current += input;
      if (!flushScheduled.current) {
        flushScheduled.current = true;
        // queueMicrotask garante que todos os inputs de um paste sejam batched
        queueMicrotask(flushInputBuffer);
      }
    },
    { isActive: true }
  );

  return {
    text: state.text,
    cursorPosition: state.cursorPosition,
    viewStart: state.viewStart,
    setText: useCallback((t: string, pos?: number) => {
      // Flush qualquer input pendente antes de SET
      if (inputBuffer.current.length > 0) {
        flushInputBuffer();
      }
      if (typeof pos === 'number') {
        dispatch({ type: 'SET', payload: { text: t, moveCursorToEnd: false, cursorPosition: pos } });
      } else {
        dispatch({ type: 'SET', payload: { text: t, moveCursorToEnd: true } });
      }
    }, [flushInputBuffer]),
    setCursor: useCallback((pos: number) => {
      // Flush qualquer input pendente antes de SET_CURSOR
      if (inputBuffer.current.length > 0) {
        flushInputBuffer();
      }
      dispatch({ type: 'SET_CURSOR', payload: pos });
    }, [flushInputBuffer]),
  };
};