import React from 'react';
import { render } from 'ink';
import App from './components/App';
import { v4 as uuidv4 } from 'uuid';

const sessionId = uuidv4();

render(<App sessionId={sessionId} />); 