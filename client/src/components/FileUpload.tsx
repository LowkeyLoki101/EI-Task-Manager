import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { File } from '@shared/schema';

interface FileUploadProps {
  sessionId: string;
  onMessage: (message: string) => void;
}

export default function FileUpload({ sessionId, onMessage }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: files = [] } = useQuery({
    queryKey: ['/api/files', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/files?sessionId=${sessionId}`);
      return response.json();
    },
    enabled: !!sessionId
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      uploadFiles(droppedFiles);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      uploadFiles(selectedFiles);
    }
  };

  const uploadFiles = async (filesToUpload: globalThis.File[]) => {
    setUploading(true);

    try {
      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sessionId', sessionId);

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const uploadedFile = await response.json();
        
        // Notify the assistant about the uploaded file
        onMessage(`I uploaded a file: ${uploadedFile.originalName}`);
        
        toast({
          title: "File uploaded successfully",
          description: `${file.name} has been uploaded and processed.`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['/api/files', sessionId] });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['/api/files', sessionId] });
      toast({
        title: "File deleted",
        description: "File has been removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "There was an error deleting the file.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      );
    } else if (mimeType === 'application/pdf') {
      return (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      );
    }
    return (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">File Upload</h2>
      
      <div 
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-slate-300 hover:border-primary'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleFileSelect}
        data-testid="file-drop-zone"
      >
        {uploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mb-4" />
            <p className="text-slate-600 mb-2">Uploading files...</p>
          </div>
        ) : (
          <>
            <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-slate-600 mb-2">Drop files here or click to upload</p>
            <p className="text-xs text-slate-500">Supports PDFs, images, CSV, and text files</p>
          </>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        accept=".pdf,.doc,.docx,.txt,.csv,.jpg,.jpeg,.png,.gif"
        data-testid="file-input"
      />
      
      {/* Recent Uploads */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-medium text-slate-900">Recent Files</h3>
          {files.slice(0, 5).map((file: any) => (
            <div 
              key={file.id}
              className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              data-testid={`file-item-${file.id}`}
            >
              <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {getFileIcon(file.mimeType)}
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate" data-testid={`text-filename-${file.id}`}>
                  {file.originalName}
                </p>
                <p className="text-xs text-slate-500" data-testid={`text-fileinfo-${file.id}`}>
                  {formatFileSize(file.size)} • Uploaded {new Date(file.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteFile(file.id)}
                className="text-slate-400 hover:text-slate-600 p-1 h-auto"
                data-testid={`button-delete-file-${file.id}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
