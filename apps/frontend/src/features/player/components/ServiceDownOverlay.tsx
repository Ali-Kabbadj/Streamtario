"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Download, XCircle } from "lucide-react";
import { toast } from "sonner";

interface ServiceDownOverlayProps {
  message: string;
  streamUrl?: string;
  title: string;
}

export function ServiceDownOverlay({
  message,
  streamUrl,
  title,
}: ServiceDownOverlayProps) {
  const handleCopy = () => {
    if (streamUrl) {
      void navigator.clipboard.writeText(streamUrl);
      toast.success("Stream URL copied to clipboard!");
    }
  };

  const isServiceDown = streamUrl?.startsWith("magnet:") ?? false;
  return (
    <div className="pointer-events-auto absolute z-40 mx-auto flex max-w-lg flex-col items-center justify-center gap-4 rounded-lg bg-black/90 p-8 text-center">
      <XCircle className="h-12 w-12 text-red-500" />
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-lg text-slate-300">{message}</p>

      {streamUrl && (
        <div className="w-full space-y-2 pt-4">
          <p className="text-sm text-slate-400">
            Play the stream in an external player:
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
        {isServiceDown && (
          <Button
            onClick={() => {
              alert("Download link not yet configured.");
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Service
          </Button>
        )}
      </div>
    </div>
  );
}
