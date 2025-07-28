import { useAuth } from "@/providers/auth-provider";
import { useProfileContext } from "@/providers/profile-provider";
import { ProfileFeature } from "@/features/profile";
import { AuthFeature } from "@/features/auth";
import { ProfileSelectionFeature } from "@/features/profile-selection";

export default function HomePage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { selectedProfile } = useProfileContext();

  if (isAuthenticated && user) {
    if (selectedProfile) {
      return (
        <main className="bg-background text-foreground min-h-screen">
          <ProfileFeature profileId={selectedProfile.id} />
        </main>
      );
    }
    return <ProfileSelectionFeature />;
  }

  return <AuthFeature />;
}
