import { render } from 'ink';
import { v4 as uuidv4 } from 'uuid';
import App from './components/App';

// 1. Gera um ID de sessão único CADA VEZ que o CLI é iniciado.
const sessionId = uuidv4();

// 2. Renderiza o componente App, passando o ID gerado como uma prop.
render(<App sessionId={sessionId} />);
