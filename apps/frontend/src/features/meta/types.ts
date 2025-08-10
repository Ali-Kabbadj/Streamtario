export interface FilmographyItem {
    title: string;
    year: string | null;
    role: string;
    type: string;
}

export interface ExternalLink {
    site: string;
    url: string | null;
}

export interface PersonDetails {
    name: string;
    birthName: string | null;
    summary: string | null;
    biography: string | null;
    birthDate: string | null;
    birthPlace: string | null;
    deathDate: string | null;
    deathLocation: string | null;
    imageUrl: string | null;
    professions: string[];
    filmography: FilmographyItem[];
    externalLinks: ExternalLink[];
}