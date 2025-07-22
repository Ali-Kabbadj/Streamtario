export interface ExtraOption {
  name: string;
  isRequired?: boolean;
  options?: string[];
  optionsLimit?: number;
}

export interface Catalog {
  id: string;
  type: string;
  name: string;
  extra?: ExtraOption[];
}

export interface Resource {
  name: string;
  types: string[];
  idPrefixes?: string[];
}

export interface AddonManifest {
  id: string;
  version: string;
  name: string;
  description: string;
  resources: (string | Resource)[];
  types: string[];

  logo?: string;
  background?: string;
  catalogs: Catalog[];
  idPrefixes?: string[];
}