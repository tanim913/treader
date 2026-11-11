// Bookcloth colours. Each book picks one; it appears only at the edges
// (the board, the chapter headband, the ribbon), never in the reading column.
export type ClothId =
  | "oxblood" | "bottle" | "indigo" | "ochre"
  | "slate" | "rust" | "plum" | "teal";

export type Cloth = {
  id: ClothId;
  name: string;
  cloth: string;      // the board colour
  stamp: "gilt" | "blind";
};

export const CLOTHS: Record<ClothId, Cloth> = {
  oxblood: { id: "oxblood", name: "Oxblood", cloth: "#6B1E26", stamp: "gilt" },
  bottle:  { id: "bottle",  name: "Bottle green", cloth: "#1E4636", stamp: "gilt" },
  indigo:  { id: "indigo",  name: "Indigo", cloth: "#26305A", stamp: "gilt" },
  ochre:   { id: "ochre",   name: "Ochre", cloth: "#A8741E", stamp: "blind" },
  slate:   { id: "slate",   name: "Slate", cloth: "#3D4A55", stamp: "gilt" },
  rust:    { id: "rust",    name: "Rust", cloth: "#8F3B1E", stamp: "gilt" },
  plum:    { id: "plum",    name: "Plum", cloth: "#4E2A47", stamp: "gilt" },
  teal:    { id: "teal",    name: "Teal", cloth: "#1F5257", stamp: "gilt" },
};

export const clothOf = (id: string | null | undefined): Cloth =>
  CLOTHS[(id as ClothId) ?? "oxblood"] ?? CLOTHS.oxblood;
