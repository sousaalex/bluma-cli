import React from "react";
import { Box, Text } from "ink";

export interface UpdateNoticeProps {
  message: string; // raw message from checkForUpdates
}

function parseUpdateMessage(msg: string): {
  name?: string;
  current?: string;
  latest?: string;
  hint?: string;
} {
  // Expected raw pattern:
  // "Update available for <name>! <current> → <latest>Run npm i -g <name> to update."
  // We'll try to extract name, current, latest; otherwise fallback to raw
  const lines = msg.split(/\r?\n/).map((l) => l.trim());
  const first = lines[0] || "";
  const hintLine = lines.slice(1).join(" ") || "";

  const nameMatch = first.match(/Update available for\s+([^!]+)!/i);
  const versionMatch = first.match(/!\s*([^\s]+)\s*→\s*([^\s]+)/);

  const name = nameMatch?.[1]?.trim();
  const current = versionMatch?.[1]?.trim();
  const latest = versionMatch?.[2]?.trim();

  return {
    name,
    current,
    latest,
    hint: hintLine || undefined,
  };
}

export const UpdateNotice: React.FC<UpdateNoticeProps> = ({ message }) => {
  const { name, current, latest, hint } = parseUpdateMessage(message);

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="yellow" bold>Update Available</Text>
      {name && current && latest ? (
        <Text color="gray">{`${name}: ${current} → ${latest}`}</Text>
      ) : (
        <Text color="gray">{message}</Text>
      )}
      {hint ? <Text color="gray">{hint}</Text> : null}
    </Box>
  );
};

export default UpdateNotice;
