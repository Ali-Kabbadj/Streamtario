import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'https://unrehearsable-zoe-chromosomal.ngrok-free.dev/graphql/schema.json',
  documents: 'src/**/*.ts*',
  generates: {
    'src/orchestrators/graphql-query-orchestrator/gen/': {
      preset: 'client',
      plugins: [],
      presetConfig: {
        gqlTagName: 'graphql',
      },
    },
  },
  ignoreNoDocuments: true,
};

export default config;