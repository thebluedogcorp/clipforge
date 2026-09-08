"use client";

import { SlidersHorizontal, Mic, Subtitles, Download } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useClipper } from "@/lib/store";
import { ClipProperties } from "./clip-properties";
import { TranscriptionPanel } from "./transcription-panel";
import { CaptionsPanel } from "./captions-panel";
import { ExportPanel } from "./export-panel";

export function RightPanel() {
  const active = useClipper((s) => s.activePanel);
  const setActive = useClipper((s) => s.setActivePanel);

  return (
    <Tabs value={active} onValueChange={(v) => setActive(v as any)} className="flex h-full flex-col">
      <TabsList className="grid w-full grid-cols-4 rounded-none border-b border-border/50 bg-transparent p-0">
        <TabsTrigger
          value="clips"
          className="flex flex-col items-center gap-1 rounded-none border-b-2 border-transparent py-2 text-[10px] data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Clip
        </TabsTrigger>
        <TabsTrigger
          value="transcript"
          className="flex flex-col items-center gap-1 rounded-none border-b-2 border-transparent py-2 text-[10px] data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
        >
          <Mic className="h-3.5 w-3.5" />
          Transcript
        </TabsTrigger>
        <TabsTrigger
          value="captions"
          className="flex flex-col items-center gap-1 rounded-none border-b-2 border-transparent py-2 text-[10px] data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
        >
          <Subtitles className="h-3.5 w-3.5" />
          Captions
        </TabsTrigger>
        <TabsTrigger
          value="export"
          className="flex flex-col items-center gap-1 rounded-none border-b-2 border-transparent py-2 text-[10px] data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </TabsTrigger>
      </TabsList>

      <div className="flex-1 overflow-y-auto p-3">
        <TabsContent value="clips" className="mt-0">
          <ClipProperties />
        </TabsContent>
        <TabsContent value="transcript" className="mt-0">
          <TranscriptionPanel />
        </TabsContent>
        <TabsContent value="captions" className="mt-0">
          <CaptionsPanel />
        </TabsContent>
        <TabsContent value="export" className="mt-0">
          <ExportPanel />
        </TabsContent>
      </div>
    </Tabs>
  );
}
