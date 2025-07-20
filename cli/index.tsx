import React from 'react';
import { render } from 'ink';
import App from './components/App';
import { v4 as uuidv4 } from 'uuid'; // importa a função para gerar UUID

// Recebe sessionId do argumento de linha de comando ou gera um novo UUID
const sessionId = process.argv[2] || uuidv4();

render(<App sessionId={sessionId} />);
