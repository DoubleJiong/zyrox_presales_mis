"use client";

import { cn } from "@/lib/utils";
import { Check, Circle } from "lucide-react";
import { PROJECT_STAGE_CONFIG, PROJECT_STAGE_ORDER } from "@/lib/utils/status-transitions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const PROJECT_STAGES = PROJECT_STAGE_ORDER.map((key) => ({
  key,
  label: PROJECT_STAGE_CONFIG[key].label,
  shortLabel: PROJECT_STAGE_CONFIG[key].shortLabel,
  description: PROJECT_STAGE_CONFIG[key].description,
}));

export type ProjectStageKey = typeof PROJECT_STAGES[number]["key"];

interface ProjectStageProgressProps {
  currentStage: ProjectStageKey | string;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
  className?: string;
}

export function ProjectStageProgress({
  currentStage,
  size = "md",
  showLabels = true,
  className,
}: ProjectStageProgressProps) {
  const currentIndex = PROJECT_STAGES.findIndex((s) => s.key === currentStage);
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / PROJECT_STAGES.length) * 100 : 0;

  const sizeConfig = {
    sm: {
      circle: "w-6 h-6 text-xs",
      icon: "w-3 h-3",
      gap: "gap-1",
      text: "text-xs",
    },
    md: {
      circle: "w-8 h-8 text-sm",
      icon: "w-4 h-4",
      gap: "gap-2",
      text: "text-sm",
    },
    lg: {
      circle: "w-10 h-10 text-base",
      icon: "w-5 w-5",
      gap: "gap-3",
      text: "text-base",
    },
  };

  const config = sizeConfig[size];

  const getStageStatus = (index: number) => {
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "current";
    return "pending";
  };

  const getStageColors = (status: string) => {
    switch (status) {
      case "completed":
        return {
          circle: "bg-primary text-primary-foreground border-primary",
          label: "text-foreground font-medium",
        };
      case "current":
        return {
          circle: "bg-primary text-primary-foreground border-primary ring-2 ring-primary/20 ring-offset-2",
          label: "text-foreground font-semibold",
        };
      default:
        return {
          circle: "bg-muted text-muted-foreground border-border",
          label: "text-muted-foreground",
        };
    }
  };

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      {/* 进度条 */}
      <div className="relative mb-4 min-w-[720px]">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 阶段节点 - 纯展示，不可点击 */}
      <div className={cn("flex items-start justify-between min-w-[720px]", config.gap)}>
        {PROJECT_STAGES.map((stage, index) => {
          const status = getStageStatus(index);
          const colors = getStageColors(status);
          const isLast = index === PROJECT_STAGES.length - 1;

          return (
            <div
              key={stage.key}
              className={cn(
                "flex flex-col items-center",
                !isLast && "flex-1"
              )}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "relative flex items-center justify-center rounded-full border-2 transition-all duration-200 cursor-default",
                        config.circle,
                        colors.circle
                      )}
                    >
                      {status === "completed" ? (
                        <Check className={config.icon} />
                      ) : (
                        <Circle className={cn(config.icon, status === "current" ? "fill-current" : "")} />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-medium">{stage.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
                    {status === "current" && (
                      <p className="text-xs text-primary mt-1">当前阶段</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {showLabels && (
                <span className={cn("mt-2 text-center", config.text, colors.label)}>
                  {size === "sm" ? stage.shortLabel : stage.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 简化版阶段标签
interface ProjectStageBadgeProps {
  stage: ProjectStageKey | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ProjectStageBadge({ stage, size = "md", className }: ProjectStageBadgeProps) {
  const stageInfo = PROJECT_STAGES.find((s) => s.key === stage);
  
  const sizeConfig = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const getStageColor = (stageKey: string) => {
    const colorMap: Record<string, string> = {
      opportunity: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
      bidding_pending: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
      bidding: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
      solution_review: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
      contract_pending: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800",
      delivery_preparing: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
      delivering: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
      settlement: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
      archived: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-800",
      cancelled: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800",
    };
    return colorMap[stageKey] || "bg-muted text-muted-foreground border-border";
  };

  if (!stageInfo) {
    return (
      <span className={cn("inline-flex items-center rounded-full border font-medium", sizeConfig[size], className)}>
        未知阶段
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center rounded-full border font-medium", getStageColor(stage), sizeConfig[size], className)}>
      {stageInfo.label}
    </span>
  );
}
