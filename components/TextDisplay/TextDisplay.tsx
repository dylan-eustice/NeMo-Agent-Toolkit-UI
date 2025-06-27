import React, { useEffect, useRef, useState, useCallback } from 'react';

interface TextDisplayProps {
  availableChannels: number[];
  selectedChannel: number;
  onChannelChange: (channel: number) => void;
}

export const TextDisplay: React.FC<TextDisplayProps> = React.memo(({
  availableChannels,
  selectedChannel,
  onChannelChange
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');

  // Move polling logic into this component to isolate updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Get text for selected channel
        const textRes = await fetch(`/api/update-text?channel=${selectedChannel}`);
        if (textRes.ok) {
          const textData = await textRes.json();
          if (typeof textData.text === 'string') {
            setText(textData.text);
          }
        }
      } catch (err) {
        // Optionally handle error
      }
    }, 100);
    return () => clearInterval(interval);
  }, [selectedChannel]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text]);

  return (
    <div className="w-full sm:w-[95%] 2xl:w-[60%] mx-auto mt-1 mb-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-left text-lg font-semibold text-black dark:text-white">
          Live Radio Transcript
        </h2>
        {availableChannels.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-black dark:text-white">Channel:</label>
            <select
              value={selectedChannel}
              onChange={(e) => onChannelChange(parseInt(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-black dark:text-white"
            >
              {availableChannels.map(channel => (
                <option key={channel} value={channel}>
                  Channel {channel}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div
        ref={scrollRef}
        className="bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-900 p-2 max-h-16 overflow-y-auto"
      >
        <p className="text-black dark:text-white whitespace-pre-wrap m-0">
          {text || 'Waiting for text...'}
        </p>
      </div>
    </div>
  );
});