import ImageWithFallback from "@/components/shared/ImageWithFallback";
import { Card, CardContent } from "@/components/ui/card";
import type { CastType } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

interface CastMemberCardProps {
  member: CastType;
  onClick: () => void; // <-- ADD PROP
}

export function CastMemberCard({ member, onClick }: CastMemberCardProps) {
  return (
    <Card
      onClick={onClick}
      className="hover:border-primary/50 w-36 flex-shrink-0 cursor-pointer border-2 border-transparent bg-slate-800/50 transition-all duration-300"
    >
      <CardContent className="p-0 text-center">
        <div className="relative h-44 w-full">
          <ImageWithFallback
            src={member.photo ?? ""}
            fallbackSrc="/images/NoImagePortrait.png"
            alt={member.name ?? "Cast member photo"}
            fill
            className="rounded-t-lg"
          />
        </div>
        <div className="p-2">
          <p className="truncate text-sm font-bold">{member.name ?? "N/A"}</p>
          <p className="text-muted-foreground truncate text-xs">
            {member.character ?? ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
