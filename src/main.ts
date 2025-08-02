// src/main.ts

import React from 'react';
import { render } from 'ink';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import App, { AppProps } from './app/ui/App.js';
import { startTitleKeeper } from './app/ui/utils/terminalTitle.js';

// Start persistent terminal title keeper
const BLUMA_TITLE = process.env.BLUMA_TITLE || 'BluMa - NomadEngenuity';
startTitleKeeper(BLUMA_TITLE);

// 1. Prepara as dependências mínimas que a UI precisa para iniciar.
const eventBus = new EventEmitter();
const sessionId = uuidv4();

// 2. Prepara as props para o componente App.
const props: AppProps = {
  eventBus,
  sessionId,
};

// 3. Renderiza a UI e encerra sua responsabilidade.
//    Toda a lógica da aplicação agora vive dentro do App.tsx.
render(React.createElement(App, props));