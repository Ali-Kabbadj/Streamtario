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
    "\n  query GetMetaDetails($profileId: ID!, $itemType: String!, $itemId: String!) {\n    profile(id: $profileId) {\n      meta(itemType: $itemType, itemId: $itemId) {\n        id\n        name\n        type\n        poster\n        background\n        logo\n        description\n        releaseInfo\n        imdbRating\n        genres\n        videos {\n          id\n          title\n          released\n          thumbnail\n          season\n          episode\n        }\n      }\n    }\n  }\n": typeof types.GetMetaDetailsDocument,
    "\n  query GetStreams($profileId: ID!, $itemType: String!, $itemId: String!) {\n    profile(id: $profileId) {\n      streams(itemType: $itemType, itemId: $itemId) {\n        name\n        title\n        url\n        infoHash\n        behaviorHints\n        addonName\n      }\n    }\n  }\n": typeof types.GetStreamsDocument,
    "\n  query ManifestByUrl($url: String!) {\n    manifestByUrl(url: $url) {\n      id\n      name\n      description\n      version\n      logo\n      types\n    }\n  }\n": typeof types.ManifestByUrlDocument,
    "\n  query GetFullProfile($profileId: ID!) {\n    profile(id: $profileId) {\n      id\n      name\n      avatar\n      isPrivate\n      installedAddons {\n        id\n        manifestId\n        manifestUrl\n      }\n    }\n  }\n": typeof types.GetFullProfileDocument,
    "\n  query Account {\n    account {\n      id\n      email\n      profiles {\n        id\n        name\n        avatar\n        isPrivate\n      }\n    }\n  }\n": typeof types.AccountDocument,
    "\n  query DiscoverableCatalogs($profileId: ID!) {\n    profile(id: $profileId) {\n      discoverableCatalogs {\n        addonName\n        manifestId\n        catalogId\n        catalogName\n        catalogType\n        extraProps {\n          name\n          isRequired\n          options\n        }\n      }\n    }\n  }\n": typeof types.DiscoverableCatalogsDocument,
    "\n  query Catalog(\n    $profileId: ID!\n    $itemType: String!\n    $catalogId: String!\n    $manifestId: String\n    $extraProps: JSON\n  ) {\n    profile(id: $profileId) {\n      catalog(\n        itemType: $itemType\n        catalogId: $catalogId\n        manifestId: $manifestId\n        extraProps: $extraProps\n      ) {\n        items {\n          id\n          name\n          type\n          poster\n        }\n      }\n    }\n  }\n": typeof types.CatalogDocument,
    "\n  query HomeCatalogs($profileId: ID!) {\n    profile(id: $profileId) {\n      homeCatalogs {\n        addonName\n        content {\n          title\n          items {\n            id\n            name\n            type\n            poster\n          }\n        }\n      }\n    }\n  }\n": typeof types.HomeCatalogsDocument,
    "\n  mutation VerifyProfilePin($profileId: ID!, $pin: String!) {\n    verifyProfilePin(input: { profileId: $profileId, pin: $pin }) {\n      __typename\n      ... on VerifyProfilePinSuccess {\n        success\n      }\n      ... on VerifyProfilePinError {\n        code\n        message\n      }\n    }\n  }\n": typeof types.VerifyProfilePinDocument,
    "\n  mutation CreateProfile(\n    $name: String!\n    $avatar: String\n    $isPrivate: Boolean!\n    $pin: String\n  ) {\n    createProfile(\n      input: {\n        name: $name\n        avatar: $avatar\n        isPrivate: $isPrivate\n        pin: $pin\n      }\n    ) {\n      __typename\n      ... on CreateProfileSuccess {\n        profile {\n          id\n          name\n          avatar\n        }\n      }\n      ... on CreateProfileError {\n        code\n        message\n        field\n      }\n    }\n  }\n": typeof types.CreateProfileDocument,
    "\n  mutation CreateAccount($email: String!, $password: String!) {\n    createAccount(input: { email: $email, password: $password }) {\n      __typename\n      ... on CreateAccountSuccess {\n        account {\n          id\n          email\n        }\n      }\n      ... on CreateAccountError {\n        code\n        message\n        field\n      }\n    }\n  }\n": typeof types.CreateAccountDocument,
    "\n  mutation InstallAddon($profileId: ID!, $manifestUrl: String!) {\n    installAddon(input: { profileId: $profileId, manifestUrl: $manifestUrl }) {\n      __typename\n      ... on InstallAddonSuccess {\n        addon {\n          id\n          manifestId\n          manifestUrl\n        }\n      }\n      ... on InstallAddonError {\n        code\n        message\n      }\n    }\n  }\n": typeof types.InstallAddonDocument,
    "\n  mutation UninstallAddon($profileId: ID!, $manifestId: String!) {\n    uninstallAddon(input: { profileId: $profileId, manifestId: $manifestId }) {\n      __typename\n      ... on UninstallAddonSuccess {\n        success\n      }\n      ... on UninstallAddonError {\n        code\n        message\n      }\n    }\n  }\n": typeof types.UninstallAddonDocument,
    "\n  subscription Search($profileId: String!, $query: String!) {\n    search(profileId: $profileId, query: $query) {\n      addonName\n      resultsByType\n      error\n    }\n  }\n": typeof types.SearchDocument,
};
const documents: Documents = {
    "\n  query GetMetaDetails($profileId: ID!, $itemType: String!, $itemId: String!) {\n    profile(id: $profileId) {\n      meta(itemType: $itemType, itemId: $itemId) {\n        id\n        name\n        type\n        poster\n        background\n        logo\n        description\n        releaseInfo\n        imdbRating\n        genres\n        videos {\n          id\n          title\n          released\n          thumbnail\n          season\n          episode\n        }\n      }\n    }\n  }\n": types.GetMetaDetailsDocument,
    "\n  query GetStreams($profileId: ID!, $itemType: String!, $itemId: String!) {\n    profile(id: $profileId) {\n      streams(itemType: $itemType, itemId: $itemId) {\n        name\n        title\n        url\n        infoHash\n        behaviorHints\n        addonName\n      }\n    }\n  }\n": types.GetStreamsDocument,
    "\n  query ManifestByUrl($url: String!) {\n    manifestByUrl(url: $url) {\n      id\n      name\n      description\n      version\n      logo\n      types\n    }\n  }\n": types.ManifestByUrlDocument,
    "\n  query GetFullProfile($profileId: ID!) {\n    profile(id: $profileId) {\n      id\n      name\n      avatar\n      isPrivate\n      installedAddons {\n        id\n        manifestId\n        manifestUrl\n      }\n    }\n  }\n": types.GetFullProfileDocument,
    "\n  query Account {\n    account {\n      id\n      email\n      profiles {\n        id\n        name\n        avatar\n        isPrivate\n      }\n    }\n  }\n": types.AccountDocument,
    "\n  query DiscoverableCatalogs($profileId: ID!) {\n    profile(id: $profileId) {\n      discoverableCatalogs {\n        addonName\n        manifestId\n        catalogId\n        catalogName\n        catalogType\n        extraProps {\n          name\n          isRequired\n          options\n        }\n      }\n    }\n  }\n": types.DiscoverableCatalogsDocument,
    "\n  query Catalog(\n    $profileId: ID!\n    $itemType: String!\n    $catalogId: String!\n    $manifestId: String\n    $extraProps: JSON\n  ) {\n    profile(id: $profileId) {\n      catalog(\n        itemType: $itemType\n        catalogId: $catalogId\n        manifestId: $manifestId\n        extraProps: $extraProps\n      ) {\n        items {\n          id\n          name\n          type\n          poster\n        }\n      }\n    }\n  }\n": types.CatalogDocument,
    "\n  query HomeCatalogs($profileId: ID!) {\n    profile(id: $profileId) {\n      homeCatalogs {\n        addonName\n        content {\n          title\n          items {\n            id\n            name\n            type\n            poster\n          }\n        }\n      }\n    }\n  }\n": types.HomeCatalogsDocument,
    "\n  mutation VerifyProfilePin($profileId: ID!, $pin: String!) {\n    verifyProfilePin(input: { profileId: $profileId, pin: $pin }) {\n      __typename\n      ... on VerifyProfilePinSuccess {\n        success\n      }\n      ... on VerifyProfilePinError {\n        code\n        message\n      }\n    }\n  }\n": types.VerifyProfilePinDocument,
    "\n  mutation CreateProfile(\n    $name: String!\n    $avatar: String\n    $isPrivate: Boolean!\n    $pin: String\n  ) {\n    createProfile(\n      input: {\n        name: $name\n        avatar: $avatar\n        isPrivate: $isPrivate\n        pin: $pin\n      }\n    ) {\n      __typename\n      ... on CreateProfileSuccess {\n        profile {\n          id\n          name\n          avatar\n        }\n      }\n      ... on CreateProfileError {\n        code\n        message\n        field\n      }\n    }\n  }\n": types.CreateProfileDocument,
    "\n  mutation CreateAccount($email: String!, $password: String!) {\n    createAccount(input: { email: $email, password: $password }) {\n      __typename\n      ... on CreateAccountSuccess {\n        account {\n          id\n          email\n        }\n      }\n      ... on CreateAccountError {\n        code\n        message\n        field\n      }\n    }\n  }\n": types.CreateAccountDocument,
    "\n  mutation InstallAddon($profileId: ID!, $manifestUrl: String!) {\n    installAddon(input: { profileId: $profileId, manifestUrl: $manifestUrl }) {\n      __typename\n      ... on InstallAddonSuccess {\n        addon {\n          id\n          manifestId\n          manifestUrl\n        }\n      }\n      ... on InstallAddonError {\n        code\n        message\n      }\n    }\n  }\n": types.InstallAddonDocument,
    "\n  mutation UninstallAddon($profileId: ID!, $manifestId: String!) {\n    uninstallAddon(input: { profileId: $profileId, manifestId: $manifestId }) {\n      __typename\n      ... on UninstallAddonSuccess {\n        success\n      }\n      ... on UninstallAddonError {\n        code\n        message\n      }\n    }\n  }\n": types.UninstallAddonDocument,
    "\n  subscription Search($profileId: String!, $query: String!) {\n    search(profileId: $profileId, query: $query) {\n      addonName\n      resultsByType\n      error\n    }\n  }\n": types.SearchDocument,
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
export function graphql(source: "\n  query GetMetaDetails($profileId: ID!, $itemType: String!, $itemId: String!) {\n    profile(id: $profileId) {\n      meta(itemType: $itemType, itemId: $itemId) {\n        id\n        name\n        type\n        poster\n        background\n        logo\n        description\n        releaseInfo\n        imdbRating\n        genres\n        videos {\n          id\n          title\n          released\n          thumbnail\n          season\n          episode\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetMetaDetails($profileId: ID!, $itemType: String!, $itemId: String!) {\n    profile(id: $profileId) {\n      meta(itemType: $itemType, itemId: $itemId) {\n        id\n        name\n        type\n        poster\n        background\n        logo\n        description\n        releaseInfo\n        imdbRating\n        genres\n        videos {\n          id\n          title\n          released\n          thumbnail\n          season\n          episode\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetStreams($profileId: ID!, $itemType: String!, $itemId: String!) {\n    profile(id: $profileId) {\n      streams(itemType: $itemType, itemId: $itemId) {\n        name\n        title\n        url\n        infoHash\n        behaviorHints\n        addonName\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetStreams($profileId: ID!, $itemType: String!, $itemId: String!) {\n    profile(id: $profileId) {\n      streams(itemType: $itemType, itemId: $itemId) {\n        name\n        title\n        url\n        infoHash\n        behaviorHints\n        addonName\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ManifestByUrl($url: String!) {\n    manifestByUrl(url: $url) {\n      id\n      name\n      description\n      version\n      logo\n      types\n    }\n  }\n"): (typeof documents)["\n  query ManifestByUrl($url: String!) {\n    manifestByUrl(url: $url) {\n      id\n      name\n      description\n      version\n      logo\n      types\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetFullProfile($profileId: ID!) {\n    profile(id: $profileId) {\n      id\n      name\n      avatar\n      isPrivate\n      installedAddons {\n        id\n        manifestId\n        manifestUrl\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetFullProfile($profileId: ID!) {\n    profile(id: $profileId) {\n      id\n      name\n      avatar\n      isPrivate\n      installedAddons {\n        id\n        manifestId\n        manifestUrl\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Account {\n    account {\n      id\n      email\n      profiles {\n        id\n        name\n        avatar\n        isPrivate\n      }\n    }\n  }\n"): (typeof documents)["\n  query Account {\n    account {\n      id\n      email\n      profiles {\n        id\n        name\n        avatar\n        isPrivate\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query DiscoverableCatalogs($profileId: ID!) {\n    profile(id: $profileId) {\n      discoverableCatalogs {\n        addonName\n        manifestId\n        catalogId\n        catalogName\n        catalogType\n        extraProps {\n          name\n          isRequired\n          options\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query DiscoverableCatalogs($profileId: ID!) {\n    profile(id: $profileId) {\n      discoverableCatalogs {\n        addonName\n        manifestId\n        catalogId\n        catalogName\n        catalogType\n        extraProps {\n          name\n          isRequired\n          options\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Catalog(\n    $profileId: ID!\n    $itemType: String!\n    $catalogId: String!\n    $manifestId: String\n    $extraProps: JSON\n  ) {\n    profile(id: $profileId) {\n      catalog(\n        itemType: $itemType\n        catalogId: $catalogId\n        manifestId: $manifestId\n        extraProps: $extraProps\n      ) {\n        items {\n          id\n          name\n          type\n          poster\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query Catalog(\n    $profileId: ID!\n    $itemType: String!\n    $catalogId: String!\n    $manifestId: String\n    $extraProps: JSON\n  ) {\n    profile(id: $profileId) {\n      catalog(\n        itemType: $itemType\n        catalogId: $catalogId\n        manifestId: $manifestId\n        extraProps: $extraProps\n      ) {\n        items {\n          id\n          name\n          type\n          poster\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query HomeCatalogs($profileId: ID!) {\n    profile(id: $profileId) {\n      homeCatalogs {\n        addonName\n        content {\n          title\n          items {\n            id\n            name\n            type\n            poster\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query HomeCatalogs($profileId: ID!) {\n    profile(id: $profileId) {\n      homeCatalogs {\n        addonName\n        content {\n          title\n          items {\n            id\n            name\n            type\n            poster\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation VerifyProfilePin($profileId: ID!, $pin: String!) {\n    verifyProfilePin(input: { profileId: $profileId, pin: $pin }) {\n      __typename\n      ... on VerifyProfilePinSuccess {\n        success\n      }\n      ... on VerifyProfilePinError {\n        code\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation VerifyProfilePin($profileId: ID!, $pin: String!) {\n    verifyProfilePin(input: { profileId: $profileId, pin: $pin }) {\n      __typename\n      ... on VerifyProfilePinSuccess {\n        success\n      }\n      ... on VerifyProfilePinError {\n        code\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateProfile(\n    $name: String!\n    $avatar: String\n    $isPrivate: Boolean!\n    $pin: String\n  ) {\n    createProfile(\n      input: {\n        name: $name\n        avatar: $avatar\n        isPrivate: $isPrivate\n        pin: $pin\n      }\n    ) {\n      __typename\n      ... on CreateProfileSuccess {\n        profile {\n          id\n          name\n          avatar\n        }\n      }\n      ... on CreateProfileError {\n        code\n        message\n        field\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateProfile(\n    $name: String!\n    $avatar: String\n    $isPrivate: Boolean!\n    $pin: String\n  ) {\n    createProfile(\n      input: {\n        name: $name\n        avatar: $avatar\n        isPrivate: $isPrivate\n        pin: $pin\n      }\n    ) {\n      __typename\n      ... on CreateProfileSuccess {\n        profile {\n          id\n          name\n          avatar\n        }\n      }\n      ... on CreateProfileError {\n        code\n        message\n        field\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateAccount($email: String!, $password: String!) {\n    createAccount(input: { email: $email, password: $password }) {\n      __typename\n      ... on CreateAccountSuccess {\n        account {\n          id\n          email\n        }\n      }\n      ... on CreateAccountError {\n        code\n        message\n        field\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateAccount($email: String!, $password: String!) {\n    createAccount(input: { email: $email, password: $password }) {\n      __typename\n      ... on CreateAccountSuccess {\n        account {\n          id\n          email\n        }\n      }\n      ... on CreateAccountError {\n        code\n        message\n        field\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation InstallAddon($profileId: ID!, $manifestUrl: String!) {\n    installAddon(input: { profileId: $profileId, manifestUrl: $manifestUrl }) {\n      __typename\n      ... on InstallAddonSuccess {\n        addon {\n          id\n          manifestId\n          manifestUrl\n        }\n      }\n      ... on InstallAddonError {\n        code\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation InstallAddon($profileId: ID!, $manifestUrl: String!) {\n    installAddon(input: { profileId: $profileId, manifestUrl: $manifestUrl }) {\n      __typename\n      ... on InstallAddonSuccess {\n        addon {\n          id\n          manifestId\n          manifestUrl\n        }\n      }\n      ... on InstallAddonError {\n        code\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UninstallAddon($profileId: ID!, $manifestId: String!) {\n    uninstallAddon(input: { profileId: $profileId, manifestId: $manifestId }) {\n      __typename\n      ... on UninstallAddonSuccess {\n        success\n      }\n      ... on UninstallAddonError {\n        code\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UninstallAddon($profileId: ID!, $manifestId: String!) {\n    uninstallAddon(input: { profileId: $profileId, manifestId: $manifestId }) {\n      __typename\n      ... on UninstallAddonSuccess {\n        success\n      }\n      ... on UninstallAddonError {\n        code\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  subscription Search($profileId: String!, $query: String!) {\n    search(profileId: $profileId, query: $query) {\n      addonName\n      resultsByType\n      error\n    }\n  }\n"): (typeof documents)["\n  subscription Search($profileId: String!, $query: String!) {\n    search(profileId: $profileId, query: $query) {\n      addonName\n      resultsByType\n      error\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;