// --- AFTER (The Correct Implementation) ---
import { PlayerOverlay } from "@/features/player/components/PlayerOverlay";
import { useEffect } from "react";

function PlayerPage() {
  useEffect(() => {
    document.body.style.backgroundColor = "transparent";
  }, []);

  return <PlayerOverlay />;
}
export default PlayerPage;

export async function getStaticProps() {
  return {
    props: {
      isPlayer: true,
    },
  };
}
