import { graphql } from './gen/gql';

// ============================================================================
// QUERIES
// ============================================================================

export const GET_FULL_PROFILE_QUERY = graphql(`
  query GetFullProfile($profileId: ID!) {
    profile(id: $profileId) {
      id
      name
      avatar
      isPrivate # <-- Add isPrivate
      installedAddons { # <-- Add installedAddons
        id
        manifestId
        manifestUrl
      }
      # You can add discoverableCatalogs, etc., here as needed
    }
  }
`);

export const ACCOUNT_QUERY = graphql(`
  query Account {
    account {
      id
      email
      profiles {
        id
        name
        avatar
      }
    }
  }
`);

// ============================================================================
// MUTATIONS
// ============================================================================
export const CREATE_PROFILE_MUTATION = graphql(`
  mutation CreateProfile(
    $name: String!
    $avatar: String
    $isPrivate: Boolean!
    $pin: String
  ) {
    createProfile(
      input: {
        name: $name
        avatar: $avatar
        isPrivate: $isPrivate
        pin: $pin
      }
    ) {
      __typename
      ... on CreateProfileSuccess {
        profile {
          id
          name
          avatar
        }
      }
      ... on CreateProfileError {
        code
        message
        field
      }
    }
  }
`);

export const CREATE_ACCOUNT_MUTATION = graphql(`
  mutation CreateAccount($email: String!, $password: String!) {
    createAccount(input: { email: $email, password: $password }) {
      __typename
      ... on CreateAccountSuccess {
        account {
          id
          email
        }
      }
      ... on CreateAccountError {
        code
        message
        field
      }
    }
  }
`);

export const INSTALL_ADDON_MUTATION = graphql(`
  mutation InstallAddon($profileId: ID!, $manifestUrl: String!) {
    installAddon(input: { profileId: $profileId, manifestUrl: $manifestUrl }) {
      __typename
      ... on InstallAddonSuccess {
        addon {
          id
          manifestId
          manifestUrl
        }
      }
      ... on InstallAddonError {
        code
        message
      }
    }
  }
`);

export const UNINSTALL_ADDON_MUTATION = graphql(`
  mutation UninstallAddon($profileId: ID!, $manifestId: String!) {
    uninstallAddon(input: { profileId: $profileId, manifestId: $manifestId }) {
      __typename
      ... on UninstallAddonSuccess {
        success
      }
      ... on UninstallAddonError {
        code
        message
      }
    }
  }
`);
