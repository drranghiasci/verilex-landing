import type { ComponentType } from 'react';
import { getSectionTitle, intakeSections } from '../../../../../lib/intake/validation';
import type { StepProps } from './SectionStep';
import { SectionStep } from './SectionStep';
import EvidenceDocumentsStep from './EvidenceDocumentsStep';

export type IntakeStep = {
  id: string;
  title: string;
  Component: ComponentType<Omit<StepProps, 'sectionId'>>;
};

const buildSectionStep = (sectionId: string) =>
  function SchemaSectionStep(props: Omit<StepProps, 'sectionId'>) {
    return <SectionStep sectionId={sectionId} {...props} />;
  };

export const intakeSteps: IntakeStep[] = intakeSections.map((section) => ({
  id: section.id,
  title: getSectionTitle(section.id),
  Component: section.id === 'evidence_documents' ? EvidenceDocumentsStep : buildSectionStep(section.id),
}));
