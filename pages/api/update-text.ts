import type { NextApiRequest, NextApiResponse } from 'next';

// Module-level variable to store text for multiple channels
interface TextData {
  text: string;
  channel_id: number;
  timestamp: number;
  finalized?: boolean;
}

interface FinalizedTranscript {
  text: string;
  channel_id: number;
  timestamp: number;
  id: string; // unique identifier for each finalized transcript
  uuid?: string; // UUID from the backend for database tracking
  pending?: boolean; // indicates if transcript is pending database processing
}

let channelTexts: { [channelId: number]: TextData } = {};
let finalizedTranscripts: FinalizedTranscript[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { text, channel_id, timestamp, finalized, uuid } = req.body;
    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'Text must be a string.' });
    }
    const channelId = channel_id || 0;
    const currentTimestamp = timestamp || Date.now();

    if (finalized) {
      // Store finalized transcript
      const finalizedTranscript: FinalizedTranscript = {
        text,
        channel_id: channelId,
        timestamp: currentTimestamp,
        id: `${channelId}-${currentTimestamp}-${Math.random().toString(36).substr(2, 9)}`,
        uuid: uuid, // Store the UUID from the backend
        pending: true // Initially mark as pending database processing
      };
      finalizedTranscripts.push(finalizedTranscript);

      // Sort by channel_id, then by timestamp
      finalizedTranscripts.sort((a, b) => {
        if (a.channel_id !== b.channel_id) {
          return a.channel_id - b.channel_id;
        }
        return a.timestamp - b.timestamp;
      });

      // Clear the live text for this channel since it's now finalized
      if (channelTexts[channelId]) {
        channelTexts[channelId].text = '';
      }
    } else {
      // Store live text
      channelTexts[channelId] = {
        text,
        channel_id: channelId,
        timestamp: currentTimestamp,
        finalized: false
      };
    }

    return res.status(200).json({ success: true });
  }

  if (req.method === 'GET') {
    const { channel, type } = req.query;

    if (type === 'finalized') {
      // Get finalized transcripts
      if (channel !== undefined) {
        const channelId = parseInt(channel as string);
        const channelFinalizedTranscripts = finalizedTranscripts.filter(
          transcript => transcript.channel_id === channelId
        );
        return res.status(200).json({
          transcripts: channelFinalizedTranscripts,
          channel_id: channelId
        });
      } else {
        // Get all finalized transcripts
        return res.status(200).json({
          transcripts: finalizedTranscripts
        });
      }
    }

    if (channel !== undefined) {
      // Get live text for specific channel
      const channelId = parseInt(channel as string);
      const channelData = channelTexts[channelId];
      return res.status(200).json({
        text: channelData?.text || '',
        channel_id: channelId
      });
    } else {
      // Get all available channels with live text
      const channels = Object.keys(channelTexts).map(id => parseInt(id));
      return res.status(200).json({
        channels,
        texts: channelTexts
      });
    }
  }

  // PATCH method for updating transcript processing status
  if (req.method === 'PATCH') {
    const { uuid, pending } = req.body;

    if (!uuid) {
      return res.status(400).json({ error: 'UUID is required.' });
    }

    // Find the transcript by UUID and update its pending status
    const transcriptIndex = finalizedTranscripts.findIndex(
      transcript => transcript.uuid === uuid
    );

    if (transcriptIndex === -1) {
      return res.status(404).json({ error: 'Transcript not found.' });
    }

    finalizedTranscripts[transcriptIndex].pending = pending;

    return res.status(200).json({
      success: true,
      transcript: finalizedTranscripts[transcriptIndex]
    });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}