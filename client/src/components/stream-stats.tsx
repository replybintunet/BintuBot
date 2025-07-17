import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Clock, Users, Wifi } from "lucide-react";
import type { StreamStats } from "@shared/schema";

interface StreamStatsProps {
  stats: StreamStats | null;
}

export default function StreamStatsComponent({ stats }: StreamStatsProps) {
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getConnectionColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'connecting':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getConnectionIcon = (status: string) => {
    return status === 'connected' ? '●' : '○';
  };

  return (
    <Card className="shadow-lg fade-in">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="text-sky-500 mr-2" size={20} />
          Live Stream Dashboard
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`rounded-lg p-4 border ${getConnectionColor(stats?.connectionStatus || 'disconnected')}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Connection</p>
                <p className="text-lg font-semibold flex items-center">
                  <span className="text-xs mr-2">
                    {getConnectionIcon(stats?.connectionStatus || 'disconnected')}
                  </span>
                  {stats?.connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
                </p>
                <p className="text-xs">
                  {stats?.ping ? `Ping: ${stats.ping}ms` : 'No ping data'}
                </p>
              </div>
              <Wifi size={20} />
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Uptime</p>
                <p className="text-lg font-semibold text-blue-900">
                  {stats?.uptime ? formatUptime(stats.uptime) : '0h 0m'}
                </p>
                <p className="text-xs text-blue-600">Running time</p>
              </div>
              <Clock className="text-blue-600" size={20} />
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Viewers</p>
                <p className="text-lg font-semibold text-purple-900">
                  {stats?.viewerCount?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-purple-600">Live viewers</p>
              </div>
              <Users className="text-purple-600" size={20} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
