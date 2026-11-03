/**
 * @file UpdateActorModal.tsx
 * @description Dedicated update modal dialog for editing actor information.
 * Features identical UI/UX to CreateActorModal, pre-populating existing data,
 * handling avatar re-rolls silently without toast alerts, and validating updates via ActorAdminService.
 */

import React from 'react';
import CreateActorModal from './CreateActorModal';
import { ActorEntity } from '@/features/admin/actors/types/actor.types';

export interface UpdateActorModalProps {
  isOpen: boolean;
  onClose: () => void;
  actor: ActorEntity | null;
  onSuccess?: (updated: ActorEntity) => void;
}

export default function UpdateActorModal({
  isOpen,
  onClose,
  actor,
  onSuccess,
}: UpdateActorModalProps) {
  return (
    <CreateActorModal
      isOpen={isOpen}
      onClose={onClose}
      initialData={actor}
      mode="update"
      onSuccess={onSuccess}
    />
  );
}
