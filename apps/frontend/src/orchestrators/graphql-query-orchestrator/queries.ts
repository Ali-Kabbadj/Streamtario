// src/orchestrators/graphql-query-orchestrator/queries.ts

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
      manifestUrls
      discoverableCatalogs {
        addonName
        manifestId
        catalogId
        catalogName
        catalogType
        supportedItemTypes
        extraProps {
          name
          isRequired
          options
          optionsLimit
        }
      }
      catalog(itemType: "movie") {
        items {
          id
          type
          name
          poster
        }
      }
      meta(itemType: "series", itemId: "community.anime.kitsu:kitsu:856") {
        id
        type
        name
        genres
        poster
        background
        logo
        description
        releaseInfo
        imdbRating
        videos {
          id
          title
          released
          thumbnail
        }
      }
    }
  }
`);

// ============================================================================
// MUTATIONS
// ============================================================================

export const CREATE_ACCOUNT_MUTATION = graphql(`
  mutation CreateAccount($email: String!, $password: String!) {
    createAccount(input: { email: $email, password: $password }) {
      ... on CreateAccountSuccess {
        account {
          id
          email
        }
      }
      ... on CreateAccountError {
        message
        field
      }
    }
  }
`);

export const INSTALL_ADDON_MUTATION = graphql(`
  mutation InstallAddon($profileId: ID!, $manifestUrl: String!) {
    # ✅ CORRECTION: Changed profile_id -> profileId and manifest_url -> manifestUrl
    installAddon(input: { profileId: $profileId, manifestUrl: $manifestUrl }) {
      ... on InstallAddonSuccess {
        addon {
          id
          manifestId
        }
      }
      ... on InstallAddonError {
        message
      }
    }
  }
`);

export const UNINSTALL_ADDON_MUTATION = graphql(`
  mutation UninstallAddon($profileId: ID!, $manifestId: String!) {
    # ✅ CORRECTION: Changed profile_id -> profileId and manifest_id -> manifestId
    uninstallAddon(input: { profileId: $profileId, manifestId: $manifestId }) {
      ... on UninstallAddonSuccess {
        success
      }
      ... on UninstallAddonError {
        message
      }
    }
  }
`);