// --- AFTER (The Correct Implementation) ---
import { PlayerOverlay } from "@/features/player/components/PlayerOverlay";
import { useEffect } from "react";

// This is the component for our dedicated player page.
function PlayerPage() {
  // Set a transparent background for this specific page
  useEffect(() => {
    document.body.style.backgroundColor = "transparent";
  }, []);

  // --- FIX: RENDER THE PLAYER OVERLAY ---
  // The PlayerOverlay component contains the logic to show controls,
  // the loading spinner, or an error message based on the player's status.
  return <PlayerOverlay />;
}

// The main export and getStaticProps remain the same.
export default PlayerPage;

export async function getStaticProps() {
  return {
    props: {
      isPlayer: true,
    },
  };
}
