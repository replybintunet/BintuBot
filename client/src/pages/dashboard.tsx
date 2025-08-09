import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, LogOut, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { authService } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import StreamStatsComponent from "@/components/stream-stats";
import StreamConfig from "@/components/stream-config";
import type { Stream, StreamStats } from "@shared/schema";

interface DashboardProps {
  onLogout: () => void;
}

interface StreamWithStats extends Stream {
  stats?: StreamStats;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [allStats, setAllStats] = useState<Map<number, StreamStats>>(new Map());
  const currentUser = authService.getCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // WebSocket for real-time updates
  useWebSocket((message) => {
    if (message.type === 'statsUpdate') {
      setAllStats(prev => {
        const newStats = new Map(prev);
        newStats.set(message.streamId, message.stats);
        return newStats;
      });
    } else if (message.type === 'streamStarted' || message.type === 'streamStopped') {
      queryClient.invalidateQueries({ queryKey: ['/api/streams', currentUser?.id] });
    }
  });

  // Fetch streams
  const { data: streams = [], isLoading } = useQuery<StreamWithStats[]>({
    queryKey: ['/api/streams', currentUser?.id],
    enabled: !!currentUser?.id,
  });

  // Create stream mutation
  const createStreamMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/streams', {
        userId: currentUser?.id,
        name: `Stream ${streams.length + 1}`,
        streamKey: '',
        quality: '720p',
        mode: 'desktop',
        loopVideo: false,
        isActive: false,
        volume: 75,
        isMuted: false
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams', currentUser?.id] });
      toast({
        title: "Success",
        description: "New stream configuration created"
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to create new stream",
        variant: "destructive"
      });
    }
  });

  // Delete stream mutation
  const deleteStreamMutation = useMutation({
    mutationFn: async (streamId: number) => {
      const response = await apiRequest('DELETE', `/api/streams/${streamId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams', currentUser?.id] });
      toast({
        title: "Success",
        description: "Stream configuration deleted"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete stream",
        variant: "destructive"
      });
    }
  });

  const handleLogout = () => {
    authService.logout();
    onLogout();
  };

  const handleAddStream = () => {
    createStreamMutation.mutate();
  };

  const handleDeleteStream = (streamId: number) => {
    if (window.confirm('Are you sure you want to delete this stream configuration? This action cannot be undone.')) {
      deleteStreamMutation.mutate(streamId);
    }
  };

  // Get overall stats (from first active stream or default)
  const getOverallStats = (): StreamStats | null => {
    const activeStream = streams.find(s => s.isActive);
    if (activeStream) {
      return allStats.get(activeStream.id) || activeStream.stats || null;
    }
    return streams[0]?.stats || null;
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Video className="text-sky-500 mr-3" size={24} />
              <h1 className="text-xl font-semibold text-gray-900">BintuBot</h1>
            </div>
            <Button 
              variant="ghost"
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 hover:bg-red-50"
            >
              <LogOut className="mr-2" size={16} />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Live Stream Dashboard Stats */}
        <div className="mb-6">
          <StreamStatsComponent stats={getOverallStats()} />
        </div>

        {/* Stream Configuration Section */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading streams...</p>
            </div>
          ) : streams.length === 0 ? (
            <div className="text-center py-12">
              <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No streams configured</h3>
              <p className="text-gray-600 mb-4">Create your first stream configuration to get started</p>
              <Button 
                onClick={handleAddStream}
                disabled={createStreamMutation.isPending}
                className="bg-sky-500 hover:bg-sky-600"
              >
                <Plus className="mr-2" size={16} />
                Create First Stream
              </Button>
            </div>
          ) : (
            <>
              {streams.map((stream) => (
                <StreamConfig
                  key={stream.id}
                  stream={{
                    ...stream,
                    stats: allStats.get(stream.id) || stream.stats
                  }}
                  onDelete={handleDeleteStream}
                />
              ))}
              
              {/* Add New Stream Button */}
              <div className="text-center">
                <Button 
                  onClick={handleAddStream}
                  disabled={createStreamMutation.isPending}
                  className="bg-sky-500 hover:bg-sky-600 ripple"
                >
                  <Plus className="mr-2" size={16} />
                  {createStreamMutation.isPending ? 'Creating...' : 'Add New Stream'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
