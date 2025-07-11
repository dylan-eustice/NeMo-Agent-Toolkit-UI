// SPDX-FileCopyrightText: Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: MIT

import React, { useState, useEffect, useContext } from 'react';
import { IconRefresh, IconFilter, IconHistory, IconSortAscending, IconSortDescending, IconClock, IconCheck } from '@tabler/icons-react';
import HomeContext from './api/home/home.context';

interface FinalizedTranscript {
  text: string;
  stream_id: string;
  timestamp: number;
  id: string;
  uuid?: string;
  pending?: boolean;
}

const TranscriptHistory = () => {
  const [transcripts, setTranscripts] = useState<FinalizedTranscript[]>([]);
  const [filteredTranscripts, setFilteredTranscripts] = useState<FinalizedTranscript[]>([]);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [availableStreams, setAvailableStreams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>(() => {
    // Initialize from localStorage, fallback to 'newest'
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('transcript-sort-order') as 'newest' | 'oldest') || 'newest';
    }
    return 'newest';
  });

  const homeContext = useContext(HomeContext);
  const lightMode = homeContext?.state?.lightMode || 'light';

  // Save sort order to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('transcript-sort-order', sortOrder);
    }
  }, [sortOrder]);

  // Fetch finalized transcripts
  const fetchTranscripts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/update-text?type=finalized');
      if (!response.ok) {
        throw new Error('Failed to fetch transcripts');
      }
      const data = await response.json();
      setTranscripts(data.transcripts || []);

      // Extract unique stream IDs
      const streamIds = data.transcripts.map((t: FinalizedTranscript) => t.stream_id);
      const streams = Array.from(new Set<string>(streamIds)).sort((a: string, b: string) => a.localeCompare(b));
      setAvailableStreams(streams);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort transcripts based on selected stream and sort order
  useEffect(() => {
    let filtered = selectedStream === null
      ? transcripts
      : transcripts.filter((t: FinalizedTranscript) => t.stream_id === selectedStream);

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      // First sort by stream_id
      if (a.stream_id !== b.stream_id) {
        return a.stream_id.localeCompare(b.stream_id);
      }
      // Then sort by timestamp based on sort order
      // Convert timestamps to numbers to ensure proper comparison
      const timestampA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
      const timestampB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;

      if (sortOrder === 'newest') {
        return timestampB - timestampA; // Newest first
      } else {
        return timestampA - timestampB; // Oldest first
      }
    });

    setFilteredTranscripts(filtered);
  }, [transcripts, selectedStream, sortOrder]);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchTranscripts();
    const interval = setInterval(fetchTranscripts, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatStreamName = (streamId: string) => {
    return streamId || 'Default Stream';
  };

  const getStreamColor = (streamId: string) => {
    // Generate a consistent color based on stream ID hash
    let hash = 0;
    for (let i = 0; i < streamId.length; i++) {
      const char = streamId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    const colors = [
      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className={`min-h-screen ${lightMode === 'dark' ? 'dark' : ''}`}>
      <div className="bg-white dark:bg-gray-900 min-h-screen">
        {/* Header */}
        <div className="bg-[#76b900] dark:bg-gray-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <IconHistory className="w-8 h-8 text-white" />
                <h1 className="text-xl font-semibold text-white">
                  Transcript History
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                  className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md text-white transition-colors"
                  title={`Sort by ${sortOrder === 'newest' ? 'oldest first' : 'newest first'}`}
                >
                  {sortOrder === 'newest' ? (
                    <IconSortDescending className="w-4 h-4" />
                  ) : (
                    <IconSortAscending className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
                  </span>
                </button>
                <button
                  onClick={fetchTranscripts}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md text-white transition-colors disabled:opacity-50"
                >
                  <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stream Filter */}
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <IconFilter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <select
                value={selectedStream ?? ''}
                onChange={(e) => setSelectedStream(e.target.value ? e.target.value : null)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#76b900] focus:border-transparent"
              >
                <option value="">All Streams</option>
                {availableStreams.map((streamId: string) => (
                  <option key={streamId} value={streamId}>
                    {formatStreamName(streamId)}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filteredTranscripts.length} transcript{filteredTranscripts.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-red-800 dark:text-red-200">Error: {error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && transcripts.length === 0 && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#76b900]"></div>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredTranscripts.length === 0 && !error && (
            <div className="text-center py-12">
              <IconHistory className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                No transcripts found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {selectedStream !== null
                  ? `No finalized transcripts for ${formatStreamName(selectedStream)}`
                  : 'No finalized transcripts available'
                }
              </p>
            </div>
          )}

          {/* Transcripts List */}
          {filteredTranscripts.length > 0 && (
            <div className="space-y-4">
              {filteredTranscripts.map((transcript: FinalizedTranscript) => (
                <div
                  key={transcript.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStreamColor(transcript.stream_id)}`}>
                        {formatStreamName(transcript.stream_id)}
                      </span>
                      {/* Processing Status Indicator */}
                      {transcript.pending !== undefined && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transcript.pending
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {transcript.pending ? (
                            <>
                              <IconClock className="w-3 h-3 mr-1" />
                              Database Pending
                            </>
                          ) : (
                            <>
                              <IconCheck className="w-3 h-3 mr-1" />
                              Database Ingested
                            </>
                          )}
                        </span>
                      )}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTimestamp(transcript.timestamp)}
                      </span>
                      {/* UUID Display (for debugging/admin purposes) */}
                      {transcript.uuid && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                          ID: {transcript.uuid.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
                      {transcript.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranscriptHistory;

// Disable server-side rendering for this page since it needs client-side context
export const getServerSideProps = async () => {
  return {
    props: {}
  };
};