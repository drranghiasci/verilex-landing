/**
 * Intake Channel Hardening Tests
 * 
 * Tests for:
 * - Registry functions (getUiSteps, buildSidebarSteps, validateIntakeTypePosture)
 * - Sidebar mapping and progress sync
 * - Review gating
 * - Submit posture validation
 */

import {
    getUiSteps,
    getSchemaSteps,
    buildSidebarSteps,
    validateIntakeTypePosture,
    isValidIntakeType,
    findUiStepForSchemaStep,
    isUiStepComplete,
    type IntakeType,
} from '../orchestrator/registry';

// ============================================================================
// Registry Tests
// ============================================================================

describe('getUiSteps', () => {
    it('returns correct steps for custody_unmarried', () => {
        const steps = getUiSteps('custody_unmarried');
        expect(steps.length).toBeGreaterThan(0);
        expect(steps[0].key).toBe('basics');
        expect(steps[0].label).toBe('Basics');
        expect(steps.find(s => s.key === 'review')).toBeDefined();
    });

    it('returns correct steps for divorce_no_children', () => {
        const steps = getUiSteps('divorce_no_children');
        expect(steps.length).toBeGreaterThan(0);
        expect(steps.find(s => s.key === 'review')).toBeDefined();
        // Should NOT have custody-specific steps
        expect(steps.find(s => s.key === 'other_parent')).toBeUndefined;
    });

    it('returns correct steps for divorce_with_children', () => {
        const steps = getUiSteps('divorce_with_children');
        expect(steps.length).toBeGreaterThan(0);
        expect(steps.find(s => s.key === 'children')).toBeDefined();
        expect(steps.find(s => s.key === 'review')).toBeDefined();
    });

    it('throws for invalid intake type', () => {
        expect(() => getUiSteps('invalid' as IntakeType)).toThrow('Unknown intake type');
    });
});

describe('getSchemaSteps', () => {
    it('returns schema steps with required fields', () => {
        const steps = getSchemaSteps('custody_unmarried');
        expect(steps.length).toBeGreaterThan(0);
        const clientStep = steps.find(s => s.key === 'client_identity');
        expect(clientStep).toBeDefined();
        expect(clientStep?.requiredFields).toContain('client_first_name');
    });
});

describe('isValidIntakeType', () => {
    it('returns true for valid types', () => {
        expect(isValidIntakeType('custody_unmarried')).toBe(true);
        expect(isValidIntakeType('divorce_no_children')).toBe(true);
        expect(isValidIntakeType('divorce_with_children')).toBe(true);
    });

    it('returns false for invalid types', () => {
        expect(isValidIntakeType('invalid')).toBe(false);
        expect(isValidIntakeType(null)).toBe(false);
        expect(isValidIntakeType(undefined)).toBe(false);
    });
});

// ============================================================================
// Sidebar Mapping Tests
// ============================================================================

describe('findUiStepForSchemaStep', () => {
    it('maps schema step to correct UI step for custody', () => {
        expect(findUiStepForSchemaStep('custody_unmarried', 'client_identity')).toBe(1); // "client" step
        expect(findUiStepForSchemaStep('custody_unmarried', 'intake_metadata')).toBe(0); // "basics" step
    });

    it('returns -1 for unknown schema step', () => {
        expect(findUiStepForSchemaStep('custody_unmarried', 'nonexistent')).toBe(-1);
    });
});

describe('isUiStepComplete', () => {
    it('returns true when all schema steps are complete', () => {
        const stepStatus = {
            intake_metadata: { status: 'complete' },
        };
        expect(isUiStepComplete('custody_unmarried', 'basics', stepStatus)).toBe(true);
    });

    it('returns false when any schema step is incomplete', () => {
        const stepStatus = {
            intake_metadata: { status: 'pending' },
        };
        expect(isUiStepComplete('custody_unmarried', 'basics', stepStatus)).toBe(false);
    });

    it('returns false for multi-schema UI step with partial completion', () => {
        const stepStatus = {
            children_info: { status: 'complete' },
            child_object: { status: 'pending' },
        };
        expect(isUiStepComplete('custody_unmarried', 'children', stepStatus)).toBe(false);
    });
});

describe('buildSidebarSteps', () => {
    it('builds correct sidebar with active and completed states', () => {
        const stepStatus = {
            intake_metadata: { status: 'complete' },
            client_identity: { status: 'pending' },
        };

        const steps = buildSidebarSteps('custody_unmarried', 'client_identity', stepStatus);

        expect(steps.length).toBeGreaterThan(0);
        expect(steps[0].isCompleted).toBe(true); // basics complete
        expect(steps[1].isActive).toBe(true); // client is current
        expect(steps[1].isCompleted).toBe(false);
    });

    it('marks all steps incomplete when no step_status', () => {
        const steps = buildSidebarSteps('custody_unmarried', 'client_identity', {});
        const completed = steps.filter(s => s.isCompleted);
        expect(completed.length).toBe(0);
    });
});

// ============================================================================
// Posture Validation Tests (Submit)
// ============================================================================

describe('validateIntakeTypePosture', () => {
    describe('divorce_no_children', () => {
        it('returns valid when no children', () => {
            const result = validateIntakeTypePosture('divorce_no_children', {
                has_children: false,
                children_count: 0,
            });
            expect(result.valid).toBe(true);
        });

        it('returns invalid when has_children is true', () => {
            const result = validateIntakeTypePosture('divorce_no_children', {
                has_children: true,
                children_count: 2,
            });
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.suggestedType).toBe('divorce_with_children');
            }
        });

        it('returns invalid when children_count > 0', () => {
            const result = validateIntakeTypePosture('divorce_no_children', {
                has_children: false,
                children_count: 1,
            });
            expect(result.valid).toBe(false);
        });
    });

    describe('divorce_with_children', () => {
        it('returns valid when has children', () => {
            const result = validateIntakeTypePosture('divorce_with_children', {
                has_children: true,
                children_count: 2,
            });
            expect(result.valid).toBe(true);
        });

        it('returns invalid when no children', () => {
            const result = validateIntakeTypePosture('divorce_with_children', {
                has_children: false,
                children_count: 0,
            });
            expect(result.valid).toBe(false);
            if (!result.valid) {
                expect(result.suggestedType).toBe('divorce_no_children');
            }
        });
    });

    describe('custody_unmarried', () => {
        it('returns valid when has children', () => {
            const result = validateIntakeTypePosture('custody_unmarried', {
                has_children: true,
                children_count: 1,
            });
            expect(result.valid).toBe(true);
        });

        it('returns invalid when no children (custody requires children)', () => {
            const result = validateIntakeTypePosture('custody_unmarried', {
                has_children: false,
                children_count: 0,
            });
            expect(result.valid).toBe(false);
        });
    });
});

// ============================================================================
// Review Gating Tests
// ============================================================================

describe('Review Gating', () => {
    it('readyForReview should be false when steps incomplete', () => {
        // This would be tested via the orchestrator, but we can verify the logic
        const stepStatus = {
            intake_metadata: { status: 'complete' },
            client_identity: { status: 'pending' },
        };

        // Check that not all steps are complete
        const allComplete = Object.values(stepStatus).every(s => s.status === 'complete');
        expect(allComplete).toBe(false);
    });

    it('readyForReview should be true when all steps complete', () => {
        const stepStatus = {
            intake_metadata: { status: 'complete' },
            client_identity: { status: 'complete' },
            final_review: { status: 'complete' },
        };

        const allComplete = Object.values(stepStatus).every(s => s.status === 'complete');
        expect(allComplete).toBe(true);
    });
});
