import type { GetStreamsQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

export type Stream = NonNullable<GetStreamsQuery["profile"]>["streams"][number];