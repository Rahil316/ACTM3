import type { ProjectStore } from "../../types/state";
import { SourceColorCard } from "../../components/preview";

// ── Source collection panel ───────────────────────────────────────────────────

export function SourcePanel({ projectStore }: { projectStore: ProjectStore }) {
  const showAlphas = (projectStore.alphaValues?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-5 p-3 pb-6">
      {projectStore.colors.map((color) => (
        <SourceColorCard key={color._id} color={color} alphaValues={projectStore.alphaValues ?? []} showAlphas={showAlphas} />
      ))}
    </div>
  );
}
