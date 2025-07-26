// src/pages/index.tsx
import { ProfileFeature } from "@/features/profile";

export default function HomePage() {
  return (
    <main className="bg-background text-foreground min-h-screen">
      <ProfileFeature />
    </main>
  );
}
