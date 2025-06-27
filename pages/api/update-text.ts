import type { NextApiRequest, NextApiResponse } from 'next';

// Module-level variable to store text for multiple channels
interface TextData {
  text: string;
  channel_id: number;
  timestamp: number;
}

let channelTexts: { [channelId: number]: TextData } = {};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { text, channel_id, timestamp } = req.body;
    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'Text must be a string.' });
    }
    const channelId = channel_id || 0;
    channelTexts[channelId] = {
      text,
      channel_id: channelId,
      timestamp: timestamp || Date.now()
    };
    return res.status(200).json({ success: true });
  }

  if (req.method === 'GET') {
    const { channel } = req.query;

    if (channel !== undefined) {
      // Get text for specific channel
      const channelId = parseInt(channel as string);
      const channelData = channelTexts[channelId];
      return res.status(200).json({
        text: channelData?.text || '',
        channel_id: channelId
      });
    } else {
      // Get all available channels
      const channels = Object.keys(channelTexts).map(id => parseInt(id));
      return res.status(200).json({
        channels,
        texts: channelTexts
      });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}