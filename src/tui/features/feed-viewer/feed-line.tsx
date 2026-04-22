import React from "react";
import { Text } from "ink";
import type { FeedEvent } from "../../types/aoi";
import { formatTime, eventColor, truncate } from "../../utils/format";

interface FeedLineProps {
  event: FeedEvent;
}

export function FeedLine({ event }: FeedLineProps) {
  const time = formatTime(event.ts);
  const color = eventColor(event.event);
  const msg = event.message ? ` ${truncate(event.message, 60)}` : "";

  return (
    <Text>
      <Text dimColor>[</Text>
      <Text dimColor>{time}</Text>
      <Text dimColor>]</Text>
      <Text> </Text>
      <Text color="cyan">{event.oracle}</Text>
      <Text> ▸ </Text>
      <Text color={color}>{event.event}</Text>
      <Text>{msg}</Text>
    </Text>
  );
}