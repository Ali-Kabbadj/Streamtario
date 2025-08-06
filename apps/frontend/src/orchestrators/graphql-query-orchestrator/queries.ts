import { graphql } from './gen/gql';

export const GetContinueWatchingDocument = graphql(`
  query GetContinueWatching($profileId: ID!) {
    profile(id: $profileId) {
      continueWatching {
        id
        contentId
        itemType
        positionSeconds
        durationSeconds
        watchedAt
        lastStreamDetails
        meta {
          id
          name
          type
          poster
          background
        }
      }
    }
  }
`);

export const GetMetaDetailsDocument = graphql(`
  query GetMetaDetails($profileId: ID!, $itemType: String!, $itemId: String!) {
    profile(id: $profileId) {
      meta(itemType: $itemType, itemId: $itemId) {
        id
        name
        type
        poster
        background
        logo
        description
        releaseInfo
        released
        imdbId
        genres
        videos {
          id
          title
          released
          thumbnail
          season
          episode
          logo
        }
        country
        director
        imdbRating
        slug
        writer
        year
        runtime
        trailers {
          source
          type
        }
        trailerStreams {
          title
          ytId
        }
        links {
          name
          category
          url
        }
        behaviorHints {
          defaultVideoId
          hasScheduledVideos
        }
        appExtras {
          cast {
            name
            character
            photo
          }
        }
      }
    }
  }
`);

export const GetStreamsDocument = graphql(`
  query GetStreams($profileId: ID!, $itemType: String!, $itemId: String!) {
    profile(id: $profileId) {
      streams(itemType: $itemType, itemId: $itemId) {
        name
        title
        url
        infoHash
        fileIdx
        behaviorHints
        addonName
        announce
      }
    }
  }
`);

export const GetPlaybackHistoryDocument = graphql(`
  query GetPlaybackHistory($profileId: ID!, $contentIds: [String!]!) {
    playbackHistory(profileId: $profileId, contentIds: $contentIds) {
      id
      contentId
      itemType
      positionSeconds
      durationSeconds
      lastStreamDetails
    }
  }
`);

export const UpdatePlaybackHistoryDocument = graphql(`
  mutation UpdatePlaybackHistory($input: UpdatePlaybackHistoryInput!) {
    updatePlaybackHistory(input: $input) {
      id
    }
  }
`);



export const ManifestByUrlDocument = graphql(`
  query ManifestByUrl($url: String!) {
    manifestByUrl(url: $url) {
      id
      name
      description
      version
      logo
      types
    }
  }
`);

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
        isPrivate
      }
    }
  }
`);

export const DiscoverableCatalogsDocument = graphql(`
  query DiscoverableCatalogs($profileId: ID!) {
    profile(id: $profileId) {
      discoverableCatalogs {
        addonName
        manifestId
        catalogId
        catalogName
        catalogType
        extraProps {
          name
          isRequired
          options
        }
      }
    }
  }
`);

export const CatalogDocument = graphql(`
  query Catalog(
    $profileId: ID!
    $itemType: String!
    $catalogId: String!
    $manifestId: String
    $extraProps: JSON
  ) {
    profile(id: $profileId) {
      catalog(
        itemType: $itemType
        catalogId: $catalogId
        manifestId: $manifestId
        extraProps: $extraProps
      ) {
        items {
          id
          name
          type
          poster
        }
      }
    }
  }
`);

export const HomeCatalogsDocument = graphql(`
  query HomeCatalogs($profileId: ID!) {
    profile(id: $profileId) {
      homeCatalogs {
        addonName
        content {
          title
          items {
            id
            name
            type
            poster
          }
        }
      }
    }
  }
`);

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

export const SearchDocument = graphql(`
  subscription Search($profileId: String!, $query: String!) {
    search(profileId: $profileId, query: $query) {
      addonName
      resultsByType
      error
    }
  }
`);