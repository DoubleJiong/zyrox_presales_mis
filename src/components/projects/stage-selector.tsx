'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProjectStatus, ProjectStage } from '@/lib/utils/status-transitions';
import { getStageOptions } from '@/lib/utils/stage-transitions';
import { getStageBgColor } from '@/lib/utils/project-colors';
import { StageChangeDialog } from './stage-change-dialog';
import { cn } from '@/lib/utils';

interface StageSelectorProps {
  projectId: number;
  currentStage: ProjectStage;
  currentStatus: ProjectStatus;
  disabled?: boolean;
  onStageChange?: (newStage: ProjectStage) => void;
}

export function StageSelector({
  projectId,
  currentStage,
  currentStatus,
  disabled = false,
  onStageChange,
}: StageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<ProjectStage | null>(null);
  const stageOptions = getStageOptions(currentStage, currentStatus);

  const handleSelect = (value: string) => {
    const stage = value as ProjectStage;
    if (stage === currentStage) return;
    
    setSelectedStage(stage);
    setIsOpen(true);
  };

  const handleDialogSuccess = () => {
    if (selectedStage && onStageChange) {
      onStageChange(selectedStage);
    }
    setIsOpen(false);
    setSelectedStage(null);
  };

  const handleDialogClose = () => {
    setIsOpen(false);
    setSelectedStage(null);
  };

  return (
    <div className="flex items-center gap-1">
      <Select
        value={currentStage}
        onValueChange={handleSelect}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            'h-8 w-auto min-w-[100px] px-3 border-0 font-medium cursor-pointer',
            getStageBgColor(currentStage)
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {stageOptions.map((option) => {
            return (
              <SelectItem
                key={option.stage}
                value={option.stage}
                disabled={option.disabled}
                className={option.disabled ? 'opacity-50' : ''}
              >
                <div className="flex items-center gap-2">
                  <span>{option.label}</span>
                  {option.disabled && option.reason && (
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({option.reason})
                    </span>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {selectedStage && (
        <StageChangeDialog
          open={isOpen}
          onOpenChange={setIsOpen}
          projectId={projectId}
          oldStage={currentStage}
          newStage={selectedStage}
          currentStatus={currentStatus}
          onSuccess={handleDialogSuccess}
          onClose={handleDialogClose}
        />
      )}
    </div>
  );
}
