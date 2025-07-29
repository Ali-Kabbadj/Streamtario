import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useProfileContext } from "@/providers/profile-provider";
import { useMetaDetails } from "@/features/meta/hooks/useMetaDetails";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Star, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GetMetaDetailsQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { EpisodeCard } from "@/features/meta/components/EpisodeCard";

type Video = NonNullable<
  NonNullable<GetMetaDetailsQuery["profile"]>["meta"]
>["videos"][0];
type GroupedVideos = Record<number, Video[]>;

export default function MetaDetailsPage() {
  const router = useRouter();
  const { selectedProfile } = useProfileContext();
  const { type: itemType, id: itemId } = router.query;

  const {
    data: meta,
    isLoading,
    isError,
    error,
  } = useMetaDetails({
    profileId: selectedProfile?.id ?? "",
    itemType: itemType as string,
    itemId: itemId as string,
  });

  const [selectedSeason, setSelectedSeason] = useState<string | undefined>();

  const seasons = useMemo(() => {
    if (!meta?.videos) return {};
    return meta.videos.reduce((acc: GroupedVideos, video) => {
      const seasonNum = video.season ?? 1;
      if (!acc[seasonNum]) {
        acc[seasonNum] = [];
      }
      acc[seasonNum].push(video);
      return acc;
    }, {});
  }, [meta?.videos]);

  const seasonKeys = useMemo(
    () => Object.keys(seasons).sort((a, b) => parseInt(a) - parseInt(b)),
    [seasons],
  );

  useEffect(() => {
    if (seasonKeys.length > 0 && !selectedSeason) {
      setSelectedSeason(seasonKeys[0]);
    }
  }, [seasonKeys, selectedSeason]);

  if (isLoading) {
    return (
      <div className="container mx-auto mt-8">
        <Skeleton className="mb-4 h-10 w-24" />
        <Skeleton className="h-[40vh] w-full rounded-lg" />
        <div className="mt-[-100px] flex items-end gap-8 px-8">
          <Skeleton className="h-64 w-48 flex-shrink-0 rounded-lg" />
          <div className="flex-grow space-y-4 pb-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center text-red-500">Error: {error.message}</div>
    );
  }

  if (!meta) {
    return <div className="text-center">Content not found.</div>;
  }

  return (
    <div className="w-full">
      <div className="container mx-auto mt-8">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      <div className="relative h-[40vh] w-full">
        {meta.background && (
          <Image
            src={meta.background}
            alt={`${meta.name} background`}
            layout="fill"
            objectFit="cover"
            className="opacity-30"
          />
        )}
        <div className="from-background via-background/80 absolute inset-0 bg-gradient-to-t to-transparent" />
      </div>

      <div className="container mx-auto">
        <div className="relative z-10 mt-[-150px] flex flex-col gap-8 md:flex-row md:items-end">
          <div className="relative h-72 w-52 flex-shrink-0 self-center md:self-end">
            <Image
              src={meta.poster ?? ""}
              alt={`${meta.name} poster`}
              layout="fill"
              objectFit="cover"
              className="rounded-lg shadow-2xl"
            />
          </div>

          <div className="flex-grow space-y-3 py-4 text-center md:text-left">
            <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl">
              {meta.name}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-4 md:justify-start">
              <span className="text-lg text-slate-400">{meta.releaseInfo}</span>
              {meta.imdbRating && (
                <>
                  <span className="text-slate-600">•</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 text-yellow-400" />
                    <span className="text-lg font-bold">{meta.imdbRating}</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-2 md:justify-start">
              {meta.genres?.map((genre) => (
                <Badge key={genre} variant="secondary">
                  {genre}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 max-w-4xl">
          <h2 className="text-2xl font-bold">Synopsis</h2>
          <p className="text-muted-foreground mt-2 text-lg">
            {meta.description}
          </p>
        </div>

        {meta.type !== "movie" && seasonKeys.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-4 text-2xl font-bold">Episodes</h2>
            <Tabs
              value={selectedSeason}
              onValueChange={setSelectedSeason}
              className="w-full"
            >
              <TabsList className="h-auto flex-wrap">
                {seasonKeys.map((seasonNum) => (
                  <TabsTrigger key={seasonNum} value={seasonNum}>
                    Season {seasonNum}
                  </TabsTrigger>
                ))}
              </TabsList>
              {selectedSeason && seasons[parseInt(selectedSeason)] && (
                <TabsContent value={selectedSeason} className="mt-4">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {seasons[parseInt(selectedSeason)].map((episode) => (
                      <EpisodeCard key={episode.id} episode={episode} />
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}

        <div className="mt-12">
          <h2 className="text-2xl font-bold">Sources</h2>
          <div className="mt-4 flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/50">
            <p className="text-muted-foreground">
              Streaming sources functionality coming soon!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
