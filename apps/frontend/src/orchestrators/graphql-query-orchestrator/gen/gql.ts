/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query GetFullProfile($profileId: ID!) {\n    profile(id: $profileId) {\n      id\n      name\n      avatar\n      manifestUrls\n      discoverableCatalogs {\n        addonName\n        manifestId\n        catalogId\n        catalogName\n        catalogType\n        supportedItemTypes\n        extraProps {\n          name\n          isRequired\n          options\n          optionsLimit\n        }\n      }\n      catalog(itemType: \"movie\") {\n        items {\n          id\n          type\n          name\n          poster\n        }\n      }\n      meta(itemType: \"series\", itemId: \"community.anime.kitsu:kitsu:856\") {\n        id\n        type\n        name\n        genres\n        poster\n        background\n        logo\n        description\n        releaseInfo\n        imdbRating\n        videos {\n          id\n          title\n          released\n          thumbnail\n        }\n      }\n    }\n  }\n": typeof types.GetFullProfileDocument,
    "\n  mutation CreateAccount($email: String!, $password: String!) {\n    createAccount(input: { email: $email, password: $password }) {\n      ... on CreateAccountSuccess {\n        account {\n          id\n          email\n        }\n      }\n      ... on CreateAccountError {\n        message\n        field\n      }\n    }\n  }\n": typeof types.CreateAccountDocument,
    "\n  mutation InstallAddon($profileId: ID!, $manifestUrl: String!) {\n    # ✅ CORRECTION: Changed profile_id -> profileId and manifest_url -> manifestUrl\n    installAddon(input: { profileId: $profileId, manifestUrl: $manifestUrl }) {\n      ... on InstallAddonSuccess {\n        addon {\n          id\n          manifestId\n        }\n      }\n      ... on InstallAddonError {\n        message\n      }\n    }\n  }\n": typeof types.InstallAddonDocument,
    "\n  mutation UninstallAddon($profileId: ID!, $manifestId: String!) {\n    # ✅ CORRECTION: Changed profile_id -> profileId and manifest_id -> manifestId\n    uninstallAddon(input: { profileId: $profileId, manifestId: $manifestId }) {\n      ... on UninstallAddonSuccess {\n        success\n      }\n      ... on UninstallAddonError {\n        message\n      }\n    }\n  }\n": typeof types.UninstallAddonDocument,
};
const documents: Documents = {
    "\n  query GetFullProfile($profileId: ID!) {\n    profile(id: $profileId) {\n      id\n      name\n      avatar\n      manifestUrls\n      discoverableCatalogs {\n        addonName\n        manifestId\n        catalogId\n        catalogName\n        catalogType\n        supportedItemTypes\n        extraProps {\n          name\n          isRequired\n          options\n          optionsLimit\n        }\n      }\n      catalog(itemType: \"movie\") {\n        items {\n          id\n          type\n          name\n          poster\n        }\n      }\n      meta(itemType: \"series\", itemId: \"community.anime.kitsu:kitsu:856\") {\n        id\n        type\n        name\n        genres\n        poster\n        background\n        logo\n        description\n        releaseInfo\n        imdbRating\n        videos {\n          id\n          title\n          released\n          thumbnail\n        }\n      }\n    }\n  }\n": types.GetFullProfileDocument,
    "\n  mutation CreateAccount($email: String!, $password: String!) {\n    createAccount(input: { email: $email, password: $password }) {\n      ... on CreateAccountSuccess {\n        account {\n          id\n          email\n        }\n      }\n      ... on CreateAccountError {\n        message\n        field\n      }\n    }\n  }\n": types.CreateAccountDocument,
    "\n  mutation InstallAddon($profileId: ID!, $manifestUrl: String!) {\n    # ✅ CORRECTION: Changed profile_id -> profileId and manifest_url -> manifestUrl\n    installAddon(input: { profileId: $profileId, manifestUrl: $manifestUrl }) {\n      ... on InstallAddonSuccess {\n        addon {\n          id\n          manifestId\n        }\n      }\n      ... on InstallAddonError {\n        message\n      }\n    }\n  }\n": types.InstallAddonDocument,
    "\n  mutation UninstallAddon($profileId: ID!, $manifestId: String!) {\n    # ✅ CORRECTION: Changed profile_id -> profileId and manifest_id -> manifestId\n    uninstallAddon(input: { profileId: $profileId, manifestId: $manifestId }) {\n      ... on UninstallAddonSuccess {\n        success\n      }\n      ... on UninstallAddonError {\n        message\n      }\n    }\n  }\n": types.UninstallAddonDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetFullProfile($profileId: ID!) {\n    profile(id: $profileId) {\n      id\n      name\n      avatar\n      manifestUrls\n      discoverableCatalogs {\n        addonName\n        manifestId\n        catalogId\n        catalogName\n        catalogType\n        supportedItemTypes\n        extraProps {\n          name\n          isRequired\n          options\n          optionsLimit\n        }\n      }\n      catalog(itemType: \"movie\") {\n        items {\n          id\n          type\n          name\n          poster\n        }\n      }\n      meta(itemType: \"series\", itemId: \"community.anime.kitsu:kitsu:856\") {\n        id\n        type\n        name\n        genres\n        poster\n        background\n        logo\n        description\n        releaseInfo\n        imdbRating\n        videos {\n          id\n          title\n          released\n          thumbnail\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetFullProfile($profileId: ID!) {\n    profile(id: $profileId) {\n      id\n      name\n      avatar\n      manifestUrls\n      discoverableCatalogs {\n        addonName\n        manifestId\n        catalogId\n        catalogName\n        catalogType\n        supportedItemTypes\n        extraProps {\n          name\n          isRequired\n          options\n          optionsLimit\n        }\n      }\n      catalog(itemType: \"movie\") {\n        items {\n          id\n          type\n          name\n          poster\n        }\n      }\n      meta(itemType: \"series\", itemId: \"community.anime.kitsu:kitsu:856\") {\n        id\n        type\n        name\n        genres\n        poster\n        background\n        logo\n        description\n        releaseInfo\n        imdbRating\n        videos {\n          id\n          title\n          released\n          thumbnail\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateAccount($email: String!, $password: String!) {\n    createAccount(input: { email: $email, password: $password }) {\n      ... on CreateAccountSuccess {\n        account {\n          id\n          email\n        }\n      }\n      ... on CreateAccountError {\n        message\n        field\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateAccount($email: String!, $password: String!) {\n    createAccount(input: { email: $email, password: $password }) {\n      ... on CreateAccountSuccess {\n        account {\n          id\n          email\n        }\n      }\n      ... on CreateAccountError {\n        message\n        field\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation InstallAddon($profileId: ID!, $manifestUrl: String!) {\n    # ✅ CORRECTION: Changed profile_id -> profileId and manifest_url -> manifestUrl\n    installAddon(input: { profileId: $profileId, manifestUrl: $manifestUrl }) {\n      ... on InstallAddonSuccess {\n        addon {\n          id\n          manifestId\n        }\n      }\n      ... on InstallAddonError {\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation InstallAddon($profileId: ID!, $manifestUrl: String!) {\n    # ✅ CORRECTION: Changed profile_id -> profileId and manifest_url -> manifestUrl\n    installAddon(input: { profileId: $profileId, manifestUrl: $manifestUrl }) {\n      ... on InstallAddonSuccess {\n        addon {\n          id\n          manifestId\n        }\n      }\n      ... on InstallAddonError {\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UninstallAddon($profileId: ID!, $manifestId: String!) {\n    # ✅ CORRECTION: Changed profile_id -> profileId and manifest_id -> manifestId\n    uninstallAddon(input: { profileId: $profileId, manifestId: $manifestId }) {\n      ... on UninstallAddonSuccess {\n        success\n      }\n      ... on UninstallAddonError {\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UninstallAddon($profileId: ID!, $manifestId: String!) {\n    # ✅ CORRECTION: Changed profile_id -> profileId and manifest_id -> manifestId\n    uninstallAddon(input: { profileId: $profileId, manifestId: $manifestId }) {\n      ... on UninstallAddonSuccess {\n        success\n      }\n      ... on UninstallAddonError {\n        message\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;