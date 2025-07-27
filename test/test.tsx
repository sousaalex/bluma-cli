// SimpleMessage.tsx
import React from 'react';
import { Text, Box } from 'ink';

// Define as props que o componente espera
interface Props {
	name: string; // Nome a ser exibido na mensagem
}

// Componente funcional usando React.FC tipado por Props
const SimpleMessage: React.FC<Props> = ({ name }) => {
	// Renderiza um Box do Ink com um texto em verde
	return (
		<Box>
			{/* Exibe a mensagem de saudação em verde */}
			<Text color="green">Hello, {name}!</Text>
		</Box>
	);
};

// Exporta o componente como padrão para uso em outros arquivos
export default SimpleMessage;

