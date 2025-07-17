import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { 
  Radio, 
  Trash2, 
  Upload, 
  Key, 
  Volume2, 
  VolumeX, 
  Dock, 
  Settings, 
  Repeat, 
  Play, 
  Square,
  Eye,
  EyeOff,
  CheckCircle2
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Stream } from "@shared/schema";

interface StreamConfigProps {
  stream: Stream;
  onDelete: (streamId: number) => void;
}

export default function StreamConfig({ stream, onDelete }: StreamConfigProps) {
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Update stream mutation
  const updateStreamMutation = useMutation({
    mutationFn: async (updates: Partial<Stream>) => {
      const response = await apiRequest('PUT', `/api/streams/${stream.id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streams', stream.userId] });
    }
  });

  // Stream control mutation
  const streamControlMutation = useMutation({
    mutationFn: async (action: 'start' | 'stop') => {
      const response = await apiRequest('POST', `/api/streams/${stream.id}/control`, { 
        action, 
        streamId: stream.id 
      });
      return response.json();
    },
    onSuccess: (data, action) => {
      toast({
        title: "Success",
        description: action === 'start' ? 'Stream started successfully' : 'Stream stopped successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/streams', stream.userId] });
    },
    onError: (error: any) => {
      console.error('Stream control error:', error);
      toast({
        title: "Stream Operation Failed",
        description: error?.message?.includes('No video file') ? 
          'Please upload a video file before starting the stream' : 
          error?.message?.includes('stream key') || error?.message?.includes('YouTube') ? 
          'Please enter a valid YouTube stream key in the settings' : 
          error?.message?.includes('FFmpeg') ?
          'Video processing error. Please check your video file format' :
          'Unable to control stream. Please verify your settings and try again.',
        variant: "destructive"
      });
    }
  });

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('video', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      updateStreamMutation.mutate({ videoPath: data.path });
      toast({
        title: "Upload successful",
        description: `${data.originalName} uploaded successfully`
      });
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error?.message?.includes('file type') || error?.message?.includes('Invalid') ? 
          'Only video files are supported (.mp4, .mov, .avi, .mkv, .webm)' :
          error?.message?.includes('size') || error?.message?.includes('large') ? 
          'File exceeds the 500MB limit. Please use a smaller video file' :
          error?.message?.includes('network') || error?.message?.includes('fetch') ?
          'Network error occurred. Please check your connection and try again' :
          'Upload failed. Please verify your file and try again.',
        variant: "destructive"
      });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setIsUploading(true);
      uploadMutation.mutate(file);
    }
  };

  const handleStreamKeyChange = (value: string) => {
    updateStreamMutation.mutate({ streamKey: value });
  };

  const handleQualityChange = (value: string) => {
    updateStreamMutation.mutate({ quality: value });
  };

  const handleModeChange = (value: string) => {
    updateStreamMutation.mutate({ mode: value });
  };

  const handleLoopChange = (checked: boolean) => {
    updateStreamMutation.mutate({ loopVideo: checked });
  };

  const handleVolumeChange = (values: number[]) => {
    updateStreamMutation.mutate({ volume: values[0] });
  };

  const handleMuteToggle = () => {
    updateStreamMutation.mutate({ isMuted: !stream.isMuted });
  };

  const handleStreamControl = (action: 'start' | 'stop') => {
    streamControlMutation.mutate(action);
  };

  const removeUploadedFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadedFile(null);
    updateStreamMutation.mutate({ videoPath: null });
  };

  return (
    <Card className="shadow-lg stream-card fade-in">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Radio className="text-sky-500 mr-2" size={20} />
            Stream Configuration
            <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              Stream #{stream.id}
            </span>
            {stream.isActive && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                Live
              </span>
            )}
          </h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onDelete(stream.id)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 size={16} />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Video Upload */}
            <div>
              <Label className="text-sm font-medium text-gray-700 flex items-center mb-2">
                <Upload className="mr-1" size={16} />
                Upload Video File
              </Label>
              
              {!stream.videoPath && !uploadedFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-sky-300 transition-colors duration-200">
                  <Upload className="text-gray-400 mx-auto mb-2" size={32} />
                  <p className="text-sm text-gray-600 mb-2">Drop your video file here or click to browse</p>
                  <p className="text-xs text-gray-500 mb-3">Supports .mp4, .mov, .avi formats</p>
                  <Button 
                    type="button"
                    className="bg-sky-500 hover:bg-sky-600"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mp4,.mov,.avi,.mkv,.webm"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle2 className="text-green-500 mr-2" size={16} />
                    <span className="text-sm text-green-800">
                      {uploadedFile?.name || 'Video uploaded'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeUploadedFile}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            </div>

            {/* Stream Key */}
            <div>
              <Label className="text-sm font-medium text-gray-700 flex items-center mb-2">
                <Key className="mr-1" size={16} />
                YouTube Stream Key
              </Label>
              <div className="relative">
                <Input
                  type={showStreamKey ? "text" : "password"}
                  placeholder="Enter your YouTube stream key"
                  value={stream.streamKey}
                  onChange={(e) => handleStreamKeyChange(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => setShowStreamKey(!showStreamKey)}
                >
                  {showStreamKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </Button>
              </div>
            </div>

            {/* Audio Controls */}
            <div>
              <Label className="text-sm font-medium text-gray-700 flex items-center mb-3">
                <Volume2 className="mr-1" size={16} />
                Audio Controls
              </Label>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={handleMuteToggle}
                  className={stream.isMuted ? "bg-red-50 border-red-200 text-red-600" : ""}
                >
                  {stream.isMuted ? (
                    <>
                      <VolumeX className="mr-2" size={16} />
                      Muted
                    </>
                  ) : (
                    <>
                      <Volume2 className="mr-2" size={16} />
                      Unmuted
                    </>
                  )}
                </Button>
                
                <div className="flex items-center space-x-3">
                  <Volume2 className="text-gray-500" size={14} />
                  <Slider
                    value={[stream.volume]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="flex-1"
                    disabled={stream.isMuted}
                  />
                  <span className="text-sm text-gray-600 w-12">{stream.volume}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Stream Mode */}
            <div>
              <Label className="text-sm font-medium text-gray-700 flex items-center mb-3">
                <Dock className="mr-1" size={16} />
                Stream Appearance Mode
              </Label>
              <RadioGroup
                value={stream.mode}
                onValueChange={handleModeChange}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="desktop" id="desktop" />
                  <Label htmlFor="desktop" className="flex-1 cursor-pointer">
                    <p className="font-medium text-gray-900">Desktop Mode</p>
                    <p className="text-sm text-gray-600">16:9 landscape - appears like OBS/studio setup on YouTube</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="mobile" id="mobile" />
                  <Label htmlFor="mobile" className="flex-1 cursor-pointer">
                    <p className="font-medium text-gray-900">Mobile Mode</p>
                    <p className="text-sm text-gray-600">9:16 portrait - appears like mobile app live stream on YouTube</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Video Quality */}
            <div>
              <Label className="text-sm font-medium text-gray-700 flex items-center mb-3">
                <Settings className="mr-1" size={16} />
                Video Quality
              </Label>
              <Select value={stream.quality} onValueChange={handleQualityChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="360p">360p</SelectItem>
                  <SelectItem value="480p">480p</SelectItem>
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="1080p">1080p</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Loop Video Option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`loop-${stream.id}`}
                checked={stream.loopVideo}
                onCheckedChange={handleLoopChange}
              />
              <Label htmlFor={`loop-${stream.id}`} className="text-sm font-medium text-gray-700 flex items-center">
                <Repeat className="mr-1" size={16} />
                Loop Video
              </Label>
            </div>
            <p className="text-xs text-gray-500">Automatically restart video when it ends</p>

            {/* Stream Controls */}
            <div>
              <Label className="text-sm font-medium text-gray-700 flex items-center mb-3">
                <Play className="mr-1" size={16} />
                Stream Controls
              </Label>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleStreamControl('start')}
                  disabled={stream.isActive || !stream.videoPath || !stream.streamKey || streamControlMutation.isPending}
                  className="flex-1 bg-green-500 hover:bg-green-600 ripple"
                >
                  <Play className="mr-2" size={16} />
                  {streamControlMutation.isPending && streamControlMutation.variables === 'start' ? 'Starting...' : 'Start Stream'}
                </Button>
                <Button
                  onClick={() => handleStreamControl('stop')}
                  disabled={!stream.isActive || streamControlMutation.isPending}
                  variant="destructive"
                  className="flex-1 ripple"
                >
                  <Square className="mr-2" size={16} />
                  {streamControlMutation.isPending && streamControlMutation.variables === 'stop' ? 'Stopping...' : 'Stop Stream'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
