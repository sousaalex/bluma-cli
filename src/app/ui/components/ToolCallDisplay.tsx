// Em: src/components/ToolCallDisplay.tsx

import React, { memo } from 'react';
import { Box } from 'ink';
import { ToolRenderDisplay, renderGenericToolCall } from './toolCallRenderers.js';

interface ToolCallDisplayProps {
  toolName: string;
  args: any;
  // V--- ADICIONE A NOVA PROP OPCIONAL ---V
  preview?: string;
}

const ToolCallDisplayComponent = ({ toolName, args, preview }: ToolCallDisplayProps) => {
  if (toolName.includes("message_notify_user") || toolName.includes("agent_end_turn")) {
    return null;
  }

  const Renderer = ToolRenderDisplay[toolName] || renderGenericToolCall;

  return (
    <Box marginBottom={1}>
      {/* V--- PASSE O PREVIEW PARA O RENDERIZADOR ---V */}
      <Renderer toolName={toolName} args={args} preview={preview} />
    </Box>
  );
};

export const ToolCallDisplay = memo(ToolCallDisplayComponent);