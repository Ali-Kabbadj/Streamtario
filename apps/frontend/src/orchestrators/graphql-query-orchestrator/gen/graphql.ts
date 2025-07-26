/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: any; output: any; }
};

export type AccountType = {
  __typename?: 'AccountType';
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  profiles: Array<Profile>;
};

export type AddonSearchResultType = {
  __typename?: 'AddonSearchResultType';
  addonName: Scalars['String']['output'];
  error?: Maybe<Scalars['String']['output']>;
  resultsByType: Scalars['JSON']['output'];
};

export type CatalogItemType = {
  __typename?: 'CatalogItemType';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  poster?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

export type CatalogResult = {
  __typename?: 'CatalogResult';
  items: Array<CatalogItemType>;
};

export type CreateAccountError = {
  __typename?: 'CreateAccountError';
  field?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
};

export type CreateAccountInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type CreateAccountSuccess = {
  __typename?: 'CreateAccountSuccess';
  account: AccountType;
};

export type CreateAccountSuccessCreateAccountError = CreateAccountError | CreateAccountSuccess;

export type DiscoveredCatalogExtraProp = {
  __typename?: 'DiscoveredCatalogExtraProp';
  isRequired: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  options?: Maybe<Array<Scalars['String']['output']>>;
  optionsLimit?: Maybe<Scalars['Int']['output']>;
};

export type DiscoveredCatalogType = {
  __typename?: 'DiscoveredCatalogType';
  addonName: Scalars['String']['output'];
  catalogId: Scalars['String']['output'];
  catalogName: Scalars['String']['output'];
  catalogType: Scalars['String']['output'];
  extraProps: Array<DiscoveredCatalogExtraProp>;
  manifestId: Scalars['String']['output'];
  supportedItemTypes: Array<Scalars['String']['output']>;
};

export type InstallAddonError = {
  __typename?: 'InstallAddonError';
  message: Scalars['String']['output'];
  profileId: Scalars['ID']['output'];
};

export type InstallAddonInput = {
  manifestUrl: Scalars['String']['input'];
  profileId: Scalars['ID']['input'];
};

export type InstallAddonSuccess = {
  __typename?: 'InstallAddonSuccess';
  addon: InstalledAddonType;
};

export type InstallAddonSuccessInstallAddonError = InstallAddonError | InstallAddonSuccess;

export type InstalledAddonType = {
  __typename?: 'InstalledAddonType';
  id: Scalars['ID']['output'];
  installedAt: Scalars['String']['output'];
  manifestId: Scalars['String']['output'];
  manifestUrl: Scalars['String']['output'];
};

export type MetaItemType = {
  __typename?: 'MetaItemType';
  background?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  genres?: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['ID']['output'];
  imdbRating?: Maybe<Scalars['String']['output']>;
  logo?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  poster?: Maybe<Scalars['String']['output']>;
  releaseInfo?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
  videos?: Maybe<Array<VideoType>>;
};

export type Mutation = {
  __typename?: 'Mutation';
  createAccount: CreateAccountSuccessCreateAccountError;
  installAddon: InstallAddonSuccessInstallAddonError;
  uninstallAddon: UninstallAddonSuccessUninstallAddonError;
};


export type MutationCreateAccountArgs = {
  input: CreateAccountInput;
};


export type MutationInstallAddonArgs = {
  input: InstallAddonInput;
};


export type MutationUninstallAddonArgs = {
  input: UninstallAddonInput;
};

export type Profile = {
  __typename?: 'Profile';
  avatar?: Maybe<Scalars['String']['output']>;
  catalog: CatalogResult;
  discoverableCatalogs: Array<DiscoveredCatalogType>;
  id: Scalars['ID']['output'];
  manifestUrls: Array<Scalars['String']['output']>;
  meta?: Maybe<MetaItemType>;
  name: Scalars['String']['output'];
};


export type ProfileCatalogArgs = {
  catalogId?: InputMaybe<Scalars['String']['input']>;
  extraProps?: InputMaybe<Scalars['JSON']['input']>;
  filterByType?: InputMaybe<Scalars['String']['input']>;
  itemType: Scalars['String']['input'];
  manifestId?: InputMaybe<Scalars['String']['input']>;
};


export type ProfileMetaArgs = {
  itemId: Scalars['String']['input'];
  itemType: Scalars['String']['input'];
};

export type ProfileRepresentation = {
  Profilerepresentation_Typename: Scalars['String']['input'];
  id: Scalars['ID']['input'];
};

export type Query = {
  __typename?: 'Query';
  profile?: Maybe<Profile>;
};


export type QueryProfileArgs = {
  id: Scalars['ID']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  search: AddonSearchResultType;
};


export type SubscriptionSearchArgs = {
  profileId: Scalars['String']['input'];
  query: Scalars['String']['input'];
};

export type UninstallAddonError = {
  __typename?: 'UninstallAddonError';
  manifestId: Scalars['String']['output'];
  message: Scalars['String']['output'];
  profileId: Scalars['ID']['output'];
};

export type UninstallAddonInput = {
  manifestId: Scalars['String']['input'];
  profileId: Scalars['ID']['input'];
};

export type UninstallAddonSuccess = {
  __typename?: 'UninstallAddonSuccess';
  manifestId: Scalars['String']['output'];
  profileId: Scalars['ID']['output'];
  success: Scalars['Boolean']['output'];
};

export type UninstallAddonSuccessUninstallAddonError = UninstallAddonError | UninstallAddonSuccess;

export type VideoType = {
  __typename?: 'VideoType';
  id: Scalars['ID']['output'];
  released?: Maybe<Scalars['String']['output']>;
  thumbnail?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type GetFullProfileQueryVariables = Exact<{
  profileId: Scalars['ID']['input'];
}>;


export type GetFullProfileQuery = { __typename?: 'Query', profile?: { __typename?: 'Profile', id: string, name: string, avatar?: string | null, manifestUrls: Array<string>, discoverableCatalogs: Array<{ __typename?: 'DiscoveredCatalogType', addonName: string, manifestId: string, catalogId: string, catalogName: string, catalogType: string, supportedItemTypes: Array<string>, extraProps: Array<{ __typename?: 'DiscoveredCatalogExtraProp', name: string, isRequired: boolean, options?: Array<string> | null, optionsLimit?: number | null }> }>, catalog: { __typename?: 'CatalogResult', items: Array<{ __typename?: 'CatalogItemType', id: string, type: string, name: string, poster?: string | null }> }, meta?: { __typename?: 'MetaItemType', id: string, type: string, name: string, genres?: Array<string> | null, poster?: string | null, background?: string | null, logo?: string | null, description?: string | null, releaseInfo?: string | null, imdbRating?: string | null, videos?: Array<{ __typename?: 'VideoType', id: string, title: string, released?: string | null, thumbnail?: string | null }> | null } | null } | null };

export type CreateAccountMutationVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type CreateAccountMutation = { __typename?: 'Mutation', createAccount: { __typename?: 'CreateAccountError', message: string, field?: string | null } | { __typename?: 'CreateAccountSuccess', account: { __typename?: 'AccountType', id: string, email: string } } };

export type InstallAddonMutationVariables = Exact<{
  profileId: Scalars['ID']['input'];
  manifestUrl: Scalars['String']['input'];
}>;


export type InstallAddonMutation = { __typename?: 'Mutation', installAddon: { __typename?: 'InstallAddonError', message: string } | { __typename?: 'InstallAddonSuccess', addon: { __typename?: 'InstalledAddonType', id: string, manifestId: string } } };

export type UninstallAddonMutationVariables = Exact<{
  profileId: Scalars['ID']['input'];
  manifestId: Scalars['String']['input'];
}>;


export type UninstallAddonMutation = { __typename?: 'Mutation', uninstallAddon: { __typename?: 'UninstallAddonError', message: string } | { __typename?: 'UninstallAddonSuccess', success: boolean } };


export const GetFullProfileDocument = { "kind": "Document", "definitions": [{ "kind": "OperationDefinition", "operation": "query", "name": { "kind": "Name", "value": "GetFullProfile" }, "variableDefinitions": [{ "kind": "VariableDefinition", "variable": { "kind": "Variable", "name": { "kind": "Name", "value": "profileId" } }, "type": { "kind": "NonNullType", "type": { "kind": "NamedType", "name": { "kind": "Name", "value": "ID" } } } }], "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "profile" }, "arguments": [{ "kind": "Argument", "name": { "kind": "Name", "value": "id" }, "value": { "kind": "Variable", "name": { "kind": "Name", "value": "profileId" } } }], "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "id" } }, { "kind": "Field", "name": { "kind": "Name", "value": "name" } }, { "kind": "Field", "name": { "kind": "Name", "value": "avatar" } }, { "kind": "Field", "name": { "kind": "Name", "value": "manifestUrls" } }, { "kind": "Field", "name": { "kind": "Name", "value": "discoverableCatalogs" }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "addonName" } }, { "kind": "Field", "name": { "kind": "Name", "value": "manifestId" } }, { "kind": "Field", "name": { "kind": "Name", "value": "catalogId" } }, { "kind": "Field", "name": { "kind": "Name", "value": "catalogName" } }, { "kind": "Field", "name": { "kind": "Name", "value": "catalogType" } }, { "kind": "Field", "name": { "kind": "Name", "value": "supportedItemTypes" } }, { "kind": "Field", "name": { "kind": "Name", "value": "extraProps" }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "name" } }, { "kind": "Field", "name": { "kind": "Name", "value": "isRequired" } }, { "kind": "Field", "name": { "kind": "Name", "value": "options" } }, { "kind": "Field", "name": { "kind": "Name", "value": "optionsLimit" } }] } }] } }, { "kind": "Field", "name": { "kind": "Name", "value": "catalog" }, "arguments": [{ "kind": "Argument", "name": { "kind": "Name", "value": "itemType" }, "value": { "kind": "StringValue", "value": "movie", "block": false } }], "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "items" }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "id" } }, { "kind": "Field", "name": { "kind": "Name", "value": "type" } }, { "kind": "Field", "name": { "kind": "Name", "value": "name" } }, { "kind": "Field", "name": { "kind": "Name", "value": "poster" } }] } }] } }, { "kind": "Field", "name": { "kind": "Name", "value": "meta" }, "arguments": [{ "kind": "Argument", "name": { "kind": "Name", "value": "itemType" }, "value": { "kind": "StringValue", "value": "series", "block": false } }, { "kind": "Argument", "name": { "kind": "Name", "value": "itemId" }, "value": { "kind": "StringValue", "value": "community.anime.kitsu:kitsu:856", "block": false } }], "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "id" } }, { "kind": "Field", "name": { "kind": "Name", "value": "type" } }, { "kind": "Field", "name": { "kind": "Name", "value": "name" } }, { "kind": "Field", "name": { "kind": "Name", "value": "genres" } }, { "kind": "Field", "name": { "kind": "Name", "value": "poster" } }, { "kind": "Field", "name": { "kind": "Name", "value": "background" } }, { "kind": "Field", "name": { "kind": "Name", "value": "logo" } }, { "kind": "Field", "name": { "kind": "Name", "value": "description" } }, { "kind": "Field", "name": { "kind": "Name", "value": "releaseInfo" } }, { "kind": "Field", "name": { "kind": "Name", "value": "imdbRating" } }, { "kind": "Field", "name": { "kind": "Name", "value": "videos" }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "id" } }, { "kind": "Field", "name": { "kind": "Name", "value": "title" } }, { "kind": "Field", "name": { "kind": "Name", "value": "released" } }, { "kind": "Field", "name": { "kind": "Name", "value": "thumbnail" } }] } }] } }] } }] } }] } as unknown as DocumentNode<GetFullProfileQuery, GetFullProfileQueryVariables>;
export const CreateAccountDocument = { "kind": "Document", "definitions": [{ "kind": "OperationDefinition", "operation": "mutation", "name": { "kind": "Name", "value": "CreateAccount" }, "variableDefinitions": [{ "kind": "VariableDefinition", "variable": { "kind": "Variable", "name": { "kind": "Name", "value": "email" } }, "type": { "kind": "NonNullType", "type": { "kind": "NamedType", "name": { "kind": "Name", "value": "String" } } } }, { "kind": "VariableDefinition", "variable": { "kind": "Variable", "name": { "kind": "Name", "value": "password" } }, "type": { "kind": "NonNullType", "type": { "kind": "NamedType", "name": { "kind": "Name", "value": "String" } } } }], "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "createAccount" }, "arguments": [{ "kind": "Argument", "name": { "kind": "Name", "value": "input" }, "value": { "kind": "ObjectValue", "fields": [{ "kind": "ObjectField", "name": { "kind": "Name", "value": "email" }, "value": { "kind": "Variable", "name": { "kind": "Name", "value": "email" } } }, { "kind": "ObjectField", "name": { "kind": "Name", "value": "password" }, "value": { "kind": "Variable", "name": { "kind": "Name", "value": "password" } } }] } }], "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "InlineFragment", "typeCondition": { "kind": "NamedType", "name": { "kind": "Name", "value": "CreateAccountSuccess" } }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "account" }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "id" } }, { "kind": "Field", "name": { "kind": "Name", "value": "email" } }] } }] } }, { "kind": "InlineFragment", "typeCondition": { "kind": "NamedType", "name": { "kind": "Name", "value": "CreateAccountError" } }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "message" } }, { "kind": "Field", "name": { "kind": "Name", "value": "field" } }] } }] } }] } }] } as unknown as DocumentNode<CreateAccountMutation, CreateAccountMutationVariables>;
export const InstallAddonDocument = { "kind": "Document", "definitions": [{ "kind": "OperationDefinition", "operation": "mutation", "name": { "kind": "Name", "value": "InstallAddon" }, "variableDefinitions": [{ "kind": "VariableDefinition", "variable": { "kind": "Variable", "name": { "kind": "Name", "value": "profileId" } }, "type": { "kind": "NonNullType", "type": { "kind": "NamedType", "name": { "kind": "Name", "value": "ID" } } } }, { "kind": "VariableDefinition", "variable": { "kind": "Variable", "name": { "kind": "Name", "value": "manifestUrl" } }, "type": { "kind": "NonNullType", "type": { "kind": "NamedType", "name": { "kind": "Name", "value": "String" } } } }], "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "installAddon" }, "arguments": [{ "kind": "Argument", "name": { "kind": "Name", "value": "input" }, "value": { "kind": "ObjectValue", "fields": [{ "kind": "ObjectField", "name": { "kind": "Name", "value": "profileId" }, "value": { "kind": "Variable", "name": { "kind": "Name", "value": "profileId" } } }, { "kind": "ObjectField", "name": { "kind": "Name", "value": "manifestUrl" }, "value": { "kind": "Variable", "name": { "kind": "Name", "value": "manifestUrl" } } }] } }], "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "InlineFragment", "typeCondition": { "kind": "NamedType", "name": { "kind": "Name", "value": "InstallAddonSuccess" } }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "addon" }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "id" } }, { "kind": "Field", "name": { "kind": "Name", "value": "manifestId" } }] } }] } }, { "kind": "InlineFragment", "typeCondition": { "kind": "NamedType", "name": { "kind": "Name", "value": "InstallAddonError" } }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "message" } }] } }] } }] } }] } as unknown as DocumentNode<InstallAddonMutation, InstallAddonMutationVariables>;
export const UninstallAddonDocument = { "kind": "Document", "definitions": [{ "kind": "OperationDefinition", "operation": "mutation", "name": { "kind": "Name", "value": "UninstallAddon" }, "variableDefinitions": [{ "kind": "VariableDefinition", "variable": { "kind": "Variable", "name": { "kind": "Name", "value": "profileId" } }, "type": { "kind": "NonNullType", "type": { "kind": "NamedType", "name": { "kind": "Name", "value": "ID" } } } }, { "kind": "VariableDefinition", "variable": { "kind": "Variable", "name": { "kind": "Name", "value": "manifestId" } }, "type": { "kind": "NonNullType", "type": { "kind": "NamedType", "name": { "kind": "Name", "value": "String" } } } }], "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "uninstallAddon" }, "arguments": [{ "kind": "Argument", "name": { "kind": "Name", "value": "input" }, "value": { "kind": "ObjectValue", "fields": [{ "kind": "ObjectField", "name": { "kind": "Name", "value": "profileId" }, "value": { "kind": "Variable", "name": { "kind": "Name", "value": "profileId" } } }, { "kind": "ObjectField", "name": { "kind": "Name", "value": "manifestId" }, "value": { "kind": "Variable", "name": { "kind": "Name", "value": "manifestId" } } }] } }], "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "InlineFragment", "typeCondition": { "kind": "NamedType", "name": { "kind": "Name", "value": "UninstallAddonSuccess" } }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "success" } }] } }, { "kind": "InlineFragment", "typeCondition": { "kind": "NamedType", "name": { "kind": "Name", "value": "UninstallAddonError" } }, "selectionSet": { "kind": "SelectionSet", "selections": [{ "kind": "Field", "name": { "kind": "Name", "value": "message" } }] } }] } }] } }] } as unknown as DocumentNode<UninstallAddonMutation, UninstallAddonMutationVariables>;