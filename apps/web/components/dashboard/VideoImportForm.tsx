'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Youtube, Upload, Link as LinkIcon, Loader2, AlertCircle, FileVideo, CheckCircle } from 'lucide-react';

interface VideoImportFormProps {
  projectId?: string;
}

export function VideoImportForm({ projectId }: VideoImportFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'youtube' | 'upload'>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const isValidYoutubeUrl = (url: string) => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return pattern.test(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
      
      if (!validTypes.includes(file.type)) {
        setErrorMessage('Unsupported file format. Please upload MP4, MOV, or WebM.');
        setSelectedFile(null);
        return;
      }

      if (file.size > 2 * 1024 * 1024 * 1024) { // 2GB limit
        setErrorMessage('File size exceeds the 2GB limit.');
        setSelectedFile(null);
        return;
      }

      setErrorMessage('');
      setSelectedFile(file);
      if (!projectTitle) {
        setProjectTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleYoutubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidYoutubeUrl(youtubeUrl)) {
      setErrorMessage('Please enter a valid YouTube URL.');
      return;
    }

    setUploading(true);
    setErrorMessage('');

    try {
      // 1. Create project if not existing
      let currentProjectId = projectId;
      if (!currentProjectId) {
        const projRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: projectTitle || 'YouTube Import' }),
        });
        const projData = await projRes.json();
        if (!projRes.ok) throw new Error(projData.error);
        currentProjectId = projData.project.id;
      }

      // 2. Trigger import worker job
      const importRes = await fetch('/api/videos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: youtubeUrl, projectId: currentProjectId }),
      });
      const importData = await importRes.json();
      if (!importRes.ok) throw new Error(importData.error);

      router.push(`/dashboard/projects/${currentProjectId}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process YouTube video.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a video file to upload.');
      return;
    }

    setUploading(true);
    setErrorMessage('');
    setUploadProgress(10);

    try {
      // 1. Create project if not existing
      let currentProjectId = projectId;
      if (!currentProjectId) {
        const projRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: projectTitle || selectedFile.name }),
        });
        const projData = await projRes.json();
        if (!projRes.ok) throw new Error(projData.error);
        currentProjectId = projData.project.id;
      }

      // 2. Request signed upload URL
      const signedUrlRes = await fetch('/api/videos/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          projectId: currentProjectId,
        }),
      });
      const { signedUrl, path } = await signedUrlRes.json();
      if (!signedUrlRes.ok) throw new Error('Failed to obtain upload authorization.');

      setUploadProgress(30);

      // 3. Direct upload binary to Supabase Storage
      const uploadXhr = new XMLHttpRequest();
      uploadXhr.open('PUT', signedUrl, true);
      uploadXhr.setRequestHeader('Content-Type', selectedFile.type);

      uploadXhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round(30 + (event.loaded / event.total) * 60);
          setUploadProgress(percent);
        }
      };

      await new Promise((resolve, reject) => {
        uploadXhr.onload = () => (uploadXhr.status >= 200 && uploadXhr.status < 300 ? resolve(true) : reject(new Error('Storage upload failed.')));
        uploadXhr.onerror = () => reject(new Error('Network error during upload.'));
        uploadXhr.send(selectedFile);
      });

      setUploadProgress(95);

      // 4. Notify backend to trigger analysis job
      const completeRes = await fetch('/api/videos/complete-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          storagePath: path,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
        }),
      });
      if (!completeRes.ok) throw new Error('Failed to finalize file upload processing.');

      setUploadProgress(100);
      router.push(`/dashboard/projects/${currentProjectId}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'File upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-md">
      {/* Tab Switcher */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-1.5 border border-slate-800/80 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('youtube')}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'youtube'
              ? 'bg-violet-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Youtube className="h-4 w-4" />
          <span>YouTube Link</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'upload'
              ? 'bg-violet-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Upload className="h-4 w-4" />
          <span>File Upload</span>
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Project Title Field */}
      {!projectId && (
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Project Title
          </label>
          <input
            type="text"
            placeholder="e.g. Podcast Episode #42 Clips"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      )}

      {/* Tab 1: YouTube Import */}
      {activeTab === 'youtube' && (
        <form onSubmit={handleYoutubeSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              YouTube URL
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading || !youtubeUrl}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 hover:bg-violet-500 disabled:opacity-50 transition-all"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Importing Video...</span>
              </>
            ) : (
              <span>Generate Clips from YouTube</span>
            )}
          </button>
        </form>
      )}

      {/* Tab 2: File Upload */}
      {activeTab === 'upload' && (
        <form onSubmit={handleFileUploadSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Video File
            </label>
            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-800 bg-slate-950/50 p-8 cursor-pointer hover:border-violet-500/50 hover:bg-slate-950 transition-all">
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={handleFileChange}
                className="hidden"
              />
              {selectedFile ? (
                <div className="flex items-center gap-3 text-violet-400">
                  <FileVideo className="h-8 w-8" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white line-clamp-1">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-slate-500 mb-2" />
                  <p className="text-sm font-medium text-slate-300">Click to upload or drag and drop</p>
                  <p className="text-xs text-slate-500 mt-1">MP4, MOV, or WebM (Max 2GB)</p>
                </div>
              )}
            </label>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Uploading file directly to storage...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-violet-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 hover:bg-violet-500 disabled:opacity-50 transition-all"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading... {uploadProgress}%</span>
              </>
            ) : (
              <span>Upload & Analyze Video</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}