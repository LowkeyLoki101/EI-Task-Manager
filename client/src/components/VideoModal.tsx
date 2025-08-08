import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { VideoResource } from '@/lib/types';

interface VideoModalProps {
  video: VideoResource | null;
  onClose: () => void;
}

export default function VideoModal({ video, onClose }: VideoModalProps) {
  const handleMarkComplete = () => {
    // TODO: Mark associated task as complete
    console.log('Marking task as complete');
    onClose();
  };

  const handleFindAlternative = () => {
    // TODO: Search for alternative videos
    console.log('Finding alternative video');
  };

  if (!video) return null;

  return (
    <Dialog open={!!video} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden" data-testid="video-modal">
        <DialogHeader className="p-4 border-b border-slate-200">
          <DialogTitle className="text-lg font-semibold text-slate-900" data-testid="text-video-title">
            {video.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
          <iframe 
            src={video.embedUrl}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
            data-testid="video-iframe"
          />
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600" data-testid="text-video-description">
              This video was automatically found and attached to your task.
            </p>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost"
                size="sm"
                onClick={handleMarkComplete}
                className="text-sm"
                data-testid="button-mark-complete"
              >
                Mark Task Complete
              </Button>
              <Button 
                size="sm"
                onClick={handleFindAlternative}
                className="text-sm bg-primary text-white hover:bg-blue-700"
                data-testid="button-find-alternative"
              >
                Find Alternative
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
