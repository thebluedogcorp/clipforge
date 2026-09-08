"use client";

import { useState } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Header } from "@/components/clipper/header";
import { Footer } from "@/components/clipper/footer";
import { SourcePanel } from "@/components/clipper/source-panel";
import { ClipList } from "@/components/clipper/clip-list";
import { VideoPreview } from "@/components/clipper/video-preview";
import { Timeline } from "@/components/clipper/timeline";
import { RightPanel } from "@/components/clipper/right-panel";
import { BusyOverlay } from "@/components/clipper/busy-overlay";
import { ShortcutsOverlay } from "@/components/clipper/shortcuts-overlay";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, PanelLeft } from "lucide-react";
import { useClipper } from "@/lib/store";
import { useKeyboardShortcuts } from "@/lib/use-keyboard-shortcuts";
import { useThumbnailGenerator } from "@/lib/use-thumbnail-generator";
import { useAudioWaveform } from "@/lib/use-audio-waveform";
import { usePersistence } from "@/lib/use-persistence";

export default function Home() {
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  useKeyboardShortcuts();
  useThumbnailGenerator();
  useAudioWaveform();
  usePersistence();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header />

      <main className="relative flex min-h-0 flex-1">
        {/* Desktop / tablet layout */}
        <ResizablePanelGroup direction="horizontal" className="hidden md:flex">
          {/* Left rail */}
          <ResizablePanel defaultSize={18} minSize={16} maxSize={28}>
            <ScrollArea className="h-full">
              <div className="space-y-5 border-r border-border/50 p-3">
                <SourcePanel />
                <ClipList />
              </div>
            </ScrollArea>
          </ResizablePanel>

          <ResizableHandle />

          {/* Center: preview + timeline */}
          <ResizablePanel defaultSize={56} minSize={36}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={62} minSize={30}>
                <div className="relative h-full border-r border-border/50">
                  <VideoPreview />
                </div>
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={38} minSize={22}>
                <div className="h-full border-r border-border/50">
                  <Timeline />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right rail */}
          <ResizablePanel defaultSize={26} minSize={22} maxSize={40}>
            <RightPanel />
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Mobile layout */}
        <div className="flex h-full w-full flex-col md:hidden">
          <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setMobilePanelOpen(true)}
            >
              <PanelLeft className="h-4 w-4" />
              Source & clips
            </Button>
            <span className="text-xs text-muted-foreground">ClipForge</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="aspect-video">
              <VideoPreview />
            </div>
            <div className="h-72">
              <Timeline />
            </div>
            <div className="border-t border-border/50 p-3">
              <RightPanel />
            </div>
          </div>

          <Sheet open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
            <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto p-4">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Project
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-5">
                <SourcePanel />
                <ClipList />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </main>

      <Footer />
      <BusyOverlay />
      <ShortcutsOverlay />
    </div>
  );
}
