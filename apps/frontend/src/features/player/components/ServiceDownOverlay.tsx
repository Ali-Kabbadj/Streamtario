"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Download, XCircle } from "lucide-react";
import { toast } from "sonner";

interface ServiceDownOverlayProps {
  message: string;
  streamUrl?: string;
  onClose: () => void;
}

export function ServiceDownOverlay({
  message,
  streamUrl,
  onClose,
}: ServiceDownOverlayProps) {
  const handleCopy = () => {
    if (streamUrl) {
      void navigator.clipboard.writeText(streamUrl);
      toast.success("Stream URL copied to clipboard!");
    }
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-4 rounded-lg bg-black/90 p-8 text-center">
      <XCircle className="h-12 w-12 text-red-500" />
      <h2 className="text-2xl font-bold">Streaming Service Unavailable</h2>
      <p className="text-lg text-slate-300">{message}</p>

      {streamUrl && (
        <div className="w-full space-y-2 pt-4">
          <p className="text-sm text-slate-400">
            Or, play the stream in an external player:
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              readOnly
              value={streamUrl}
              className="border-slate-700 bg-slate-800 text-white"
            />
            <Button variant="outline" onClick={handleCopy} size="icon">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-6">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button
          onClick={() => {
            /* Placeholder for download link */ alert(
              "Download link not yet configured.",
            );
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Download Service
        </Button>
      </div>
    </div>
  );
}
