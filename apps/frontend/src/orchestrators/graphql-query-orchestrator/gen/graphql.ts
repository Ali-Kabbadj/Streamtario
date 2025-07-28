/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
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
  code: Scalars['String']['output'];
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

export type CreateProfileError = {
  __typename?: 'CreateProfileError';
  code: Scalars['String']['output'];
  field?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
};

export type CreateProfileInput = {
  avatar?: InputMaybe<Scalars['String']['input']>;
  isPrivate?: Scalars['Boolean']['input'];
  name: Scalars['String']['input'];
  pin?: InputMaybe<Scalars['String']['input']>;
};

export type CreateProfileSuccess = {
  __typename?: 'CreateProfileSuccess';
  profile: Profile;
};

export type CreateProfileSuccessCreateProfileError = CreateProfileError | CreateProfileSuccess;

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
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
  profileId: Scalars['ID']['output'];
};

export type InstallAddonForAllProfilesError = {
  __typename?: 'InstallAddonForAllProfilesError';
  code: Scalars['String']['output'];
  error?: Maybe<Scalars['JSON']['output']>;
  message: Scalars['String']['output'];
};

export type InstallAddonForAllProfilesInput = {
  manifestUrl: Scalars['String']['input'];
};

export type InstallAddonForAllProfilesSuccess = {
  __typename?: 'InstallAddonForAllProfilesSuccess';
  summary: Scalars['JSON']['output'];
};

export type InstallAddonForAllProfilesSuccessInstallAddonForAllProfilesError = InstallAddonForAllProfilesError | InstallAddonForAllProfilesSuccess;

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
  createProfile: CreateProfileSuccessCreateProfileError;
  installAddon: InstallAddonSuccessInstallAddonError;
  installAddonForAllProfiles: InstallAddonForAllProfilesSuccessInstallAddonForAllProfilesError;
  uninstallAddon: UninstallAddonSuccessUninstallAddonError;
  uninstallAddonFromAllProfiles: UninstallAddonFromAllProfilesSuccessUninstallAddonFromAllProfilesError;
  updateProfile: UpdateProfileSuccessUpdateProfileError;
};


export type MutationCreateAccountArgs = {
  input: CreateAccountInput;
};


export type MutationCreateProfileArgs = {
  input: CreateProfileInput;
};


export type MutationInstallAddonArgs = {
  input: InstallAddonInput;
};


export type MutationInstallAddonForAllProfilesArgs = {
  input: InstallAddonForAllProfilesInput;
};


export type MutationUninstallAddonArgs = {
  input: UninstallAddonInput;
};


export type MutationUninstallAddonFromAllProfilesArgs = {
  input: UninstallAddonFromAllProfilesInput;
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
};

export type Profile = {
  __typename?: 'Profile';
  avatar?: Maybe<Scalars['String']['output']>;
  catalog: CatalogResult;
  discoverableCatalogs: Array<DiscoveredCatalogType>;
  id: Scalars['ID']['output'];
  installedAddons: Array<InstalledAddonType>;
  isPrivate: Scalars['Boolean']['output'];
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
  account?: Maybe<AccountType>;
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
  code: Scalars['String']['output'];
  manifestId: Scalars['String']['output'];
  message: Scalars['String']['output'];
  profileId: Scalars['ID']['output'];
};

export type UninstallAddonFromAllProfilesError = {
  __typename?: 'UninstallAddonFromAllProfilesError';
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type UninstallAddonFromAllProfilesInput = {
  manifestId: Scalars['String']['input'];
};

export type UninstallAddonFromAllProfilesSuccess = {
  __typename?: 'UninstallAddonFromAllProfilesSuccess';
  summary: Scalars['JSON']['output'];
};

export type UninstallAddonFromAllProfilesSuccessUninstallAddonFromAllProfilesError = UninstallAddonFromAllProfilesError | UninstallAddonFromAllProfilesSuccess;

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

export type UpdateProfileError = {
  __typename?: 'UpdateProfileError';
  code: Scalars['String']['output'];
  field?: Maybe<Scalars['String']['output']>;
  message: Scalars['String']['output'];
};

export type UpdateProfileInput = {
  avatar?: InputMaybe<Scalars['String']['input']>;
  isPrivate?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  pin?: InputMaybe<Scalars['String']['input']>;
  profileId: Scalars['ID']['input'];
};

export type UpdateProfileSuccess = {
  __typename?: 'UpdateProfileSuccess';
  profile: Profile;
};

export type UpdateProfileSuccessUpdateProfileError = UpdateProfileError | UpdateProfileSuccess;

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


export type GetFullProfileQuery = { __typename?: 'Query', profile?: { __typename?: 'Profile', id: string, name: string, avatar?: string | null, isPrivate: boolean, installedAddons: Array<{ __typename?: 'InstalledAddonType', id: string, manifestId: string, manifestUrl: string }> } | null };

export type AccountQueryVariables = Exact<{ [key: string]: never; }>;


export type AccountQuery = { __typename?: 'Query', account?: { __typename?: 'AccountType', id: string, email: string, profiles: Array<{ __typename?: 'Profile', id: string, name: string, avatar?: string | null }> } | null };

export type CreateProfileMutationVariables = Exact<{
  name: Scalars['String']['input'];
  avatar?: InputMaybe<Scalars['String']['input']>;
  isPrivate: Scalars['Boolean']['input'];
  pin?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreateProfileMutation = { __typename?: 'Mutation', createProfile: { __typename: 'CreateProfileError', code: string, message: string, field?: string | null } | { __typename: 'CreateProfileSuccess', profile: { __typename?: 'Profile', id: string, name: string, avatar?: string | null } } };

export type CreateAccountMutationVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type CreateAccountMutation = { __typename?: 'Mutation', createAccount: { __typename: 'CreateAccountError', code: string, message: string, field?: string | null } | { __typename: 'CreateAccountSuccess', account: { __typename?: 'AccountType', id: string, email: string } } };

export type InstallAddonMutationVariables = Exact<{
  profileId: Scalars['ID']['input'];
  manifestUrl: Scalars['String']['input'];
}>;


export type InstallAddonMutation = { __typename?: 'Mutation', installAddon: { __typename: 'InstallAddonError', code: string, message: string } | { __typename: 'InstallAddonSuccess', addon: { __typename?: 'InstalledAddonType', id: string, manifestId: string, manifestUrl: string } } };

export type UninstallAddonMutationVariables = Exact<{
  profileId: Scalars['ID']['input'];
  manifestId: Scalars['String']['input'];
}>;


export type UninstallAddonMutation = { __typename?: 'Mutation', uninstallAddon: { __typename: 'UninstallAddonError', code: string, message: string } | { __typename: 'UninstallAddonSuccess', success: boolean } };


export const GetFullProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetFullProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"profileId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"profileId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}},{"kind":"Field","name":{"kind":"Name","value":"isPrivate"}},{"kind":"Field","name":{"kind":"Name","value":"installedAddons"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"manifestId"}},{"kind":"Field","name":{"kind":"Name","value":"manifestUrl"}}]}}]}}]}}]} as unknown as DocumentNode<GetFullProfileQuery, GetFullProfileQueryVariables>;
export const AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"profiles"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]}}]}}]} as unknown as DocumentNode<AccountQuery, AccountQueryVariables>;
export const CreateProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"avatar"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isPrivate"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"pin"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"avatar"},"value":{"kind":"Variable","name":{"kind":"Name","value":"avatar"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"isPrivate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isPrivate"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"pin"},"value":{"kind":"Variable","name":{"kind":"Name","value":"pin"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CreateProfileSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CreateProfileError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"field"}}]}}]}}]}}]} as unknown as DocumentNode<CreateProfileMutation, CreateProfileMutationVariables>;
export const CreateAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAccount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAccount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CreateAccountSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CreateAccountError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"field"}}]}}]}}]}}]} as unknown as DocumentNode<CreateAccountMutation, CreateAccountMutationVariables>;
export const InstallAddonDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InstallAddon"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"profileId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"manifestUrl"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"installAddon"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"profileId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"profileId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"manifestUrl"},"value":{"kind":"Variable","name":{"kind":"Name","value":"manifestUrl"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InstallAddonSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addon"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"manifestId"}},{"kind":"Field","name":{"kind":"Name","value":"manifestUrl"}}]}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"InstallAddonError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<InstallAddonMutation, InstallAddonMutationVariables>;
export const UninstallAddonDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UninstallAddon"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"profileId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"manifestId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uninstallAddon"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"profileId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"profileId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"manifestId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"manifestId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UninstallAddonSuccess"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UninstallAddonError"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<UninstallAddonMutation, UninstallAddonMutationVariables>;