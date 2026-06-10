import type { Preset } from "../../types/state";
import { DetailText, SheetTitle } from "../typography";
import { Button } from "../Button";
import { Badge } from "../Badge";

interface ShopCardProps {
  preset: Preset;
  onLoad: () => void;
}

export function ShopCard({ preset, onLoad }: ShopCardProps) {
  const swatches = preset.swatches ? preset.swatches : (preset.config.colors ?? []).map((c) => c.value.replace(/^#/, ""));

  function handleClick() {
    onLoad();
  }

  return (
    <div className="bg-bg-panel rounded-md border border-border-base flex flex-col gap-2 p-1">
      {/* Swatch strip */}
      {swatches.length > 0 && (
        <div className="flex gap-0.5 h-12 rounded-md overflow-hidden">
          {swatches.map((hex, i) => (
            <div key={i} className="flex-1" style={{ background: `#${hex.replace(/^#/, "")}` }} title={(preset.config.colors ?? [])[i]?.name} />
          ))}
        </div>
      )}
      <div className="px-2 flex flex-col gap-2 h-full">
        <SheetTitle children={preset.name}></SheetTitle>
        <div className="flex items-start justify-between gap-4">
          {preset.tags && preset.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              <Badge key="colors" variant="accent" size="sm" className="px-1.5" pill>
                <span>{preset.config.colors?.length ?? "0"} colors</span>
              </Badge>
              <Badge key="roles" variant="accent" size="sm" className="px-1.5" pill>
                <span>{preset.config.roles?.length ?? "0"} roles</span>
              </Badge>
              <Badge key="themes" variant="accent" size="sm" className="px-1.5" pill>
                <span>{preset.config.themes?.length ?? "0"} themes</span>
              </Badge>
              {/* Tags */}
              {preset.tags.map((tag) => (
                <Badge key={tag} variant="outline" size="sm" className="px-1.5">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <DetailText children={preset.description ?? "No Description Avaiable"} className="mb-auto"></DetailText>
        <Button variant="primary" size="md" onClick={handleClick} label="Use this preset" className="mb-2" />
      </div>
    </div>
  );
}
