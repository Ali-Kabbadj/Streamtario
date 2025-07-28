import { graphql } from './gen/gql';

// ============================================================================
// QUERIES
// ============================================================================

export const GetFullProfileDocument = graphql(`
  query GetFullProfile($profileId: ID!) {
    profile(id: $profileId) {
      id
      name
      avatar
      isPrivate
      installedAddons {
        id
        manifestId
        manifestUrl
      }
    }
  }
`);

export const AccountDocument = graphql(`
  query Account {
    account {
      id
      email
      profiles {
        id
        name
        avatar
        isPrivate # <--- THIS IS THE FIX. We must request this field.
      }
    }
  }
`);

// ============================================================================
// MUTATIONS
// ============================================================================

export const VerifyProfilePinDocument = graphql(`
  mutation VerifyProfilePin($profileId: ID!, $pin: String!) {
    verifyProfilePin(input: { profileId: $profileId, pin: $pin }) {
      __typename
      ... on VerifyProfilePinSuccess {
        success
      }
      ... on VerifyProfilePinError {
        code
        message
      }
    }
  }
`);

export const CreateProfileDocument = graphql(`
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

export const CreateAccountDocument = graphql(`
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

export const InstallAddonDocument = graphql(`
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

export const UninstallAddonDocument = graphql(`
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