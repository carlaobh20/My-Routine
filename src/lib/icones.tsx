"use client";

import {
  BookOpen, Briefcase, Dumbbell, Brain, Utensils, Code, Phone, ShoppingCart,
  Footprints, Target, Coffee, Pencil, Heart, Bed, Palette, Music, Circle,
} from "lucide-react";

export const ICONES: { k: string; C: typeof Circle }[] = [
  { k: "book", C: BookOpen }, { k: "work", C: Briefcase }, { k: "gym", C: Dumbbell },
  { k: "mind", C: Brain }, { k: "meal", C: Utensils }, { k: "code", C: Code },
  { k: "call", C: Phone }, { k: "shop", C: ShoppingCart }, { k: "walk", C: Footprints },
  { k: "target", C: Target }, { k: "coffee", C: Coffee }, { k: "note", C: Pencil },
  { k: "heart", C: Heart }, { k: "sleep", C: Bed }, { k: "art", C: Palette }, { k: "music", C: Music },
];

export function IconeAtividade({ nome, cor = "#64748b", size = 20 }: { nome?: string | null; cor?: string; size?: number }) {
  const f = ICONES.find((i) => i.k === nome);
  const C = f ? f.C : Circle;
  return <C size={size} color={cor} strokeWidth={2} />;
}

// selo colorido (badge) com o ícone dentro
export function SeloAtividade({ nome, cor = "#64748b", size = 44 }: { nome?: string | null; cor?: string; size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-xl"
      style={{ width: size, height: size, backgroundColor: cor + "1a" }}>
      <IconeAtividade nome={nome} cor={cor} size={Math.round(size * 0.5)} />
    </span>
  );
}
